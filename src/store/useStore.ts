import { create } from 'zustand'
import { db } from './db'
import { DEFAULT_SETTINGS } from '../domain/presets'
import { SPIN_LABEL, migrateLegacySpin } from '../domain/spin'
import { newId } from '../domain/tree'
import type { Settings, ShotNode, Tactic } from '../domain/types'

export type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'settings' }

export interface ExportFile {
  app: 'tt-tactics'
  version: 1
  exportedAt: string
  settings: Settings
  tactics: Tactic[]
}

interface State {
  loaded: boolean
  tactics: Tactic[]
  settings: Settings
  view: View
  navigate: (v: View) => void
  load: () => Promise<void>
  addTactic: (
    data: Pick<Tactic, 'title' | 'situation' | 'oppHand'> & Partial<Tactic>,
  ) => Promise<Tactic>
  updateTactic: (id: string, patch: Partial<Tactic>) => Promise<void>
  deleteTactic: (id: string) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  exportData: () => ExportFile
  importData: (file: ExportFile, mode: 'merge' | 'replace') => Promise<number>
}

const now = () => new Date().toISOString()

/** v0.1 形式（serveType / 旧 Spin）のノードを新形式に変換する。変更がなければ同じ参照を返す */
function migrateNode(n: ShotNode): ShotNode {
  const legacy = n as ShotNode & { serveType?: unknown }
  const oldSpin = n.spin as unknown
  const needs =
    legacy.serveType !== undefined ||
    (typeof oldSpin === 'string' && !(oldSpin in SPIN_LABEL))
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
  settings: DEFAULT_SETTINGS,
  view: { name: 'list' },

  navigate: (view) => set({ view }),

  load: async () => {
    const [tactics, row] = await Promise.all([
      db.tactics.orderBy('updatedAt').reverse().toArray(),
      db.settings.get('main'),
    ])
    const migrated = tactics.map(migrateTactic)
    await Promise.all(
      migrated.filter((t, i) => t !== tactics[i]).map((t) => db.tactics.put(t)),
    )
    set({
      tactics: migrated,
      settings: { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) },
      loaded: true,
    })
  },

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
    set({
      tactics: [next, ...get().tactics.filter((t) => t.id !== id)],
    })
    await db.tactics.put(next)
  },

  deleteTactic: async (id) => {
    await db.tactics.delete(id)
    set({ tactics: get().tactics.filter((t) => t.id !== id) })
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch }
    await db.settings.put({ key: 'main', value: next })
    set({ settings: next })
  },

  exportData: () => ({
    app: 'tt-tactics',
    version: 1,
    exportedAt: now(),
    settings: get().settings,
    tactics: get().tactics,
  }),

  importData: async (file, mode) => {
    if (file.app !== 'tt-tactics' || !Array.isArray(file.tactics)) {
      throw new Error('tt-tactics のエクスポートファイルではありません')
    }
    if (mode === 'replace') await db.tactics.clear()
    await db.tactics.bulkPut(file.tactics)
    if (file.settings) {
      await db.settings.put({ key: 'main', value: { ...DEFAULT_SETTINGS, ...file.settings } })
    }
    await get().load()
    return file.tactics.length
  },
}))
