import { useEffect, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import type { PracticeLog, PracticeResult } from '../domain/types'
import { shiftDate, today, useStore } from '../store/useStore'

const RESULTS: { key: PracticeResult; label: string; mark: string }[] = [
  { key: 'good', label: 'できた', mark: '◎' },
  { key: 'ok', label: 'まあまあ', mark: '○' },
  { key: 'bad', label: 'まだ', mark: '△' },
]

function fmt(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const w = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
  return `${m}/${d}（${w}）`
}

export function PracticePage() {
  const { tasks, tactics, logs, ensureLog, updateLog, setLogItem, removeLogItem, deleteLog } = useStore()
  const [date, setDate] = useState(today())
  const [picking, setPicking] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})

  const log: PracticeLog | undefined = logs.find((l) => l.date === date)
  const openTasks = tasks.filter((t) => t.status === 'open')
  const taskOf = (id: string) => tasks.find((t) => t.id === id)
  const tacticName = (id: string) => tactics.find((t) => t.id === id)?.title

  useEffect(() => {
    setNoteDraft(log?.note ?? '')
    const n: Record<string, string> = {}
    log?.items.forEach((i) => (n[i.taskId] = i.note ?? ''))
    setItemNotes(n)
  }, [log?.id, log?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = async (taskId: string) => {
    const l = log ?? (await ensureLog(date))
    await setLogItem(l.id, { taskId })
  }

  const history = logs.filter((l) => l.date !== date && (l.items.length > 0 || l.note))

  return (
    <div className="page">
      <header className="app-bar">
        <button className="icon" onClick={() => setDate(shiftDate(date, -1))} aria-label="前の日">
          ‹
        </button>
        <h1 style={{ textAlign: 'center' }}>
          {fmt(date)}
          {date === today() && <span className="today-badge">今日</span>}
        </h1>
        <button className="icon" onClick={() => setDate(shiftDate(date, 1))} aria-label="次の日">
          ›
        </button>
      </header>
      {date !== today() && (
        <button className="link-btn" onClick={() => setDate(today())}>
          今日に戻る
        </button>
      )}

      <section className="settings-section">
        <h2>やること</h2>
        {(!log || log.items.length === 0) && <p className="hint small">課題を選んで、練習後に結果とメモを残しましょう。</p>}
        <ul className="practice-list">
          {log?.items.map((it) => {
            const t = taskOf(it.taskId)
            if (!t) return null
            return (
              <li key={it.taskId} className="practice-item">
                <div className="practice-head">
                  <div>
                    <div className="task-title">{t.title}</div>
                    <div className="task-meta">
                      {t.tacticIds.map((id) => tacticName(id)).filter(Boolean).map((n) => (
                        <span key={n} className="tag">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="icon small" aria-label="外す" onClick={() => removeLogItem(log.id, it.taskId)}>
                    ×
                  </button>
                </div>
                {t.detail && <details className="task-detail"><summary>やり方</summary><pre>{t.detail}</pre></details>}
                <div className="chip-group">
                  {RESULTS.map((r) => (
                    <button
                      key={r.key}
                      className={`chip ${it.result === r.key ? 'on' : ''}`}
                      onClick={() => setLogItem(log.id, { taskId: it.taskId, result: it.result === r.key ? undefined : r.key })}
                    >
                      {r.mark} {r.label}
                    </button>
                  ))}
                </div>
                <input
                  className="note-input full"
                  placeholder="気づき・数値（例: 10本中6本）"
                  value={itemNotes[it.taskId] ?? ''}
                  onChange={(e) => setItemNotes({ ...itemNotes, [it.taskId]: e.target.value })}
                  onBlur={() => setLogItem(log.id, { taskId: it.taskId, note: itemNotes[it.taskId]?.trim() || undefined })}
                />
              </li>
            )
          })}
        </ul>
        <button className="secondary full" onClick={() => setPicking(!picking)}>
          {picking ? '閉じる' : '＋ 課題を追加'}
        </button>
        {picking && (
          <div className="chip-group">
            {openTasks.filter((t) => !log?.items.some((i) => i.taskId === t.id)).length === 0 && (
              <span className="hint small">追加できる課題がありません。課題タブで作成してください。</span>
            )}
            {openTasks
              .filter((t) => !log?.items.some((i) => i.taskId === t.id))
              .map((t) => (
                <button key={t.id} className="chip small" onClick={() => addItem(t.id)}>
                  ＋ {t.title}
                </button>
              ))}
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>今日の振り返り</h2>
        <textarea
          rows={3}
          className="full"
          placeholder="全体の感想、次回やりたいこと"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={async () => {
            const l = log ?? (noteDraft.trim() ? await ensureLog(date) : undefined)
            if (l && (l.note ?? '') !== noteDraft) await updateLog(l.id, { note: noteDraft })
          }}
        />
        {log && (
          <button
            className="danger-text"
            onClick={() => {
              if (confirm('この日の記録を削除しますか？')) void deleteLog(log.id)
            }}
          >
            この日の記録を削除
          </button>
        )}
      </section>

      {history.length > 0 && (
        <section className="settings-section">
          <h2>これまでの記録</h2>
          <ul className="history-list">
            {history.map((l) => (
              <li key={l.id}>
                <button className="history-row" onClick={() => setDate(l.date)}>
                  <span className="history-date">{fmt(l.date)}</span>
                  <span className="history-summary">
                    {l.items.map((i) => `${taskOf(i.taskId)?.title ?? '?'}${i.result ? RESULTS.find((r) => r.key === i.result)?.mark : ''}`).join('、')}
                    {l.note ? ` / ${l.note}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <BottomNav />
    </div>
  )
}
