import { useMemo, useState } from 'react'
import { nodeLabel, strokeText } from '../domain/presets'
import type { Hands, ShotNode, Tactic } from '../domain/types'
import { zoneShortLabel } from '../domain/zone'
import { TableDiagram } from './TableDiagram'

// 分岐ビュー（イメトレ）。相手の返球を選びながら、経路を1球ずつ台の上で辿る。
// 「相手がこう来たら、自分はこう返す」を待ちのイメージトレーニングとして視覚化する。

function resolvePath(root: ShotNode, ids: string[]): ShotNode[] {
  const out: ShotNode[] = []
  let cur: ShotNode | undefined = root
  for (const id of ids) {
    if (!cur || cur.id !== id) break
    out.push(cur)
    // 次の id を子から探す（次ループで cur を更新）
    const nextId: string | undefined = ids[out.length]
    cur = nextId ? cur.children.find((c) => c.id === nextId) : undefined
  }
  return out
}

export function RehearseSheet({ tactic, hands, onClose }: { tactic: Tactic; hands: Hands; onClose: () => void }) {
  const root = tactic.root
  const [ids, setIds] = useState<string[]>(root ? [root.id] : [])
  const [playKey, setPlayKey] = useState(1)

  const pathNodes = useMemo(() => (root ? resolvePath(root, ids) : []), [root, ids])
  const current = pathNodes[pathNodes.length - 1]
  const children = current?.children ?? []
  const atLeaf = children.length === 0

  if (!root || !current) {
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <p className="hint">球がありません。</p>
          <button className="primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    )
  }

  const advance = (childId: string) => {
    setIds([...ids, childId])
    setPlayKey((k) => k + 1)
  }
  const back = () => {
    if (ids.length > 1) {
      setIds(ids.slice(0, -1))
      setPlayKey((k) => k + 1)
    }
  }
  const reset = () => {
    setIds([root.id])
    setPlayKey((k) => k + 1)
  }

  const nextIsMine = current.player === 'opp' // 次に打つのは相手の逆
  const choiceHeading = atLeaf ? '' : nextIsMine ? 'あなたの一手' : '相手はどう返す？'

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet rehearse" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">分岐ビュー・イメトレ</span>
          <button className="icon" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <p className="hint small">{tactic.title}</p>

        <div className="rehearse-diagram">
          <TableDiagram path={pathNodes} hands={hands} playKey={playKey} />
        </div>

        {/* 現在の経路 */}
        <div className="rehearse-trail">
          {pathNodes.map((n, i) => (
            <span key={n.id} className={`trail-chip ${n.player}`}>
              {i + 1}. {strokeText(n)}
            </span>
          ))}
        </div>

        {atLeaf ? (
          <div className="rehearse-end">
            <div className="end-label">{current.isFinisher ? '★ ここで決める' : 'この展開はここまで'}</div>
            <p className="hint small">「相手がこう来たら」を変えて、別の展開も辿ってみましょう。</p>
          </div>
        ) : (
          <div className="rehearse-choices">
            <div className="choice-heading">{choiceHeading}</div>
            {children.map((c) => (
              <button key={c.id} className={`choice ${c.player}`} onClick={() => advance(c.id)}>
                <span className="choice-main">{nodeLabel(c)}</span>
                <span className="choice-zone">{zoneShortLabel(c.zone)}</span>
                {c.isFinisher && <span className="star">★</span>}
              </button>
            ))}
          </div>
        )}

        <div className="rehearse-controls">
          <button className="secondary" onClick={back} disabled={ids.length <= 1}>
            ‹ 1つ戻る
          </button>
          <button className="secondary" onClick={reset} disabled={ids.length <= 1}>
            最初から
          </button>
        </div>
      </div>
    </div>
  )
}
