import { db } from '../../store/db'
import { newId } from '../tree'

// ハーネスの Sensor（観測）。すべての AI 呼び出しの入出力を記録し、後から診断・改善できるようにする。

export type TraceStatus = 'ok' | 'error'

export interface TraceEntry {
  id: string
  at: string // ISO
  label: string // 何の呼び出しか（例: propose-tactics, verify-tactics, drills）
  model: string
  attempts: number
  durationMs: number
  status: TraceStatus
  systemChars: number
  promptChars: number
  responseChars: number
  /** 送信したユーザープロンプト（末尾を切る） */
  promptPreview: string
  /** 生レスポンス（末尾を切る） */
  responsePreview: string
  error?: string
}

const MAX_TRACES = 40
const PREVIEW = 4000

let listeners: (() => void)[] = []
export function onTraceChange(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}
function emit() {
  listeners.forEach((l) => l())
}

export async function recordTrace(entry: Omit<TraceEntry, 'id' | 'at'>): Promise<void> {
  const row: TraceEntry = {
    ...entry,
    id: newId(),
    at: new Date().toISOString(),
    promptPreview: entry.promptPreview.slice(0, PREVIEW),
    responsePreview: entry.responsePreview.slice(0, PREVIEW),
  }
  try {
    await db.traces.put(row)
    // 古いものを間引く
    const count = await db.traces.count()
    if (count > MAX_TRACES) {
      const old = await db.traces.orderBy('at').limit(count - MAX_TRACES).primaryKeys()
      await db.traces.bulkDelete(old)
    }
  } catch {
    /* トレースの失敗は本処理を止めない */
  }
  emit()
}

export async function listTraces(): Promise<TraceEntry[]> {
  try {
    return await db.traces.orderBy('at').reverse().toArray()
  } catch {
    return []
  }
}

export async function clearTraces(): Promise<void> {
  try {
    await db.traces.clear()
  } catch {
    /* noop */
  }
  emit()
}
