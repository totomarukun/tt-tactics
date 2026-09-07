import Dexie, { type Table } from 'dexie'
import type { Settings, Tactic } from '../domain/types'

interface SettingsRow {
  key: string
  value: Settings
}

export const db = new Dexie('tt-tactics') as Dexie & {
  tactics: Table<Tactic, string>
  settings: Table<SettingsRow, string>
}

db.version(1).stores({
  tactics: 'id, situation, updatedAt',
  settings: 'key',
})
