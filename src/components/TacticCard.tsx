import { statsFor } from '../domain/outcome'
import { defaultPath } from '../domain/tree'
import type { Handedness, Tactic, TacticOutcome } from '../domain/types'
import { TableDiagram } from './TableDiagram'

interface Props {
  tactic: Tactic
  myHand: Handedness
  outcomes: TacticOutcome[]
  onOpen: (id: string) => void
}

export function TacticCard({ tactic, myHand, outcomes, onOpen }: Props) {
  const path = defaultPath(tactic.root)
  const stats = statsFor(tactic.id, outcomes)
  return (
    <button className="tactic-card" onClick={() => onOpen(tactic.id)}>
      <div className="card-mini">
        <TableDiagram path={path} hands={{ me: myHand, opp: tactic.oppHand }} compact />
      </div>
      <div className="card-body">
        <div className="card-top">
          <span className={`badge ${tactic.situation}`}>
            {tactic.situation === 'my_serve' ? 'サーブ' : 'レシーブ'}
          </span>
          <span className="conf" aria-label={`自信度${tactic.confidence}`}>
            {'●'.repeat(tactic.confidence)}
            {'○'.repeat(3 - tactic.confidence)}
          </span>
        </div>
        <div className="card-title">{tactic.title || '（無題）'}</div>
        {tactic.goal && <div className="card-goal">{tactic.goal}</div>}
        <div className="card-tags">
          {tactic.oppHand === 'left' && <span className="tag">対左</span>}
          {tactic.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
          {path.length === 0 && <span className="tag muted">未入力</span>}
          {path.length > 0 && stats.tried === 0 && <span className="tag untried">未実戦</span>}
          {stats.winRate !== null && (
            <span className={`tag rate ${stats.winRate >= 0.6 ? 'good' : stats.winRate < 0.4 ? 'bad' : ''}`}>
              {Math.round(stats.winRate * 100)}% 決まる
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
