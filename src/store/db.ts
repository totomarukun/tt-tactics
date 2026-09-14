import Dexie, { type Table } from 'dexie'
import type { AppEvent } from '../domain/harness/events'
import type { TraceEntry } from '../domain/harness/trace'
import type { Cue, Focus, PracticeLog, Settings, Tactic, TacticOutcome, Task } from '../domain/types'

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
  events: Table<AppEvent, string>
  outcomes: Table<TacticOutcome, string>
  focuses: Table<Focus, string>
  cues: Table<Cue, string>
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

db.version(4).stores({
  tactics: 'id, situation, updatedAt',
  settings: 'key',
  tasks: 'id, status, createdAt',
  logs: 'id, &date',
  traces: 'id, at',
  events: 'id, at',
})

db.version(5).stores({
  tactics: 'id, situation, updatedAt',
  settings: 'key',
  tasks: 'id, status, createdAt',
  logs: 'id, &date',
  traces: 'id, at',
  events: 'id, at',
  outcomes: 'id, tacticId, date',
})

db.version(6).stores({
  tactics: 'id, situation, updatedAt',
  settings: 'key',
  tasks: 'id, status, createdAt',
  logs: 'id, &date',
  traces: 'id, at',
  events: 'id, at',
  outcomes: 'id, tacticId, date',
  focuses: 'id, week',
})

db.version(7).stores({
  tactics: 'id, situation, updatedAt',
  settings: 'key',
  tasks: 'id, status, createdAt',
  logs: 'id, &date',
  traces: 'id, at',
  events: 'id, at',
  outcomes: 'id, tacticId, date',
  focuses: 'id, week',
  cues: 'id, category',
})
