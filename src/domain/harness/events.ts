import { db } from '../../store/db'
import { newId } from '../tree'

// アプリ全体の Sensor。AI 呼び出し（trace.ts）だけでなく、描画エラー・データ修復・入出力など
// アプリのどこで何が起きたかを記録する。設定の「アプリログ」で確認できる。

export type EventLevel = 'info' | 'warn' | 'error'
export type EventCategory = 'render' | 'data' | 'io' | 'app'

export interface AppEvent {
  id: string
  at: string
  level: EventLevel
  category: EventCategory
  message: string
  detail?: string
}

const MAX_EVENTS = 60
let listeners: (() => void)[] = []

export function onEventChange(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function logEvent(level: EventLevel, category: EventCategory, message: string, detail?: string): void {
  const row: AppEvent = { id: newId(), at: new Date().toISOString(), level, category, message: message.slice(0, 300), detail: detail?.slice(0, 3000) }
  // 開発時はコンソールにも出す
  if (level === 'error') console.error(`[${category}] ${message}`, detail ?? '')
  ;(async () => {
    try {
      await db.events.put(row)
      const count = await db.events.count()
      if (count > MAX_EVENTS) {
        const old = await db.events.orderBy('at').limit(count - MAX_EVENTS).primaryKeys()
        await db.events.bulkDelete(old)
      }
    } catch {
      /* ログの失敗で本処理を止めない */
    }
    listeners.forEach((l) => l())
  })()
}

export async function listEvents(): Promise<AppEvent[]> {
  try {
    return await db.events.orderBy('at').reverse().toArray()
  } catch {
    return []
  }
}

export async function clearEvents(): Promise<void> {
  try {
    await db.events.clear()
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l())
}

/** グローバルエラーを拾ってログに残す（アプリ起動時に1回だけ呼ぶ） */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => {
    logEvent('error', 'app', e.message || 'window error', e.error?.stack)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    logEvent('error', 'app', r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined)
  })
}
