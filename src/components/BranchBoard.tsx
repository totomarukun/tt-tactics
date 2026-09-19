import { useEffect, useMemo, useRef, useState } from 'react'
import { nodeLabel, strokeText } from '../domain/presets'
import { defaultPath, findPath } from '../domain/tree'
import type { Hands, ShotNode, Tactic } from '../domain/types'
import { zoneShortLabel } from '../domain/zone'
import { MiniCourt } from './MiniCourt'

// 分岐マップ（ホワイトボード俯瞰）。ツリー全体を左→右に並べ、pan/pinch-zoom で見渡す。
// 研究 10: 横 tidy tree・主線強調・セマンティックズーム・fit-to-screen・依存ゼロ。

const NODE_W = 112
const MINI_H = Math.round((NODE_W * 540) / 300) // ミニコートの高さ（台の縦横比）
const LABEL_H = 30
const NODE_H = MINI_H + LABEL_H
const COL_GAP = 60 // ノード間の横の余白（深さ方向）
const ROW_GAP = 16 // ノード間の縦の余白（兄弟方向）
const COL = NODE_W + COL_GAP
const ROW = NODE_H + ROW_GAP

interface Laid {
  node: ShotNode
  parent: ShotNode | null
  depth: number
  x: number // 左端
  y: number // 中心
}

// 依存ゼロの非重複レイアウト: 葉に連番row、親は子のyの平均、x=depth。
function layoutTree(root: ShotNode): { laid: Laid[]; edges: { from: Laid; to: Laid }[] } {
  const laid: Laid[] = []
  const byId = new Map<string, Laid>()
  let row = 0
  const walk = (n: ShotNode, depth: number, parent: ShotNode | null): number => {
    let cy: number
    if (n.children.length === 0) {
      cy = row * ROW
      row++
    } else {
      const ys = n.children.map((c) => walk(c, depth + 1, n))
      cy = (Math.min(...ys) + Math.max(...ys)) / 2
    }
    const item: Laid = { node: n, parent, depth, x: depth * COL, y: cy }
    laid.push(item)
    byId.set(n.id, item)
    return cy
  }
  walk(root, 0, null)
  const edges: { from: Laid; to: Laid }[] = []
  for (const it of laid) {
    for (const c of it.node.children) {
      const to = byId.get(c.id)
      if (to) edges.push({ from: it, to })
    }
  }
  return { laid, edges }
}

function edgePath(from: Laid, to: Laid): string {
  const x1 = from.x + NODE_W
  const y1 = from.y
  const x2 = to.x
  const y2 = to.y
  const mx = (x1 + x2) / 2
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
}

type VB = { x: number; y: number; w: number; h: number }

export function BranchBoard({ tactic, hands, onClose }: { tactic: Tactic; hands: Hands; onClose: () => void }) {
  const root = tactic.root
  const svgRef = useRef<SVGSVGElement | null>(null)
  const vb = useRef<VB>({ x: 0, y: 0, w: 1000, h: 1000 })
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchDist = useRef(0)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState(false) // セマンティックズーム: 近=チップ / 遠=ドット

  const { laid, edges, bbox } = useMemo(() => {
    if (!root) return { laid: [], edges: [], bbox: { x: 0, y: 0, w: 100, h: 100 } }
    const { laid, edges } = layoutTree(root)
    const xs = laid.map((l) => l.x)
    const ys = laid.map((l) => l.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs) + NODE_W
    const minY = Math.min(...ys) - NODE_H / 2
    const maxY = Math.max(...ys) + NODE_H / 2
    return { laid, edges, bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } }
  }, [root])

  const mainSet = useMemo(() => {
    const p = selectedId ? findPath(root, selectedId) : defaultPath(root)
    return new Set((p ?? []).map((n) => n.id))
  }, [root, selectedId])

  const applyVB = () => {
    const el = svgRef.current
    if (!el) return
    const v = vb.current
    el.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`)
    const pxPerUnit = el.clientWidth / v.w
    const near = pxPerUnit >= 0.62
    setDetail((d) => (d === near ? d : near))
  }

  const fit = (target?: { x: number; y: number; w: number; h: number }) => {
    const el = svgRef.current
    if (!el) return
    const box = target ?? bbox
    const pad = 40
    let w = box.w + pad * 2
    let h = box.h + pad * 2
    const aspect = el.clientWidth / Math.max(1, el.clientHeight)
    if (w / h > aspect) h = w / aspect
    else w = h * aspect
    vb.current = { x: box.x - (w - box.w) / 2, y: box.y - (h - box.h) / 2, w, h }
    applyVB()
  }

  // 初期表示＝ミニコートが見える倍率でルート付近から。全体像は「全体表示」で。
  const resetView = () => {
    const el = svgRef.current
    if (!el) return
    const cw = el.clientWidth
    const ch = el.clientHeight
    if (!cw || !ch) {
      requestAnimationFrame(resetView) // レイアウト前はサイズ0なので次フレームで再試行
      return
    }
    const scale = 1.15 // 1ユーザー単位あたりのpx（コートが見える倍率）
    const w = cw / scale
    const h = ch / scale
    const cy = bbox.y + bbox.h / 2
    vb.current = { x: bbox.x - 20, y: cy - h / 2, w, h }
    applyVB()
  }
  useEffect(() => {
    resetView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox.x, bbox.y, bbox.w, bbox.h])

  const clientToUser = (cx: number, cy: number) => {
    const el = svgRef.current!
    const r = el.getBoundingClientRect()
    const v = vb.current
    return { x: v.x + ((cx - r.left) / r.width) * v.w, y: v.y + ((cy - r.top) / r.height) * v.h }
  }

  const zoomAround = (cx: number, cy: number, factor: number) => {
    const v = vb.current
    const u = clientToUser(cx, cy)
    const nw = Math.min(bbox.w * 6 + 400, Math.max(bbox.w / 8, v.w * factor))
    const k = nw / v.w
    vb.current = { x: u.x - (u.x - v.x) * k, y: u.y - (u.y - v.y) * k, w: v.w * k, h: v.h * k }
    applyVB()
  }

  // pan / pinch（Pointer Events, viewBox直更新）
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const down = (e: PointerEvent) => {
      // タップ（ノード選択）を潰さないよう、ここでは capture しない。
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, moved: false }
      else if (pointers.current.size === 2) {
        pinchDist.current = dist()
        drag.current = null
      }
    }
    const move = (e: PointerEvent) => {
      const prev = pointers.current.get(e.pointerId)
      if (!prev) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 1) {
        const d = drag.current
        if (d && !d.moved) {
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return // 微動はタップ扱い
          d.moved = true
          el.setPointerCapture(e.pointerId) // ドラッグ確定後だけ捕捉
        }
        const v = vb.current
        const s = v.w / el.clientWidth
        v.x -= (e.clientX - prev.x) * s
        v.y -= (e.clientY - prev.y) * s
        applyVB()
      } else if (pointers.current.size === 2) {
        const nd = dist()
        if (pinchDist.current && nd) {
          const m = mid()
          zoomAround(m.x, m.y, pinchDist.current / nd)
        }
        pinchDist.current = nd
      }
    }
    const up = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinchDist.current = 0
      if (pointers.current.size === 0) drag.current = null
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAround(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0012))
    }
    const dist = () => {
      const [a, b] = [...pointers.current.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const mid = () => {
      const [a, b] = [...pointers.current.values()]
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox.w])

  const tapNode = (l: Laid) => {
    setSelectedId(l.node.id === selectedId ? null : l.node.id)
    // タップしたノードを中央へ寄せる（現在のズーム量は維持）
    const v = vb.current
    vb.current = { ...v, x: l.x + NODE_W / 2 - v.w / 2, y: l.y - v.h / 2 }
    applyVB()
  }

  if (!root) {
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <p className="hint">まだ球がありません。</p>
          <button className="primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    )
  }

  const selected = selectedId ? laid.find((l) => l.node.id === selectedId) : null

  return (
    <div className="board-overlay">
      <div className="board-head">
        <button className="icon" onClick={onClose} aria-label="閉じる">
          ‹
        </button>
        <span className="board-title">{tactic.title}</span>
        <button className="board-fit" onClick={() => fit()}>
          全体表示
        </button>
      </div>

      <svg ref={svgRef} className="branch-board" role="application" aria-label="分岐マップ" preserveAspectRatio="xMidYMid meet">
        {/* エッジ */}
        {edges.map(({ from, to }, i) => {
          const main = mainSet.has(from.node.id) && mainSet.has(to.node.id)
          return (
            <path
              key={i}
              d={edgePath(from, to)}
              fill="none"
              stroke={main ? 'var(--accent)' : 'var(--line)'}
              strokeWidth={main ? 3 : 2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
        {/* ノード */}
        {laid.map((l) => {
          const me = l.node.player === 'me'
          const onMain = mainSet.has(l.node.id)
          const sel = l.node.id === selectedId
          if (!detail) {
            // 遠: ドット（自分=塗り / 相手=白抜き）
            return (
              <g key={l.node.id} transform={`translate(${l.x + NODE_W / 2},${l.y})`} onClick={() => tapNode(l)} style={{ cursor: 'pointer' }}>
                <circle
                  r={sel ? 13 : 10}
                  fill={me ? 'var(--me)' : 'var(--card)'}
                  stroke={me ? 'var(--me)' : 'var(--opp)'}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  opacity={onMain || sel ? 1 : 0.45}
                />
                {l.node.isFinisher && (
                  <text textAnchor="middle" dy={4} fontSize={13} fill={me ? '#fff' : 'var(--opp)'}>
                    ★
                  </text>
                )}
              </g>
            )
          }
          // 近: ミニコート＋軌道のカード
          return (
            <g key={l.node.id} transform={`translate(${l.x},${l.y - NODE_H / 2})`} onClick={() => tapNode(l)} style={{ cursor: 'pointer' }} opacity={onMain || sel ? 1 : 0.5}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={12}
                fill="var(--card)"
                stroke={sel || onMain ? 'var(--accent)' : 'var(--line)'}
                strokeWidth={sel ? 3 : onMain ? 2 : 1.5}
                vectorEffect="non-scaling-stroke"
              />
              <MiniCourt node={l.node} parent={l.parent} hands={hands} w={NODE_W} h={MINI_H} />
              <text x={NODE_W / 2} y={MINI_H + 13} fontSize={12} fontWeight={700} fill="var(--text)" textAnchor="middle">
                {clip(strokeText(l.node), 11)}
              </text>
              <text x={NODE_W / 2} y={MINI_H + 26} fontSize={11} fill="var(--muted)" textAnchor="middle">
                {zoneShortLabel(l.node.zone)}
                {l.node.isFinisher ? ' ★' : ''}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="board-foot">
        <span className="legend">
          <i className="dot me" /> 自分 <i className="dot opp" /> 相手 　<i className="line-main" /> 主な狙い筋
        </span>
        {selected && <div className="board-sel">{nodeLabel(selected.node)}</div>}
        {!selected && <div className="hint small">ノードをタップで狙い筋をハイライト・2本指でズーム</div>}
      </div>
    </div>
  )
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
