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

/** 3x3 ピッカーの並び。上段=上回転。右列=順横（右利きの打者から見て右に曲がる）、左列=逆横 */
export const SPIN_GRID: Spin[][] = [
  ['top_rev', 'top', 'top_fwd'],
  ['side_rev', 'none', 'side_fwd'],
  ['under_rev', 'under', 'under_fwd'],
]

/**
 * 矢印の向き。y: -1=上回転 / +1=下回転。
 * x は右利きの打者から見た曲がる方向。+1=順横（右へ曲がる）、-1=逆横（左へ曲がる）。
 * 左利きの打者は左右反転する。
 */
export const SPIN_VECTOR: Record<Spin, { x: number; y: number }> = {
  top_fwd: { x: 1, y: -1 },
  top: { x: 0, y: -1 },
  top_rev: { x: -1, y: -1 },
  side_fwd: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
  side_rev: { x: -1, y: 0 },
  under_fwd: { x: 1, y: 1 },
  under: { x: 0, y: 1 },
  under_rev: { x: -1, y: 1 },
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

export const HEIGHT_LABEL = { low: '低い', high: '高い' } as const

/** 打者から見た曲がる方向を画面上の x 方向（+1=右）に変換する */
export function curveDirOnScreen(spin: Spin | undefined, player: 'me' | 'opp', hand: 'right' | 'left'): number {
  if (!spin) return 0
  let x = SPIN_VECTOR[spin].x
  if (hand === 'left') x = -x
  if (player === 'opp') x = -x // 向かい合っているので左右が逆
  return x
}
