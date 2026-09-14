import { useState } from 'react'
import { RESULT_LABEL, RESULT_MARK, evidenceLabel, statsFor } from '../domain/outcome'
import type { OutcomeResult, Tactic } from '../domain/types'
import { useStore } from '../store/useStore'

const RESULTS: OutcomeResult[] = ['won', 'even', 'lost']

function fmtDate(d: string): string {
  const [, m, day] = d.split('-')
  return `${Number(m)}/${Number(day)}`
}

export function OutcomeSection({ tactic }: { tactic: Tactic }) {
  const { outcomes, addOutcome, deleteOutcome } = useStore()
  const [opponent, setOpponent] = useState('')
  const [note, setNote] = useState('')
  const [expand, setExpand] = useState(false)
  const [flash, setFlash] = useState<OutcomeResult | null>(null)

  const mine = outcomes.filter((o) => o.tacticId === tactic.id).slice(0, 8)
  const stats = statsFor(tactic.id, outcomes)

  const record = async (result: OutcomeResult) => {
    await addOutcome({ tacticId: tactic.id, result, opponent: opponent.trim() || undefined, note: note.trim() || undefined })
    setOpponent('')
    setNote('')
    setFlash(result)
    setTimeout(() => setFlash(null), 1200)
  }

  return (
    <>
      <div className="section-head">
        <span>試合で試す</span>
        <span className="hint small">{evidenceLabel(stats)}</span>
      </div>
      <div className="outcome-box">
        {stats.tried > 0 && (
          <div className="outcome-tally">
            <span className="won">◎ {stats.won}</span>
            <span className="even">△ {stats.even}</span>
            <span className="lost">✕ {stats.lost}</span>
            {stats.tried >= 3 && <span className="evidence-note">自信度は実績から自動更新されます</span>}
          </div>
        )}
        <div className="outcome-buttons">
          {RESULTS.map((r) => (
            <button key={r} className={`outcome-btn ${r} ${flash === r ? 'flash' : ''}`} onClick={() => void record(r)}>
              <span className="mark">{RESULT_MARK[r]}</span>
              <span>{RESULT_LABEL[r]}</span>
            </button>
          ))}
        </div>
        <button className="link-btn" onClick={() => setExpand(!expand)}>
          {expand ? '相手・メモを閉じる' : '相手・メモを添える'}
        </button>
        {expand && (
          <div className="outcome-fields">
            <input placeholder="相手（例: 前陣速攻の人）" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
            <input placeholder="メモ（例: 3球目が浮いた）" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}

        {mine.length > 0 && (
          <ul className="outcome-list">
            {mine.map((o) => (
              <li key={o.id} className={o.result}>
                <span className="o-mark">{RESULT_MARK[o.result]}</span>
                <span className="o-date">{fmtDate(o.date)}</span>
                <span className="o-text">
                  {o.opponent && <b>{o.opponent}</b>}
                  {o.note && <span className="o-note"> {o.note}</span>}
                </span>
                <button className="o-del" aria-label="取り消す" onClick={() => void deleteOutcome(o.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {stats.tried === 0 && <p className="hint small">まだ試合で試していません。試したら結果を1タップで記録すると、効いているかが見えてきます。</p>}
      </div>
    </>
  )
}
