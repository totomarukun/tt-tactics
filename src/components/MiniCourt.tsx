import { SPIN_VECTOR, curveDirOnScreen, spinAmountScale } from '../domain/spin'
import type { Hands, ShotNode, Zone } from '../domain/types'
import { colIndex, rowIndex } from '../domain/zone'
import { ME_COLOR, OPP_COLOR } from './TableDiagram'

// 分岐マップのノード用ミニコート（奥行きパース）。
// 弾道の矢印そのもので区別する: 弧の高さ=ボールの高さ / 着地の位置=コース・長さ / 曲がり=横回転。
// 玉には回転の巻きつき矢印。補足記号は使わない。ネイティブ座標(300x240)で描き縮小。

const TABLE_COLOR = '#1d5fa8'
const BALL_R = 13
const NW = 300
const NH = 240
const NEAR_Y = 206 // 手前(自分)ベースライン
const FAR_Y = 40 // 奥(相手)ベースライン
const NEAR_HW = 138 // 手前の半幅
const FAR_HW = 108 // 奥の半幅（パースは緩め＝弾道を読みやすく）
const CENTER = 150

type Pt = { x: number; y: number }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ゾーン → 台上のパース座標。row 0(相手奥)…5(自分奥)
function surfPt(zone: Zone, hands: Hands): Pt {
  const row = rowIndex(zone.depth, zone.side)
  const t = 1 - (row + 0.5) / 6 // t=1 奥/上, t=0 手前/下
  const y = lerp(NEAR_Y, FAR_Y, t)
  const hw = lerp(NEAR_HW, FAR_HW, t)
  const ci = colIndex(zone.col, zone.side, hands) // 0..2 左→右
  return { x: CENTER + (ci - 1) * ((hw * 2) / 3), y }
}

function serveSurf(col: Zone['col'] | undefined, hands: Hands): Pt {
  const ci = col ? colIndex(col, 'me', hands) : 1
  return { x: CENTER + (ci - 1) * ((NEAR_HW * 2) / 3), y: NEAR_Y + 18 }
}

function arrowHead(at: Pt, d: Pt, size: number, color: string) {
  const n = { x: -d.y, y: d.x }
  const tip = { x: at.x + d.x * size, y: at.y + d.y * size }
  const b1 = { x: at.x + n.x * size * 0.6, y: at.y + n.y * size * 0.6 }
  const b2 = { x: at.x - n.x * size * 0.6, y: at.y - n.y * size * 0.6 }
  return <path d={`M${tip.x},${tip.y} L${b1.x},${b1.y} L${b2.x},${b2.y} Z`} fill={color} />
}

/**
 * 回転ベクトル・バッジ。玉に巻きつく矢印で回転を表す。
 * 「打った人から見た回転」にするため、バッジの向きを進行方向に合わせる
 * （進行方向=ローカル上。自分の打球は上へ・相手の打球は下へ進むので自動で視点が反転）。
 * 上下回転=進行方向に沿う縦の輪（上回転=前へ巻く/下回転=後ろへ巻く）、
 * 横回転=進行方向に直交する横の輪（順横=時計回り/逆横=反時計回り）、複合=斜め。
 * 回転量が強いほど大きく速く回る。
 */
function SpinBadge({ cx, cy, spin, hand, amount, dx, dy }: { cx: number; cy: number; spin: NonNullable<ShotNode['spin']>; hand: 'right' | 'left'; amount: ShotNode['spinAmount']; dx: number; dy: number }) {
  const v = SPIN_VECTOR[spin]
  const side = hand === 'left' ? -v.x : v.x
  const vert = v.y
  const rad = (d: number) => (d * Math.PI) / 180
  const R = BALL_R + 8 + (amount === 'strong' ? 4 : amount === 'weak' ? -2 : 0)
  const sw = 3.2 * (amount === 'strong' ? 1.4 : amount === 'weak' ? 0.85 : 1)
  const dur = amount === 'strong' ? '1.05s' : amount === 'weak' ? '2.6s' : '1.7s'
  // 進行方向をローカル上(-Y)に合わせる回転角
  const travelDeg = (Math.atan2(dx, -dy) * 180) / Math.PI

  let sx = 1
  let sy = 1
  let tilt = 0
  if (vert !== 0 && side === 0) sx = 0.5 // 上下回転=縦の輪（進行方向に沿う）
  else if (side !== 0 && vert === 0) sy = 0.5 // 横回転=横の輪
  else {
    sx = 0.6
    tilt = side > 0 ? -40 : 40
  }
  // ローカル基準の回る向き: 上回転=前へ巻く(時計) / 下回転=後ろへ巻く(反時計) / 順横=時計 / 逆横=反時計
  const dir = Math.abs(vert) > Math.abs(side) || side === 0 ? (vert < 0 ? 1 : -1) : side > 0 ? 1 : -1

  const startDeg = -90
  const endDeg = startDeg + dir * 300
  const s = { x: R * Math.cos(rad(startDeg)), y: R * Math.sin(rad(startDeg)) }
  const e = { x: R * Math.cos(rad(endDeg)), y: R * Math.sin(rad(endDeg)) }
  const sweep = dir > 0 ? 1 : 0
  const t = dir > 0 ? { x: -Math.sin(rad(endDeg)), y: Math.cos(rad(endDeg)) } : { x: Math.sin(rad(endDeg)), y: -Math.cos(rad(endDeg)) }
  const nrm = { x: -t.y, y: t.x }
  const tip = { x: e.x + t.x * 10, y: e.y + t.y * 10 }
  const b1 = { x: e.x + nrm.x * 7, y: e.y + nrm.y * 7 }
  const b2 = { x: e.x - nrm.x * 7, y: e.y - nrm.y * 7 }

  return (
    <g transform={`translate(${cx},${cy}) rotate(${travelDeg})`}>
      <g transform={`rotate(${tilt}) scale(${sx},${sy})`}>
        <g>
          <path d={`M${s.x},${s.y} A${R},${R} 0 1 ${sweep} ${e.x},${e.y}`} fill="none" stroke="#ffffff" strokeWidth={sw} strokeLinecap="round" />
          <path d={`M${tip.x},${tip.y} L${b1.x},${b1.y} L${b2.x},${b2.y} Z`} fill="#ffffff" />
          <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 0 0" to={`${dir * 360} 0 0`} dur={dur} repeatCount="indefinite" />
        </g>
      </g>
    </g>
  )
}

export function MiniCourt({ trail, hands, w, h }: { trail: ShotNode[]; hands: Hands; w: number; h: number }) {
  const node = trail[trail.length - 1]
  const me = node.player === 'me'
  const color = me ? ME_COLOR : OPP_COLOR

  const netY = lerp(NEAR_Y, FAR_Y, 0.5)
  const netHW = lerp(NEAR_HW, FAR_HW, 0.5)

  const segs = trail.map((n, i) => {
    const from = i > 0 ? surfPt(trail[i - 1].zone, hands) : serveSurf(n.serveFrom, hands)
    const to = surfPt(n.zone, hands)
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const hand = n.player === 'me' ? hands.me : hands.opp
    // 横回転で弧が横に膨らむ（回転量で強弱）
    const sb = curveDirOnScreen(n.spin, n.player, hand) * Math.min(42, len * 0.32) * spinAmountScale(n.spinAmount)
    // 高さで弧の山の高さが変わる（弾道の矢印だけで高さが分かる。メリハリ強め）
    const lift = n.height === 'high' ? 82 : n.height === 'low' ? 16 : 44
    const cx = (from.x + to.x) / 2 + sb
    const cy = Math.max(8, (from.y + to.y) / 2 - lift)
    return { n, from, to, cx, cy, isLast: i === trail.length - 1 }
  })
  const last = segs[segs.length - 1]

  return (
    <svg x={0} y={0} width={w} height={h} viewBox={`0 0 ${NW} ${NH}`} preserveAspectRatio="none">
      {/* 台（パース台形） */}
      <path
        d={`M${CENTER - NEAR_HW},${NEAR_Y} L${CENTER + NEAR_HW},${NEAR_Y} L${CENTER + FAR_HW},${FAR_Y} L${CENTER - FAR_HW},${FAR_Y} Z`}
        fill={TABLE_COLOR}
        stroke="#ffffff"
        strokeWidth={2}
        strokeOpacity={0.5}
      />
      {/* センターライン（サーブ基準・奥行き感） */}
      <line x1={CENTER} y1={NEAR_Y} x2={CENTER} y2={FAR_Y} stroke="#ffffff" strokeWidth={1.5} opacity={0.28} />
      {/* ネット */}
      <rect x={CENTER - netHW} y={netY - 16} width={netHW * 2} height={16} fill="#ffffff" opacity={0.22} />
      <line x1={CENTER - netHW} y1={netY} x2={CENTER + netHW} y2={netY} stroke="#ffffff" strokeWidth={3} opacity={0.9} />

      {/* 過去の弾道（残像） */}
      {segs
        .filter((s) => !s.isLast)
        .map((s, i) => (
          <path key={`g${i}`} d={`M${s.from.x},${s.from.y} Q${s.cx},${s.cy} ${s.to.x},${s.to.y}`} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.2} />
        ))}

      {/* 今の1球：弾道の弧＋着地の玉＋回転 */}
      {last && (
        <g>
          {/* 台上の影（弧の高さを分かりやすく） */}
          <line x1={last.from.x} y1={last.from.y} x2={last.to.x} y2={last.to.y} stroke="#0d2b52" strokeWidth={3} strokeLinecap="round" opacity={0.35} />
          <path d={`M${last.from.x},${last.from.y} Q${last.cx},${last.cy} ${last.to.x},${last.to.y}`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
          {arrowHead(last.to, { x: (last.to.x - last.cx) / (Math.hypot(last.to.x - last.cx, last.to.y - last.cy) || 1), y: (last.to.y - last.cy) / (Math.hypot(last.to.x - last.cx, last.to.y - last.cy) || 1) }, 13, color)}
          <circle cx={last.to.x} cy={last.to.y} r={BALL_R} fill={color} stroke={me ? '#1d5fa8' : '#fff'} strokeWidth={2.5} />
          {node.spin && node.spin !== 'none' && (
            <SpinBadge
              cx={last.to.x}
              cy={last.to.y}
              spin={node.spin}
              hand={me ? hands.me : hands.opp}
              amount={node.spinAmount}
              dx={(last.to.x - last.from.x) / (Math.hypot(last.to.x - last.from.x, last.to.y - last.from.y) || 1)}
              dy={(last.to.y - last.from.y) / (Math.hypot(last.to.x - last.from.x, last.to.y - last.from.y) || 1)}
            />
          )}
        </g>
      )}
    </svg>
  )
}
