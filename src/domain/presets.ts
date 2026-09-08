import type { Hand, ServeMotion, Settings, ShotNode, StrokeType } from './types'
import { HEIGHT_LABEL, SPIN_AMOUNT_LABEL, SPIN_LABEL } from './spin'
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

export const SERVE_MOTION_LABEL: Record<ServeMotion, string> = {
  forehand: 'フォア',
  backhand: 'バック',
  yg: 'YG',
  makikomi: '巻き込み',
  squat: 'しゃがみ込み',
}
export const SERVE_MOTIONS = Object.keys(SERVE_MOTION_LABEL) as ServeMotion[]

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
  const spin = n.spin ? `${SPIN_LABEL[n.spin]}${n.spinAmount ? SPIN_AMOUNT_LABEL[n.spinAmount] : ''}` : ''
  if (n.stroke === 'serve') {
    const motion = n.serveMotion ? SERVE_MOTION_LABEL[n.serveMotion] : ''
    const from = n.serveFrom ? `${COL_LABEL[n.serveFrom]}から` : ''
    return [spin, `${motion}サーブ`, from].filter(Boolean).join(' ')
  }
  const hand = n.hand ?? ''
  const extra = [spin, n.height ? HEIGHT_LABEL[n.height] : ''].filter(Boolean).join('・')
  return `${hand}${STROKE_LABEL[n.stroke]}${extra ? `(${extra})` : ''}`
}

export function nodeLabel(n: ShotNode): string {
  const who = n.player === 'me' ? '自分' : '相手'
  return `${who} ${strokeText(n)} → ${zoneShortLabel(n.zone)}`
}
