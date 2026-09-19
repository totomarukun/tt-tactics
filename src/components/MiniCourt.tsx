import { SPIN_VECTOR, curveDirOnScreen, spinAmountScale } from '../domain/spin'
import type { Hands, ShotNode } from '../domain/types'
import { COURT_H, TABLE_H, TABLE_W, serveOrigin, zoneCenter } from '../domain/zone'
import { ME_COLOR, OPP_COLOR } from './TableDiagram'

// 分岐マップのノード用ミニコート。root からこのノードまでの軌道を残像として薄く重ね、
// 最後の1球を濃く描く。戦術で指定した「長さ/弾道・高さ・回転・回転量」を矢印で表す。
// ネイティブ座標(300x540)で描き、呼び出し側で縮小。

const TABLE_COLOR = '#1d5fa8'
const BALL_R = 15

type Pt = { x: number; y: number }

function unit(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: dx / len, y: dy / len }
}

function fromPoint(n: ShotNode, prev: ShotNode | null, hands: Hands): Pt {
  if (prev) return zoneCenter(prev.zone, hands)
  if (n.stroke === 'serve' && n.serveFrom) return { x: serveOrigin(n.serveFrom, hands).x, y: TABLE_H - 6 }
  return { ...zoneCenter(n.zone, hands), y: TABLE_H - 6 }
}

function arrowHead(at: Pt, d: Pt, size: number, color: string) {
  const n = { x: -d.y, y: d.x }
  const tip = { x: at.x + d.x * size, y: at.y + d.y * size }
  const b1 = { x: at.x + n.x * size * 0.62, y: at.y + n.y * size * 0.62 }
  const b2 = { x: at.x - n.x * size * 0.62, y: at.y - n.y * size * 0.62 }
  return <path d={`M${tip.x},${tip.y} L${b1.x},${b1.y} L${b2.x},${b2.y} Z`} fill={color} />
}

/** 弾道の続き（長さ/弾道）。S=2バウンドで止まる, H=エンドラインで止まる, L=奥へ抜ける。 */
function BounceTail({ from, to, depth, color }: { from: Pt; to: Pt; depth: ShotNode['zone']['depth']; color: string }) {
  const d = unit(from, to)
  if (depth === 'S') {
    const q = { x: to.x + d.x * 30, y: to.y + d.y * 30 }
    const q2 = { x: q.x + d.x * 16, y: q.y + d.y * 16 }
    return (
      <g>
        <line x1={to.x} y1={to.y} x2={q.x} y2={q.y} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
        <circle cx={q.x} cy={q.y} r={7} fill="none" stroke={color} strokeWidth={3} />
        <line x1={q.x} y1={q.y} x2={q2.x} y2={q2.y} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      </g>
    )
  }
  if (depth === 'H') {
    const q = { x: to.x + d.x * 44, y: to.y + d.y * 44 }
    const n = { x: -d.y, y: d.x }
    return (
      <g>
        <line x1={to.x} y1={to.y} x2={q.x} y2={q.y} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
        <line x1={q.x - n.x * 11} y1={q.y - n.y * 11} x2={q.x + n.x * 11} y2={q.y + n.y * 11} stroke={color} strokeWidth={4} strokeLinecap="round" />
      </g>
    )
  }
  // L: 奥へ抜ける（点線＋矢じり）
  const q = { x: to.x + d.x * 58, y: to.y + d.y * 58 }
  return (
    <g>
      <line x1={to.x} y1={to.y} x2={q.x} y2={q.y} stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray="6 5" opacity={0.9} />
      {arrowHead(q, d, 13, color)}
    </g>
  )
}

/** 高さ（低い/高い）。玉の右上に小さな山形矢印で示す（高い=上向き2つ, 低い=下向き2つ）。 */
function HeightMark({ cx, cy, height }: { cx: number; cy: number; height: NonNullable<ShotNode['height']> }) {
  const up = height === 'high'
  const ww = 9
  const hh = 8
  const chev = (off: number) => {
    const y = cy + off
    return up ? `M${cx - ww},${y + hh} L${cx},${y} L${cx + ww},${y + hh}` : `M${cx - ww},${y} L${cx},${y + hh} L${cx + ww},${y}`
  }
  return (
    <g>
      <path d={chev(0)} fill="none" stroke="#ffe14d" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={chev(9)} fill="none" stroke="#ffe14d" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

/**
 * 回転ベクトル・バッジ。玉に巻きつく矢印で回転を表す（下回転=縦の輪が上を通る等）。
 * 上下回転=縦長の輪、横回転=横長の輪、複合=斜めの輪。回転方向にアニメで回る。
 * 回転量: 強いほど輪が大きく速く回る。
 */
function SpinBadge({ cx, cy, spin, hand, amount }: { cx: number; cy: number; spin: NonNullable<ShotNode['spin']>; hand: 'right' | 'left'; amount: ShotNode['spinAmount'] }) {
  const v = SPIN_VECTOR[spin]
  const side = hand === 'left' ? -v.x : v.x // +1 順横, -1 逆横
  const vert = v.y // -1 上回転, +1 下回転
  const rad = (d: number) => (d * Math.PI) / 180
  const R = BALL_R + 8 + (amount === 'strong' ? 4 : amount === 'weak' ? -2 : 0)
  const sw = 3.5 * (amount === 'strong' ? 1.4 : amount === 'weak' ? 0.85 : 1)
  const dur = amount === 'strong' ? '1.05s' : amount === 'weak' ? '2.6s' : '1.7s'

  let sx = 1
  let sy = 1
  let tilt = 0
  if (vert !== 0 && side === 0) {
    sx = 0.5
  } else if (side !== 0 && vert === 0) {
    sy = 0.5
  } else {
    sx = 0.6
    tilt = side > 0 ? -40 : 40
  }
  const dir = Math.abs(vert) > Math.abs(side) || side === 0 ? (vert > 0 ? -1 : 1) : side > 0 ? 1 : -1

  const startDeg = -90
  const endDeg = startDeg + dir * 300
  const s = { x: R * Math.cos(rad(startDeg)), y: R * Math.sin(rad(startDeg)) }
  const e = { x: R * Math.cos(rad(endDeg)), y: R * Math.sin(rad(endDeg)) }
  const sweep = dir > 0 ? 1 : 0
  const t = dir > 0 ? { x: -Math.sin(rad(endDeg)), y: Math.cos(rad(endDeg)) } : { x: Math.sin(rad(endDeg)), y: -Math.cos(rad(endDeg)) }
  const nrm = { x: -t.y, y: t.x }
  const hl = 11
  const hw = 7.5
  const tip = { x: e.x + t.x * hl, y: e.y + t.y * hl }
  const b1 = { x: e.x + nrm.x * hw, y: e.y + nrm.y * hw }
  const b2 = { x: e.x - nrm.x * hw, y: e.y - nrm.y * hw }

  return (
    <g transform={`translate(${cx},${cy}) rotate(${tilt}) scale(${sx},${sy})`}>
      <g>
        <path d={`M${s.x},${s.y} A${R},${R} 0 1 ${sweep} ${e.x},${e.y}`} fill="none" stroke="#ffffff" strokeWidth={sw} strokeLinecap="round" />
        <path d={`M${tip.x},${tip.y} L${b1.x},${b1.y} L${b2.x},${b2.y} Z`} fill="#ffffff" />
        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 0 0" to={`${dir * 360} 0 0`} dur={dur} repeatCount="indefinite" />
      </g>
    </g>
  )
}

export function MiniCourt({ trail, hands, w, h }: { trail: ShotNode[]; hands: Hands; w: number; h: number }) {
  const node = trail[trail.length - 1]
  const me = node.player === 'me'
  const color = me ? ME_COLOR : OPP_COLOR

  const segs = trail.map((n, i) => {
    const from = fromPoint(n, i > 0 ? trail[i - 1] : null, hands)
    const to = zoneCenter(n.zone, hands)
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const hand = n.player === 'me' ? hands.me : hands.opp
    // 回転量ぶんだけ弾道が曲がる
    const dir = curveDirOnScreen(n.spin, n.player, hand)
    const bend = dir * Math.min(70, len * 0.28) * spinAmountScale(n.spinAmount)
    const mx = (from.x + to.x) / 2 + (-dy / len) * bend
    const my = (from.y + to.y) / 2 + (dx / len) * bend
    return { n, from, to, mx, my, isLast: i === trail.length - 1 }
  })

  const last = segs[segs.length - 1]

  return (
    <svg x={0} y={0} width={w} height={h} viewBox={`0 0 ${TABLE_W} ${TABLE_H}`} preserveAspectRatio="none">
      <rect x={2} y={2} width={TABLE_W - 4} height={TABLE_H - 4} rx={10} fill={TABLE_COLOR} />
      <line x1={TABLE_W / 2} y1={COURT_H} x2={TABLE_W / 2} y2={TABLE_H - 4} stroke="#ffffff" strokeWidth={1.5} opacity={0.3} />
      <line x1={4} y1={COURT_H} x2={TABLE_W - 4} y2={COURT_H} stroke="#ffffff" strokeWidth={4} opacity={0.85} />

      {/* 過去の軌道（残像） */}
      {segs
        .filter((s) => !s.isLast)
        .map((s, i) => (
          <g key={`g${i}`} opacity={0.22}>
            <path d={`M${s.from.x},${s.from.y} Q${s.mx},${s.my} ${s.to.x},${s.to.y}`} fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" />
            <circle cx={s.to.x} cy={s.to.y} r={9} fill="#ffffff" />
          </g>
        ))}

      {/* 最後の1球（濃く）＋弾道/高さ/回転 */}
      {last && (
        <g>
          <path d={`M${last.from.x},${last.from.y} Q${last.mx},${last.my} ${last.to.x},${last.to.y}`} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
          <BounceTail from={{ x: last.mx, y: last.my }} to={last.to} depth={node.zone.depth} color={color} />
          <circle cx={last.to.x} cy={last.to.y} r={BALL_R} fill={color} stroke={me ? '#1d5fa8' : '#fff'} strokeWidth={3} />
          {node.height && <HeightMark cx={last.to.x + BALL_R + 26} cy={last.to.y - BALL_R - 20} height={node.height} />}
          {node.spin && node.spin !== 'none' && <SpinBadge cx={last.to.x} cy={last.to.y} spin={node.spin} hand={me ? hands.me : hands.opp} amount={node.spinAmount} />}
        </g>
      )}
    </svg>
  )
}
