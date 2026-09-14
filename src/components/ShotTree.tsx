import { useMemo, useState } from 'react'
import { nodeLabel } from '../domain/presets'
import { countNodes } from '../domain/tree'
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

// 既定で畳むノード: 深さ1以上で子を持つもの（＝深さ0〜1だけ展開）
function initialCollapsed(root: ShotNode): Set<string> {
  const s = new Set<string>()
  const walk = (n: ShotNode, depth: number) => {
    if (depth >= 1 && n.children.length > 0) s.add(n.id)
    n.children.forEach((c) => walk(c, depth + 1))
  }
  walk(root, 0)
  return s
}

interface Row {
  node: ShotNode
  depth: number
  hiddenCount: number // 畳まれて隠れている子孫数（0なら展開中/子なし）
}

export function ShotTree({ root, selectedId, pathIds, onSelect, onAddChild, onEdit, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => initialCollapsed(root))

  const rows = useMemo(() => {
    const out: Row[] = []
    const walk = (n: ShotNode, depth: number) => {
      // 選択中の経路上は畳まれていても展開する
      const isCollapsed = depth >= 1 && collapsed.has(n.id) && !pathIds.has(n.id)
      out.push({ node: n, depth, hiddenCount: isCollapsed ? countNodes(n) - 1 : 0 })
      if (!isCollapsed) n.children.forEach((c) => walk(c, depth + 1))
    }
    walk(root, 0)
    return out
  }, [root, collapsed, pathIds])

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  return (
    <ul className="shot-tree">
      {rows.map(({ node, depth, hiddenCount }) => {
        const sel = node.id === selectedId
        const onPath = pathIds.has(node.id)
        const hasChildren = node.children.length > 0
        const isCollapsed = hiddenCount > 0
        return (
          <li key={node.id} className={`shot-row ${node.player} ${sel ? 'selected' : ''} ${onPath ? 'on-path' : ''}`} style={{ paddingLeft: 6 + depth * 16 }}>
            <div className="shot-line">
              {hasChildren ? (
                <button className="shot-toggle" aria-label={isCollapsed ? '展開' : '折りたたむ'} onClick={() => toggle(node.id)}>
                  {isCollapsed ? '▸' : '▾'}
                </button>
              ) : (
                <span className="shot-toggle empty" />
              )}
              <button className="shot-main" onClick={() => onSelect(node.id)}>
                <span className="shot-num">{depth + 1}</span>
                <span className="shot-label">
                  {nodeLabel(node)}
                  {node.isFinisher && <span className="star">★</span>}
                  {isCollapsed && <span className="branch-badge">＋{hiddenCount}</span>}
                </span>
                {node.note && <span className="shot-note">{node.note}</span>}
              </button>
            </div>
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
