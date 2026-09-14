import Dexie, { type Table } from 'dexie'
import type { TraceEntry } from '../domain/harness/trace'
import type { PracticeLog, Settings, Tactic, Task } from '../domain/types'

interface SettingsRow {
  key: string
  value: Settings
}

export const db = new Dexie('tt-tactics') as Dexie & {
  tactics: Table<Tactic, string>
  settings: Table<SettingsRow, string>
  tasks: Table<Task, string>
  logs: Table<PracticeLog, string>
  traces: Table<TraceEntry, string>
}

db.version(1).stores({
  tactics: 'id, situation, updatedAt',
  settings: 'key',
})

db.version(2).stores({
  tactics: 'id, situation, updatedAt',
  settings: 'key',
  tasks: 'id, status, createdAt',
  logs: 'id, &date',
})

db.version(3).stores({
  tactics: 'id, situation, updatedAt',
  settings: 'key',
  tasks: 'id, status, createdAt',
  logs: 'id, &date',
  traces: 'id, at',
})
