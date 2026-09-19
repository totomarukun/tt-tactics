import { SPIN_VECTOR, curveDirOnScreen, spinAmountScale } from '../domain/spin'
import type { Hands, ShotNode } from '../domain/types'
import { COURT_H, TABLE_H, TABLE_W, serveOrigin, zoneCenter } from '../domain/zone'
import { ME_COLOR, OPP_COLOR } from './TableDiagram'

// 分岐マップのノード用ミニコート。root からこのノードまでの軌道を残像として薄く重ね、
// 最後の1球を濃く描く。最後の球には回転リング（順横=時計回り/逆横=反時計回り、回るアニメ）。
// ネイティブ座標(300x540)で描き、呼び出し側で縮小。

const TABLE_COLOR = '#1d5fa8'
const BALL_R = 15

type Pt = { x: number; y: number }

function fromPoint(n: ShotNode, prev: ShotNode | null, hands: Hands): Pt {
  if (prev) return zoneCenter(prev.zone, hands)
  if (n.stroke === 'serve' && n.serveFrom) return { x: serveOrigin(n.serveFrom, hands).x, y: TABLE_H - 6 }
  return { ...zoneCenter(n.zone, hands), y: TABLE_H - 6 }
}

/**
 * 回転ベクトル・バッジ。玉に巻きつく矢印で回転を表す（下回転=縦の輪が上を通る等）。
 * 上下回転=縦長の輪、横回転=横長の輪、複合=斜めの輪。回転方向にアニメで回る。
 */
function SpinBadge({ cx, cy, spin, hand, amount }: { cx: number; cy: number; spin: NonNullable<ShotNode['spin']>; hand: 'right' | 'left'; amount: ShotNode['spinAmount'] }) {
  const v = SPIN_VECTOR[spin]
  const side = hand === 'left' ? -v.x : v.x // +1 順横, -1 逆横
  const vert = v.y // -1 上回転, +1 下回転
  const rad = (d: number) => (d * Math.PI) / 180
  const R = BALL_R + 8
  const sw = 3.5 * (amount === 'strong' ? 1.35 : amount === 'weak' ? 0.85 : 1)

  // 輪の向き（scale）と傾き。縦回転=縦長の輪、横回転=横長の輪、複合=斜め。
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
  // 回る向き（画面上、角度が増える＝時計回り）
  const dir = Math.abs(vert) > Math.abs(side) || side === 0 ? (vert > 0 ? -1 : 1) : side > 0 ? 1 : -1

  // 原点中心で 300°の弧＋矢じり
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
        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 0 0" to={`${dir * 360} 0 0`} dur="1.8s" repeatCount="indefinite" />
      </g>
    </g>
  )
}

export function MiniCourt({ trail, hands, w, h }: { trail: ShotNode[]; hands: Hands; w: number; h: number }) {
  const node = trail[trail.length - 1]
  const me = node.player === 'me'
  const color = me ? ME_COLOR : OPP_COLOR

  // 各球のセグメント（from=前の着地点, to=このゾーン）
  const segs = trail.map((n, i) => {
    const from = fromPoint(n, i > 0 ? trail[i - 1] : null, hands)
    const to = zoneCenter(n.zone, hands)
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const hand = n.player === 'me' ? hands.me : hands.opp
    const dir = curveDirOnScreen(n.spin, n.player, hand)
    const bend = dir * Math.min(70, len * 0.28) * spinAmountScale(n.spinAmount)
    const mx = (from.x + to.x) / 2 + (-dy / len) * bend
    const my = (from.y + to.y) / 2 + (dx / len) * bend
    return { n, from, to, mx, my, isLast: i === trail.length - 1 }
  })

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

      {/* 最後の1球（濃く） */}
      {segs
        .filter((s) => s.isLast)
        .map((s) => (
          <g key="last">
            <path d={`M${s.from.x},${s.from.y} Q${s.mx},${s.my} ${s.to.x},${s.to.y}`} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
            <circle cx={s.to.x} cy={s.to.y} r={BALL_R} fill={color} stroke={me ? '#1d5fa8' : '#fff'} strokeWidth={3} />
            {s.n.spin && s.n.spin !== 'none' && (
              <SpinBadge cx={s.to.x} cy={s.to.y} spin={s.n.spin} hand={s.n.player === 'me' ? hands.me : hands.opp} amount={s.n.spinAmount} />
            )}
          </g>
        ))}
    </svg>
  )
}
