import type { Hand, ServeType, Settings, ShotNode, Spin, StrokeType } from './types'
import { COL_LABEL, zoneShortLabel } from './zone'

export const STROKE_LABEL: Record<StrokeType, string> = {
  serve: 'サーブ',
  drive: 'ドライブ',
  loop: 'ループ',
  smash: 'スマッシュ',
  counter: 'カウンター',
  block: 'ブロック',
  push: 'ツッツキ',
  stop: 'ストップ',
  flick: 'フリック',
  chiquita: 'チキータ',
  lob: 'ロビング',
  chop: 'カット',
  other: 'その他',
}

export const SERVE_LABEL: Record<ServeType, string> = {
  under: '下回転',
  top: '上回転',
  side_r: '右横',
  side_l: '左横',
  knuckle: 'ナックル',
  yg: 'YG',
  makikomi: '巻き込み',
  backhand: 'バック',
}
export const SERVE_TYPES = Object.keys(SERVE_LABEL) as ServeType[]

export const SPIN_LABEL: Record<Spin, string> = {
  under: '下',
  top: '上',
  side: '横',
  none: 'ナックル',
  unknown: '不明',
}
export const SPINS: Spin[] = ['under', 'top', 'side', 'none']

export const HAND_LABEL: Record<Hand, string> = { F: 'フォア面', B: 'バック面' }

// シェーク両ハンドドライブ型の使用頻度順
export const DEFAULT_STROKE_ORDER: StrokeType[] = [
  'drive',
  'push',
  'stop',
  'flick',
  'chiquita',
  'block',
  'counter',
  'loop',
  'smash',
  'chop',
  'lob',
  'other',
]

export const DEFAULT_SETTINGS: Settings = {
  myHand: 'right',
  defaultOppHand: 'right',
  strokeOrder: DEFAULT_STROKE_ORDER,
}

export const TAG_SUGGESTIONS = ['前陣速攻', '中陣ドライブ', 'カットマン', '異質', 'ペン', '左利き']

export function strokeText(n: ShotNode): string {
  if (n.stroke === 'serve') {
    const t = n.serveType ? SERVE_LABEL[n.serveType] : ''
    const from = n.serveFrom ? `${COL_LABEL[n.serveFrom]}から` : ''
    return [t, 'サーブ', from].filter(Boolean).join(' ')
  }
  const hand = n.hand ? (n.hand === 'F' ? 'F' : 'B') : ''
  return `${hand}${STROKE_LABEL[n.stroke]}`
}

export function nodeLabel(n: ShotNode): string {
  const who = n.player === 'me' ? '自分' : '相手'
  return `${who} ${strokeText(n)} → ${zoneShortLabel(n.zone)}`
}
