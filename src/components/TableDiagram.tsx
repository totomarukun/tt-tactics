import type { Hands, ShotNode, Side, Zone } from '../domain/types'
import {
  COL_LABEL,
  COL_W,
  COURT_H,
  DEPTH_LABEL,
  ROW_H,
  SERVE_Y,
  TABLE_H,
  TABLE_W,
  allZones,
  colIndex,
  serveOrigin,
  zoneCenter,
  zoneKey,
  zoneRect,
} from '../domain/zone'
import { curveDirOnScreen } from '../domain/spin'
import { SpinGlyph } from './Spin'

// 台の上での色。自分＝白、相手＝赤（青い台の上で見分けやすい組み合わせ）
export const ME_COLOR = '#ffffff'
export const ME_TEXT = '#1d5fa8'
export const OPP_COLOR = '#ef4444'
const TABLE_COLOR = '#1d5fa8'
const MARGIN = 26

interface Props {
  path: ShotNode[]
  hands: Hands
  /** 入力モード: タップ可能なコート側。未指定なら閲覧のみ */
  tapSide?: Side
  onZoneTap?: (z: Zone) => void
  highlightZone?: Zone | null
  /** 入力中の球の出発点（サーブ時） */
  pendingServeFrom?: Zone['col'] | null
  /** 経路を薄く描く（入力時の文脈表示） */
  dim?: boolean
  compact?: boolean
  onShotTap?: (id: string) => void
  selectedId?: string | null
}

const R = 15
type Pt = { x: number; y: number }

function shorten(a: Pt, b: Pt, by: number): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: b.x - (dx / len) * by, y: b.y - (dy / len) * by }
}

function unit(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: dx / len, y: dy / len }
}

/**
 * 着点のあとの「続き」を描く。
 * 前（2バウンド）: 同じコート内に2つ目のバウンド点
 * ハーフ: エンドラインぎりぎりまでの点線
 * 奥: エンドラインを越えて出ていく点線
 */
function BounceTail({ node, p, from, color, uid }: { node: ShotNode; p: Pt; from: Pt; color: string; uid: string }) {
  const side = node.zone.side
  const away = side === 'opp' ? -1 : 1 // ネットから離れる向き
  let u = unit(from, p)
  if (u.y * away <= 0.2) u = { x: 0, y: away } // 横に流れすぎる場合は縦にする
  const baselineY = side === 'opp' ? 0 : TABLE_H
  const dist = Math.abs(baselineY - p.y)
  const toBaseline = dist / Math.abs(u.y)
  const marker = `url(#tail-${node.player}-${uid})`
  const start = { x: p.x + u.x * (R + 2), y: p.y + u.y * (R + 2) }
  // バウンド後の矢印は本線より細く、少し弧を描く（跳ねる感じ）
  const bounceArrow = (to: Pt, dashed: boolean) => {
    const mx = (start.x + to.x) / 2 - u.y * 6
    const my = (start.y + to.y) / 2 + u.x * 6
    return (
      <path
        d={`M${start.x},${start.y} Q${mx},${my} ${to.x},${to.y}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashed ? '4 3' : undefined}
        opacity={0.9}
        markerEnd={marker}
        strokeLinecap="round"
      />
    )
  }

  if (node.zone.depth === 'S') {
    // 2バウンド: 同じコート内でもう一度跳ねる
    const d = Math.max(22, Math.min(40, toBaseline - 12))
    const q = { x: p.x + u.x * d, y: p.y + u.y * d }
    const q2 = { x: q.x + u.x * 14, y: q.y + u.y * 14 }
    return (
      <g>
        {bounceArrow({ x: q.x - u.x * 7, y: q.y - u.y * 7 }, false)}
        <circle cx={q.x} cy={q.y} r={6} fill="none" stroke={color} strokeWidth={2} />
        <line x1={q.x + u.x * 7} y1={q.y + u.y * 7} x2={q2.x} y2={q2.y} stroke={color} strokeWidth={1.5} opacity={0.6} strokeLinecap="round" />
      </g>
    )
  }
  if (node.zone.depth === 'H') {
    // ハーフロング: エンドライン上で止まる
    const q = { x: p.x + u.x * (toBaseline - 4), y: p.y + u.y * (toBaseline - 4) }
    return (
      <g>
        {bounceArrow(q, false)}
        <path d={`M${p.x + u.x * toBaseline - 8},${baselineY} L${p.x + u.x * toBaseline + 8},${baselineY}`} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
      </g>
    )
  }
  // ロング: エンドラインを越えて出ていく
  const over = toBaseline + 24
  const q = { x: p.x + u.x * over, y: p.y + u.y * over }
  return <g>{bounceArrow(q, true)}</g>
}

/** サーブの自コート側バウンド（出発点と相手コート着点の間） */
function ServeOwnBounce({ from, to, color }: { from: Pt; to: Pt; color: string }) {
  const t = 0.3
  const x = from.x + (to.x - from.x) * t
  const y = from.y + (to.y - from.y) * t
  return <circle cx={x} cy={y} r={5} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
}

export function TableDiagram({
  path,
  hands,
  tapSide,
  onZoneTap,
  highlightZone,
  pendingServeFrom,
  dim,
  compact,
  onShotTap,
  selectedId,
}: Props) {
  const hasServe = path[0]?.stroke === 'serve' && path[0].serveFrom
  const showServeArea = hasServe || pendingServeFrom || tapSide !== undefined
  const bottom = (showServeArea ? SERVE_Y + 12 : TABLE_H) + (compact ? 2 : MARGIN)
  const top = compact ? -2 : -MARGIN
  const points = path.map((n) => zoneCenter(n.zone, hands))
  const serveStart = hasServe ? serveOrigin(path[0].serveFrom!, hands) : null
  const uid = compact ? 'c' : 'f'

  return (
    <svg
      viewBox={`-2 ${top} ${TABLE_W + 4} ${bottom - top}`}
      className={`table-diagram${compact ? ' compact' : ''}`}
      role={tapSide ? 'group' : 'img'}
      aria-label="卓球台の図"
    >
      <defs>
        <marker id={`arrow-me-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={ME_COLOR} />
        </marker>
        <marker id={`tail-me-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={ME_COLOR} />
        </marker>
        <marker id={`tail-opp-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={OPP_COLOR} />
        </marker>
        <marker id={`arrow-opp-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={OPP_COLOR} />
        </marker>
      </defs>

      {/* 台 */}
      <rect x={0} y={0} width={TABLE_W} height={TABLE_H} rx={4} fill={TABLE_COLOR} />
      {/* ゾーン枠 */}
      {allZones().map((z) => {
        const r = zoneRect(z, hands)
        const tappable = tapSide === z.side
        const hl = highlightZone && zoneKey(highlightZone) === zoneKey(z)
        return (
          <rect
            key={zoneKey(z)}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={hl ? 'rgba(255,255,255,0.45)' : tappable ? 'rgba(255,255,255,0.06)' : 'transparent'}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={1}
            strokeDasharray={z.depth === 'H' ? '4 3' : undefined}
            style={{ cursor: tappable ? 'pointer' : 'default' }}
            onClick={tappable && onZoneTap ? () => onZoneTap(z) : undefined}
          />
        )
      })}
      {/* センターライン・ネット・外枠 */}
      <line x1={TABLE_W / 2} y1={0} x2={TABLE_W / 2} y2={TABLE_H} stroke="#fff" strokeWidth={1.5} />
      <rect x={0} y={0} width={TABLE_W} height={TABLE_H} rx={4} fill="none" stroke="#fff" strokeWidth={4} />
      <line x1={-6} y1={COURT_H} x2={TABLE_W + 6} y2={COURT_H} stroke="#cbd5e0" strokeWidth={5} />

      {/* ラベル（コンパクト時は省略） */}
      {!compact && (
        <g fill="rgba(255,255,255,0.6)" fontSize={11} fontFamily="system-ui, sans-serif">
          {(['F', 'M', 'B'] as const).map((c) => (
            <text key={`o${c}`} x={colIndex(c, 'opp', hands) * COL_W + COL_W / 2} y={14} textAnchor="middle">
              {COL_LABEL[c]}
            </text>
          ))}
          {(['F', 'M', 'B'] as const).map((c) => (
            <text key={`m${c}`} x={colIndex(c, 'me', hands) * COL_W + COL_W / 2} y={TABLE_H - 6} textAnchor="middle">
              {COL_LABEL[c]}
            </text>
          ))}
          {(['L', 'H', 'S'] as const).map((d, i) => (
            <text key={`od${d}`} x={4} y={i * ROW_H + ROW_H - 6} fontSize={10}>
              {DEPTH_LABEL[d]}
            </text>
          ))}
          {(['S', 'H', 'L'] as const).map((d, i) => (
            <text key={`md${d}`} x={4} y={COURT_H + i * ROW_H + ROW_H - 6} fontSize={10}>
              {DEPTH_LABEL[d]}
            </text>
          ))}
          <text x={TABLE_W - 4} y={COURT_H - 8} textAnchor="end" fontSize={10}>
            相手
          </text>
          <text x={TABLE_W - 4} y={COURT_H + 14} textAnchor="end" fontSize={10}>
            自分
          </text>
        </g>
      )}

      {/* サーブ出発点 */}
      {(serveStart || pendingServeFrom) && (
        <g>
          {(['F', 'M', 'B'] as const).map((c) => {
            const o = serveOrigin(c, hands)
            const active = pendingServeFrom === c || (serveStart && path[0].serveFrom === c)
            return (
              <circle
                key={c}
                cx={o.x}
                cy={o.y}
                r={active ? 7 : 4}
                fill={active ? ME_TEXT : '#cbd5e0'}
                stroke={active ? ME_COLOR : 'none'}
                strokeWidth={2}
              />
            )
          })}
        </g>
      )}

      {/* 軌道 */}
      <g opacity={dim ? 0.4 : 1}>
        {points.map((p, i) => {
          const from = i === 0 ? serveStart : points[i - 1]
          if (!from) return null
          const end = shorten(from, p, R + 2)
          const start = i === 0 ? from : shorten(p, from, R + 2)
          const color = path[i].player === 'me' ? ME_COLOR : OPP_COLOR
          // 横回転があれば、打者から見て曲がる方向へ膨らませる。なければ直線
          const hitterHand = path[i].player === 'me' ? hands.me : hands.opp
          const dir = curveDirOnScreen(path[i].spin, path[i].player, hitterHand)
          const len = Math.hypot(end.x - start.x, end.y - start.y) || 1
          const bend = dir * Math.min(60, len * 0.28)
          const cx = (start.x + end.x) / 2 + bend
          const cy = (start.y + end.y) / 2
          return (
            <path
              key={`l${path[i].id}`}
              d={`M${start.x},${start.y} Q${cx},${cy} ${end.x},${end.y}`}
              fill="none"
              stroke={color}
              strokeWidth={compact ? 3 : 3.5}
              markerEnd={`url(#arrow-${path[i].player}-${uid})`}
              strokeLinecap="round"
            />
          )
        })}
        {!compact && serveStart && points[0] && <ServeOwnBounce from={serveStart} to={points[0]} color={ME_COLOR} />}
        {!compact &&
          points.map((p, i) => {
            const from = i === 0 ? serveStart : points[i - 1]
            if (!from) return null
            const color = path[i].player === 'me' ? ME_COLOR : OPP_COLOR
            return <BounceTail key={`b${path[i].id}`} node={path[i]} p={p} from={from} color={color} uid={uid} />
          })}
        {points.map((p, i) => {
          const n = path[i]
          const me = n.player === 'me'
          const color = me ? ME_COLOR : OPP_COLOR
          const sel = selectedId === n.id
          return (
            <g key={n.id} onClick={onShotTap ? () => onShotTap(n.id) : undefined} style={{ cursor: onShotTap ? 'pointer' : 'default' }}>
              {n.isFinisher && <circle cx={p.x} cy={p.y} r={R + 6} fill="none" stroke="#f6e05e" strokeWidth={3} />}
              <circle cx={p.x} cy={p.y} r={R} fill={color} stroke={sel ? '#f6e05e' : me ? ME_TEXT : '#fff'} strokeWidth={sel ? 4 : 2.5} />
              <text
                x={p.x}
                y={p.y + 5}
                textAnchor="middle"
                fill={me ? ME_TEXT : '#fff'}
                fontSize={compact ? 16 : 15}
                fontWeight={700}
                fontFamily="system-ui, sans-serif"
              >
                {i + 1}
              </text>
              {!compact && n.spin && (
                <SpinGlyph
                  spin={n.spin}
                  size={24}
                  color="#1a202c"
                  cx={p.x + R + 9}
                  cy={p.y - R - 4}
                  leftHanded={(me ? hands.me : hands.opp) === 'left'}
                  asGroup
                />
              )}
              {!compact && n.height && (
                <g transform={`translate(${p.x + R + 2},${p.y + R - 4})`}>
                  <rect x={0} y={-8} width={22} height={14} rx={4} fill="#1a202c" opacity={0.85} />
                  <text x={11} y={3} textAnchor="middle" fill="#fff" fontSize={9} fontFamily="system-ui, sans-serif">
                    {n.height === 'high' ? '高' : '低'}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
