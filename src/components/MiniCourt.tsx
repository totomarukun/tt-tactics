import { curveDirOnScreen, spinAmountScale } from '../domain/spin'
import type { Hands, ShotNode } from '../domain/types'
import { COURT_H, TABLE_H, TABLE_W, serveOrigin, zoneCenter } from '../domain/zone'
import { ME_COLOR, OPP_COLOR } from './TableDiagram'

// 分岐マップのノード用ミニコート。1球分の軌道（親ゾーン→このノードのゾーン）を
// 青い台の上に描く。回転で少し弧を描く。ネイティブ座標(300x540)で描き、呼び出し側で縮小。

const TABLE_COLOR = '#1d5fa8'

export function MiniCourt({ node, parent, hands, w, h }: { node: ShotNode; parent: ShotNode | null; hands: Hands; w: number; h: number }) {
  const me = node.player === 'me'
  const color = me ? ME_COLOR : OPP_COLOR
  const to = zoneCenter(node.zone, hands)
  // 出発点: 親の着地点。サーブ（親なし）は自コート下端から。
  const from = parent
    ? zoneCenter(parent.zone, hands)
    : node.stroke === 'serve' && node.serveFrom
      ? { x: serveOrigin(node.serveFrom, hands).x, y: TABLE_H - 6 }
      : { x: to.x, y: TABLE_H - 6 }

  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const hand = me ? hands.me : hands.opp
  const dir = curveDirOnScreen(node.spin, node.player, hand)
  const bend = dir * Math.min(70, len * 0.28) * spinAmountScale(node.spinAmount)
  const mx = (from.x + to.x) / 2 + (-dy / len) * bend
  const my = (from.y + to.y) / 2 + (dx / len) * bend

  return (
    <svg x={0} y={0} width={w} height={h} viewBox={`0 0 ${TABLE_W} ${TABLE_H}`} preserveAspectRatio="none">
      <rect x={2} y={2} width={TABLE_W - 4} height={TABLE_H - 4} rx={10} fill={TABLE_COLOR} />
      {/* センターライン（自コート側のサーブ基準）＆ネット */}
      <line x1={TABLE_W / 2} y1={COURT_H} x2={TABLE_W / 2} y2={TABLE_H - 4} stroke="#ffffff" strokeWidth={1.5} opacity={0.35} />
      <line x1={4} y1={COURT_H} x2={TABLE_W - 4} y2={COURT_H} stroke="#ffffff" strokeWidth={4} opacity={0.85} />
      {/* 軌道 */}
      <path d={`M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" opacity={0.95} />
      {/* 着地点 */}
      <circle cx={to.x} cy={to.y} r={15} fill={color} stroke={me ? '#1d5fa8' : '#fff'} strokeWidth={3} />
    </svg>
  )
}
