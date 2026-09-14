import { useEffect, useState } from 'react'
import { clearEvents, listEvents, logEvent, onEventChange, type AppEvent } from '../domain/harness/events'
import { checkTactic, worstSeverity } from '../domain/harness/checks'
import { newReport, sanitizeLog, sanitizeTactic, sanitizeTask } from '../domain/validate'
import { db } from '../store/db'
import { useStore } from '../store/useStore'

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const LEVEL_MARK: Record<AppEvent['level'], string> = { info: '·', warn: '⚠', error: '✕' }

export function HarnessPanel() {
  const { tactics } = useStore()
  const [events, setEvents] = useState<AppEvent[]>([])
  const [diag, setDiag] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const refresh = () => void listEvents().then(setEvents)
  useEffect(() => {
    refresh()
    return onEventChange(refresh)
  }, [])

  const runDiagnostics = async () => {
    setRunning(true)
    try {
      // 1. 保存データの健全性（境界検証を実データに走らせる）
      const rep = newReport()
      const [rt, rk, rl] = await Promise.all([db.tactics.toArray(), db.tasks.toArray(), db.logs.toArray()])
      rt.forEach((t) => sanitizeTactic(t, rep))
      rk.forEach((t) => sanitizeTask(t, rep))
      rl.forEach((l) => sanitizeLog(l, rep))
      // 2. 戦術の卓球的チェック
      let warn = 0
      let err = 0
      for (const t of tactics) {
        const w = worstSeverity(checkTactic(t))
        if (w === 'error') err++
        else if (w === 'warn') warn++
      }
      const msg = `戦術 ${tactics.length} 件（要修正 ${err} / 気づき ${warn}）、保存データ 修復可 ${rep.repaired} / 破棄対象 ${rep.dropped}`
      setDiag(msg)
      logEvent('info', 'app', `診断: ${msg}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <div className="field">
        <span>データ診断</span>
        <p className="hint small">保存データの健全性と、登録済み戦術の卓球的な妥当性をまとめて点検します。</p>
        <button className="secondary full" onClick={() => void runDiagnostics()} disabled={running}>
          {running ? '点検中…' : '診断を実行'}
        </button>
        {diag && <p className="hint">{diag}</p>}
      </div>

      <div className="field">
        <span>アプリログ（エラー・データ・入出力）</span>
        <p className="hint small">描画エラーやデータの修復、インポートなどアプリ全体の出来事を記録します。</p>
        {events.length === 0 ? (
          <p className="hint small">まだ記録がありません。</p>
        ) : (
          <>
            <ul className="event-list">
              {events.map((e) => (
                <li key={e.id} className={`event-row ${e.level}`}>
                  <span className="event-mark">{LEVEL_MARK[e.level]}</span>
                  <span className="event-msg">
                    {e.message}
                    {e.detail && <span className="event-detail">{e.detail.slice(0, 160)}</span>}
                  </span>
                  <span className="event-time">{fmtTime(e.at)}</span>
                </li>
              ))}
            </ul>
            <button className="link-btn" onClick={() => void clearEvents()}>
              ログを消去
            </button>
          </>
        )}
      </div>
    </>
  )
}
