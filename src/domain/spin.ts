import type { Spin } from './types'

export const SPIN_LABEL: Record<Spin, string> = {
  top_fwd: '順横上',
  top: '真上',
  top_rev: '逆横上',
  side_fwd: '順横',
  none: 'ナックル',
  side_rev: '逆横',
  under_fwd: '順横下',
  under: '真下',
  under_rev: '逆横下',
}

/** 3x3 ピッカーの並び（上段=上回転、左列=順横、右列=逆横） */
export const SPIN_GRID: Spin[][] = [
  ['top_fwd', 'top', 'top_rev'],
  ['side_fwd', 'none', 'side_rev'],
  ['under_fwd', 'under', 'under_rev'],
]

/** 矢印の向き。x: -1=順横 / +1=逆横、y: -1=上回転 / +1=下回転 */
export const SPIN_VECTOR: Record<Spin, { x: number; y: number }> = {
  top_fwd: { x: -1, y: -1 },
  top: { x: 0, y: -1 },
  top_rev: { x: 1, y: -1 },
  side_fwd: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
  side_rev: { x: 1, y: 0 },
  under_fwd: { x: -1, y: 1 },
  under: { x: 0, y: 1 },
  under_rev: { x: 1, y: 1 },
}

/** 旧データ（v0.1）の回転・サーブ種類を新形式に変換する */
export function migrateLegacySpin(spin: unknown, serveType: unknown): { spin?: Spin; serveMotion?: 'forehand' | 'backhand' | 'yg' | 'makikomi' } {
  const out: ReturnType<typeof migrateLegacySpin> = {}
  const legacySpin: Record<string, Spin> = { under: 'under', top: 'top', side: 'side_fwd', none: 'none' }
  if (typeof spin === 'string' && legacySpin[spin]) out.spin = legacySpin[spin]
  const legacyServe: Record<string, { spin: Spin; serveMotion: 'forehand' | 'backhand' | 'yg' | 'makikomi' }> = {
    under: { spin: 'under', serveMotion: 'forehand' },
    top: { spin: 'top', serveMotion: 'forehand' },
    side_r: { spin: 'side_fwd', serveMotion: 'forehand' },
    side_l: { spin: 'side_rev', serveMotion: 'forehand' },
    knuckle: { spin: 'none', serveMotion: 'forehand' },
    yg: { spin: 'side_rev', serveMotion: 'yg' },
    makikomi: { spin: 'side_rev', serveMotion: 'makikomi' },
    backhand: { spin: 'side_rev', serveMotion: 'backhand' },
  }
  if (typeof serveType === 'string' && legacyServe[serveType]) Object.assign(out, legacyServe[serveType])
  return out
}
