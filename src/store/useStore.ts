import { create } from 'zustand'
import { db } from './db'
import { DEFAULT_SETTINGS } from '../domain/presets'
import { SPIN_LABEL, migrateLegacySpin } from '../domain/spin'
import { newId } from '../domain/tree'
import type { PracticeItem, PracticeLog, Settings, ShotNode, Tactic, Task } from '../domain/types'

export type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'tasks' }
  | { name: 'practice' }
  | { name: 'settings' }

export interface ExportFile {
  app: 'tt-tactics'
  version: 1 | 2
  exportedAt: string
  settings: Settings
  tactics: Tactic[]
  tasks?: Task[]
  logs?: PracticeLog[]
}

interface State {
  loaded: boolean
  tactics: Tactic[]
  tasks: Task[]
  logs: PracticeLog[]
  settings: Settings
  view: View
  navigate: (v: View) => void
  load: () => Promise<void>
  addTactic: (data: Pick<Tactic, 'title' | 'situation' | 'oppHand'> & Partial<Tactic>) => Promise<Tactic>
  updateTactic: (id: string, patch: Partial<Tactic>) => Promise<void>
  deleteTactic: (id: string) => Promise<void>
  addTask: (data: Pick<Task, 'title'> & Partial<Task>) => Promise<Task>
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  /** 日付のログを取得（なければ作成） */
  ensureLog: (date: string) => Promise<PracticeLog>
  updateLog: (id: string, patch: Partial<PracticeLog>) => Promise<void>
  setLogItem: (id: string, item: PracticeItem) => Promise<void>
  removeLogItem: (id: string, taskId: string) => Promise<void>
  deleteLog: (id: string) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  exportData: () => ExportFile
  importData: (file: ExportFile, mode: 'merge' | 'replace') => Promise<number>
}

const now = () => new Date().toISOString()

/** v0.1 形式（serveType / 旧 Spin）のノードを新形式に変換する。変更がなければ同じ参照を返す */
function migrateNode(n: ShotNode): ShotNode {
  const legacy = n as ShotNode & { serveType?: unknown }
  const oldSpin = n.spin as unknown
  const needs = legacy.serveType !== undefined || (typeof oldSpin === 'string' && !(oldSpin in SPIN_LABEL))
  const children = n.children.map(migrateNode)
  const childrenChanged = children.some((c, i) => c !== n.children[i])
  if (!needs && !childrenChanged) return n
  if (!needs) return { ...n, children }
  const conv = migrateLegacySpin(oldSpin, legacy.serveType)
  const { serveType: _drop, ...rest } = legacy
  void _drop
  return { ...rest, spin: conv.spin, serveMotion: conv.serveMotion ?? n.serveMotion, children }
}

function migrateTactic(t: Tactic): Tactic {
  if (!t.root) return t
  const root = migrateNode(t.root)
  return root === t.root ? t : { ...t, root }
}

export const useStore = create<State>((set, get) => ({
  loaded: false,
  tactics: [],
  tasks: [],
  logs: [],
  settings: DEFAULT_SETTINGS,
  view: { name: 'list' },

  navigate: (view) => set({ view }),

  load: async () => {
    const [tactics, row, tasks, logs] = await Promise.all([
      db.tactics.orderBy('updatedAt').reverse().toArray(),
      db.settings.get('main'),
      db.tasks.orderBy('createdAt').reverse().toArray(),
      db.logs.orderBy('date').reverse().toArray(),
    ])
    const migrated = tactics.map(migrateTactic)
    await Promise.all(migrated.filter((t, i) => t !== tactics[i]).map((t) => db.tactics.put(t)))
    set({
      tactics: migrated,
      tasks,
      logs,
      settings: { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) },
      loaded: true,
    })
  },

  // ---- 戦術 ----
  addTactic: async (data) => {
    const t: Tactic = {
      id: newId(),
      goal: '',
      tags: [],
      confidence: 1,
      root: null,
      taskIds: [],
      createdAt: now(),
      updatedAt: now(),
      ...data,
    }
    await db.tactics.put(t)
    set({ tactics: [t, ...get().tactics] })
    return t
  },

  updateTactic: async (id, patch) => {
    const cur = get().tactics.find((t) => t.id === id)
    if (!cur) return
    const next: Tactic = { ...cur, ...patch, updatedAt: now() }
    // 先に state を更新してから永続化する（連続入力で直後に root を参照するため）
    set({ tactics: [next, ...get().tactics.filter((t) => t.id !== id)] })
    await db.tactics.put(next)
  },

  deleteTactic: async (id) => {
    await db.tactics.delete(id)
    // 課題側の参照も外す
    const affected = get().tasks.filter((t) => t.tacticIds.includes(id))
    const updated = affected.map((t) => ({ ...t, tacticIds: t.tacticIds.filter((x) => x !== id) }))
    await db.tasks.bulkPut(updated)
    set({
      tactics: get().tactics.filter((t) => t.id !== id),
      tasks: get().tasks.map((t) => updated.find((u) => u.id === t.id) ?? t),
    })
  },

  // ---- 課題 ----
  addTask: async (data) => {
    const t: Task = {
      id: newId(),
      detail: '',
      purpose: '',
      tacticIds: [],
      status: 'open',
      source: 'manual',
      createdAt: now(),
      ...data,
    }
    await db.tasks.put(t)
    set({ tasks: [t, ...get().tasks] })
    return t
  },

  updateTask: async (id, patch) => {
    const cur = get().tasks.find((t) => t.id === id)
    if (!cur) return
    const next: Task = { ...cur, ...patch }
    if (patch.status === 'done' && cur.status !== 'done') next.doneAt = now()
    if (patch.status === 'open') next.doneAt = undefined
    set({ tasks: get().tasks.map((t) => (t.id === id ? next : t)) })
    await db.tasks.put(next)
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },

  // ---- 練習ログ ----
  ensureLog: async (date) => {
    const found = get().logs.find((l) => l.date === date)
    if (found) return found
    const l: PracticeLog = { id: newId(), date, items: [], note: '', createdAt: now(), updatedAt: now() }
    await db.logs.put(l)
    set({ logs: [l, ...get().logs].sort((a, b) => (a.date < b.date ? 1 : -1)) })
    return l
  },

  updateLog: async (id, patch) => {
    const cur = get().logs.find((l) => l.id === id)
    if (!cur) return
    const next: PracticeLog = { ...cur, ...patch, updatedAt: now() }
    set({ logs: get().logs.map((l) => (l.id === id ? next : l)) })
    await db.logs.put(next)
  },

  setLogItem: async (id, item) => {
    const cur = get().logs.find((l) => l.id === id)
    if (!cur) return
    const exists = cur.items.some((i) => i.taskId === item.taskId)
    const items = exists ? cur.items.map((i) => (i.taskId === item.taskId ? { ...i, ...item } : i)) : [...cur.items, item]
    await get().updateLog(id, { items })
  },

  removeLogItem: async (id, taskId) => {
    const cur = get().logs.find((l) => l.id === id)
    if (!cur) return
    await get().updateLog(id, { items: cur.items.filter((i) => i.taskId !== taskId) })
  },

  deleteLog: async (id) => {
    await db.logs.delete(id)
    set({ logs: get().logs.filter((l) => l.id !== id) })
  },

  // ---- 設定・データ ----
  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch }
    await db.settings.put({ key: 'main', value: next })
    set({ settings: next })
  },

  exportData: () => {
    const { geminiApiKey: _omit, ...settings } = get().settings
    void _omit
    return {
      app: 'tt-tactics',
      version: 2,
      exportedAt: now(),
      settings,
      tactics: get().tactics,
      tasks: get().tasks,
      logs: get().logs,
    }
  },

  importData: async (file, mode) => {
    if (file.app !== 'tt-tactics' || !Array.isArray(file.tactics)) {
      throw new Error('tt-tactics のエクスポートファイルではありません')
    }
    if (mode === 'replace') {
      await Promise.all([db.tactics.clear(), db.tasks.clear(), db.logs.clear()])
    }
    await db.tactics.bulkPut(file.tactics)
    if (file.tasks) await db.tasks.bulkPut(file.tasks)
    if (file.logs) await db.logs.bulkPut(file.logs)
    if (file.settings) {
      const keep = get().settings.geminiApiKey
      await db.settings.put({ key: 'main', value: { ...DEFAULT_SETTINGS, ...file.settings, geminiApiKey: keep } })
    }
    await get().load()
    return file.tactics.length
  },
}))

export function today(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}
