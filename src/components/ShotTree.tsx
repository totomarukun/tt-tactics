import { nodeLabel } from '../domain/presets'
import { flatten } from '../domain/tree'
import type { ShotNode } from '../domain/types'

interface Props {
  root: ShotNode
  selectedId: string | null
  pathIds: Set<string>
  onSelect: (id: string) => void
  onAddChild: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function ShotTree({ root, selectedId, pathIds, onSelect, onAddChild, onEdit, onDelete }: Props) {
  const rows = flatten(root)
  return (
    <ul className="shot-tree">
      {rows.map(({ node, depth }) => {
        const sel = node.id === selectedId
        const onPath = pathIds.has(node.id)
        return (
          <li
            key={node.id}
            className={`shot-row ${node.player} ${sel ? 'selected' : ''} ${onPath ? 'on-path' : ''}`}
            style={{ paddingLeft: 8 + depth * 18 }}
          >
            <button className="shot-main" onClick={() => onSelect(node.id)}>
              <span className="shot-num">{depth + 1}</span>
              <span className="shot-label">
                {nodeLabel(node)}
                {node.isFinisher && <span className="star">★</span>}
              </span>
              {node.note && <span className="shot-note">{node.note}</span>}
            </button>
            {sel && (
              <div className="shot-actions">
                <button onClick={() => onAddChild(node.id)}>＋ 次の球</button>
                <button onClick={() => onEdit(node.id)}>編集</button>
                {depth > 0 && (
                  <button className="danger" onClick={() => onDelete(node.id)}>
                    削除
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
