import { create } from 'zustand'
import { db } from './db'
import { DEFAULT_SETTINGS } from '../domain/presets'
import { logEvent } from '../domain/harness/events'
import { evidenceConfidence, statsFor } from '../domain/outcome'
import { weekStart } from '../domain/week'
import { SPIN_LABEL, migrateLegacySpin } from '../domain/spin'
import { newId } from '../domain/tree'
import { newReport, sanitizeFocus, sanitizeLog, sanitizeOutcome, sanitizeSettings, sanitizeTactic, sanitizeTask } from '../domain/validate'
import type { Focus, PracticeItem, PracticeLog, Settings, ShotNode, Tactic, TacticOutcome, Task } from '../domain/types'

export type View =
  | { name: 'home' }
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'tasks' }
  | { name: 'practice' }
  | { name: 'settings' }

export interface ExportFile {
  app: 'tt-tactics'
  version: 1 | 2 | 3
  exportedAt: string
  settings: Settings
  tactics: Tactic[]
  tasks?: Task[]
  logs?: PracticeLog[]
  outcomes?: TacticOutcome[]
  focuses?: Focus[]
}

interface State {
  loaded: boolean
  tactics: Tactic[]
  tasks: Task[]
  logs: PracticeLog[]
  outcomes: TacticOutcome[]
  focuses: Focus[]
  settings: Settings
  view: View
  navigate: (v: View) => void
  load: () => Promise<void>
  addFocus: (data: Pick<Focus, 'title'> & Partial<Focus>) => Promise<void>
  toggleFocus: (id: string) => Promise<void>
  deleteFocus: (id: string) => Promise<void>
  addTactic: (data: Pick<Tactic, 'title' | 'situation' | 'oppHand'> & Partial<Tactic>) => Promise<Tactic>
  updateTactic: (id: string, patch: Partial<Tactic>) => Promise<void>
  deleteTactic: (id: string) => Promise<void>
  addOutcome: (data: Pick<TacticOutcome, 'tacticId' | 'result'> & Partial<TacticOutcome>) => Promise<void>
  deleteOutcome: (id: string) => Promise<void>
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
  outcomes: [],
  focuses: [],
  settings: DEFAULT_SETTINGS,
  view: { name: 'home' },

  navigate: (view) => set({ view }),

  load: async () => {
    // インデックス欠落のレコードを取りこぼさないよう、順序付けせず全件取得してから JS で並べる
    const [rawTactics, row, rawTasks, rawLogs, rawOutcomes, rawFocuses] = await Promise.all([
      db.tactics.toArray(),
      db.settings.get('main'),
      db.tasks.toArray(),
      db.logs.toArray(),
      db.outcomes.toArray(),
      db.focuses.toArray(),
    ])
    // 境界検証: 壊れた/古い形のレコードを描画で落ちない形に整える
    const rep = newReport()
    const tactics = rawTactics
      .map((t) => sanitizeTactic(t, rep))
      .filter((t): t is Tactic => t !== null)
      .map(migrateTactic)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    const tasks = rawTasks
      .map((t) => sanitizeTask(t, rep))
      .filter((t): t is Task => t !== null)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    const logs = rawLogs
      .map((l) => sanitizeLog(l, rep))
      .filter((l): l is PracticeLog => l !== null)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    const outcomes = rawOutcomes
      .map((o) => sanitizeOutcome(o, rep))
      .filter((o): o is TacticOutcome => o !== null)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    const focuses = rawFocuses.map((f) => sanitizeFocus(f, rep)).filter((f): f is Focus => f !== null)
    if (rep.dropped > 0 || rep.repaired > 0) {
      logEvent('warn', 'data', `読み込み時にデータを整えました（修復 ${rep.repaired} 件 / 破棄 ${rep.dropped} 件）`)
    }
    // 整形・移行で変わったものを書き戻す（欠けていた index を補完し、次回から正しく並ぶ）
    const rawById = new Map(rawTactics.map((t) => [t.id, t]))
    await Promise.all(tactics.filter((t) => t !== rawById.get(t.id)).map((t) => db.tactics.put(t)))
    set({
      tactics,
      tasks,
      logs,
      outcomes,
      focuses,
      settings: sanitizeSettings(row?.value),
      loaded: true,
    })
  },

  addFocus: async (data) => {
    const f: Focus = { id: newId(), week: weekStart(), done: false, createdAt: now(), ...data }
    await db.focuses.put(f)
    set({ focuses: [...get().focuses, f] })
  },
  toggleFocus: async (id) => {
    const cur = get().focuses.find((f) => f.id === id)
    if (!cur) return
    const next = { ...cur, done: !cur.done }
    set({ focuses: get().focuses.map((f) => (f.id === id ? next : f)) })
    await db.focuses.put(next)
  },
  deleteFocus: async (id) => {
    await db.focuses.delete(id)
    set({ focuses: get().focuses.filter((f) => f.id !== id) })
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
    await db.outcomes.where('tacticId').equals(id).delete()
    set({
      tactics: get().tactics.filter((t) => t.id !== id),
      tasks: get().tasks.map((t) => updated.find((u) => u.id === t.id) ?? t),
      outcomes: get().outcomes.filter((o) => o.tacticId !== id),
    })
  },

  // ---- 試合結果（上達ループを閉じる） ----
  addOutcome: async (data) => {
    const o: TacticOutcome = {
      id: newId(),
      date: today(),
      createdAt: now(),
      ...data,
    }
    await db.outcomes.put(o)
    const outcomes = [o, ...get().outcomes]
    set({ outcomes })
    // 実績が十分たまったら自信度を証拠ベースで自動更新
    const ev = evidenceConfidence(statsFor(o.tacticId, outcomes))
    const t = get().tactics.find((x) => x.id === o.tacticId)
    if (t && ev !== null && ev !== t.confidence) {
      await get().updateTactic(o.tacticId, { confidence: ev })
      logEvent('info', 'app', `実績から自信度を更新: 「${t.title}」→ ${['練習中', '実戦で使える', '得意'][ev - 1]}`)
    }
  },

  deleteOutcome: async (id) => {
    const o = get().outcomes.find((x) => x.id === id)
    await db.outcomes.delete(id)
    const outcomes = get().outcomes.filter((x) => x.id !== id)
    set({ outcomes })
    if (o) {
      const ev = evidenceConfidence(statsFor(o.tacticId, outcomes))
      const t = get().tactics.find((x) => x.id === o.tacticId)
      if (t && ev !== null && ev !== t.confidence) await get().updateTactic(o.tacticId, { confidence: ev })
    }
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
      version: 3,
      exportedAt: now(),
      settings,
      tactics: get().tactics,
      tasks: get().tasks,
      logs: get().logs,
      outcomes: get().outcomes,
      focuses: get().focuses,
    }
  },

  importData: async (file, mode) => {
    if (!file || (file as { app?: string }).app !== 'tt-tactics' || !Array.isArray(file.tactics)) {
      throw new Error('tt-tactics のエクスポートファイルではありません')
    }
    // 境界検証: インポートも整えてから保存する（外部ファイルは信用しない）
    const rep = newReport()
    const tactics = file.tactics.map((t) => sanitizeTactic(t, rep)).filter((t): t is Tactic => t !== null)
    const tasks = (file.tasks ?? []).map((t) => sanitizeTask(t, rep)).filter((t): t is Task => t !== null)
    const logs = (file.logs ?? []).map((l) => sanitizeLog(l, rep)).filter((l): l is PracticeLog => l !== null)
    const outcomes = (file.outcomes ?? []).map((o) => sanitizeOutcome(o, rep)).filter((o): o is TacticOutcome => o !== null)
    const focuses = (file.focuses ?? []).map((f) => sanitizeFocus(f, rep)).filter((f): f is Focus => f !== null)
    if (mode === 'replace') {
      await Promise.all([db.tactics.clear(), db.tasks.clear(), db.logs.clear(), db.outcomes.clear(), db.focuses.clear()])
    }
    await db.tactics.bulkPut(tactics)
    if (tasks.length) await db.tasks.bulkPut(tasks)
    if (logs.length) await db.logs.bulkPut(logs)
    if (outcomes.length) await db.outcomes.bulkPut(outcomes)
    if (focuses.length) await db.focuses.bulkPut(focuses)
    if (file.settings) {
      const keep = get().settings.geminiApiKey
      await db.settings.put({ key: 'main', value: { ...sanitizeSettings(file.settings), geminiApiKey: keep } })
    }
    logEvent('info', 'io', `インポート: 戦術 ${tactics.length} / 課題 ${tasks.length} / ログ ${logs.length} / 試合結果 ${outcomes.length}（${mode === 'replace' ? '置換' : '追加'}）${rep.dropped ? ` / 不正 ${rep.dropped} 件を除外` : ''}`)
    await get().load()
    return tactics.length
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
