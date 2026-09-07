import type { Col, Depth, Hands, Side, Zone } from './types'

export const COLS: Col[] = ['F', 'M', 'B']
export const DEPTHS: Depth[] = ['S', 'H', 'L']

// SVG 座標系。台は 300 x 540（実寸比 1525:2740 にほぼ一致）
export const TABLE_W = 300
export const TABLE_H = 540
export const COURT_H = 270
export const COL_W = 100
export const ROW_H = 90
export const SERVE_Y = 562 // サーブの出発点（台の下）

export const COL_LABEL: Record<Col, string> = { F: 'フォア', M: 'ミドル', B: 'バック' }
export const DEPTH_LABEL: Record<Depth, string> = { S: '前', H: 'ハーフ', L: '奥' }
export const DEPTH_LONG_LABEL: Record<Depth, string> = {
  S: 'ショート（2バウンド）',
  H: 'ハーフロング',
  L: 'ロング',
}
export const SIDE_LABEL: Record<Side, string> = { me: '自分', opp: '相手' }

export function zoneKey(z: Zone): string {
  return `${z.side}-${z.col}-${z.depth}`
}

export function zoneLabel(z: Zone): string {
  return `${SIDE_LABEL[z.side]}${COL_LABEL[z.col]}${DEPTH_LABEL[z.depth]}`
}

export function zoneShortLabel(z: Zone): string {
  return `${COL_LABEL[z.col]}${DEPTH_LABEL[z.depth]}`
}

export function opposite(side: Side): Side {
  return side === 'me' ? 'opp' : 'me'
}

/** 列の描画位置（0=左, 2=右）。自分は手前から、相手は向かい合った視点。 */
export function colIndex(col: Col, side: Side, hands: Hands): number {
  const base = side === 'me' ? { B: 0, M: 1, F: 2 }[col] : { F: 0, M: 1, B: 2 }[col]
  const hand = side === 'me' ? hands.me : hands.opp
  return hand === 'right' ? base : 2 - base
}

function colFromIndex(idx: number, side: Side, hands: Hands): Col {
  const hand = side === 'me' ? hands.me : hands.opp
  const base = hand === 'right' ? idx : 2 - idx
  const order: Col[] = side === 'me' ? ['B', 'M', 'F'] : ['F', 'M', 'B']
  return order[base]
}

/** 台全体で上から数えた行番号（0..5） */
export function rowIndex(depth: Depth, side: Side): number {
  if (side === 'opp') return { L: 0, H: 1, S: 2 }[depth]
  return { S: 3, H: 4, L: 5 }[depth]
}

function depthFromRow(row: number): { side: Side; depth: Depth } {
  const table: { side: Side; depth: Depth }[] = [
    { side: 'opp', depth: 'L' },
    { side: 'opp', depth: 'H' },
    { side: 'opp', depth: 'S' },
    { side: 'me', depth: 'S' },
    { side: 'me', depth: 'H' },
    { side: 'me', depth: 'L' },
  ]
  return table[row]
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function zoneRect(z: Zone, hands: Hands): Rect {
  return {
    x: colIndex(z.col, z.side, hands) * COL_W,
    y: rowIndex(z.depth, z.side) * ROW_H,
    w: COL_W,
    h: ROW_H,
  }
}

export function zoneCenter(z: Zone, hands: Hands): { x: number; y: number } {
  const r = zoneRect(z, hands)
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

export function zoneFromPoint(x: number, y: number, hands: Hands): Zone | null {
  if (x < 0 || x >= TABLE_W || y < 0 || y >= TABLE_H) return null
  const row = Math.floor(y / ROW_H)
  const idx = Math.floor(x / COL_W)
  const { side, depth } = depthFromRow(row)
  return { side, col: colFromIndex(idx, side, hands), depth }
}

export function serveOrigin(col: Col, hands: Hands): { x: number; y: number } {
  return { x: colIndex(col, 'me', hands) * COL_W + COL_W / 2, y: SERVE_Y }
}

export function allZones(): Zone[] {
  const out: Zone[] = []
  for (const side of ['opp', 'me'] as Side[])
    for (const depth of DEPTHS) for (const col of COLS) out.push({ side, col, depth })
  return out
}
