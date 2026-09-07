import type { Grip, PlayerProfile, Rubber, Settings } from './types'

export const GRIP_LABEL: Record<Grip, string> = { shake: 'シェークハンド', pen_jp: '日本式ペン', pen_cn: '中国式ペン' }
export const RUBBER_LABEL: Record<Rubber, string> = { inverted: '裏ソフト', short_pips: '表ソフト', long_pips: '粒高', anti: 'アンチ' }

export const STYLE_OPTIONS = ['両ハンドドライブ', '前陣速攻', 'フォア主戦', 'バック主戦', '中陣ドライブ', 'カット主戦', '異質攻守', 'ブロック主体']
export const STRENGTH_OPTIONS = [
  'フォアドライブの威力',
  'バックドライブの安定',
  'チキータ',
  'サーブの回転量',
  'サーブの出し分け',
  'ストップ・台上処理',
  'ブロック',
  'カウンター',
  'フットワーク',
  'ラリーの粘り',
  'スマッシュ',
  'コース取り',
]
export const WEAKNESS_OPTIONS = [
  'レシーブ（横回転）',
  'レシーブ（下回転）',
  'ミドル処理',
  'フォア側の飛びつき',
  'バックの威力',
  '台上処理',
  '相手の強打への対応',
  '3球目の決定力',
  'ラリーが長くなると負ける',
  'サーブが読まれる',
  'つなぎ球の質',
  'メンタル（競った場面）',
]
export const SERVE_OPTIONS = ['フォア下回転', 'フォア横回転', 'YG', '巻き込み', 'バックサーブ', 'しゃがみ込み', 'ロングサーブ', 'ナックル']
export const TROUBLE_OPTIONS = ['カットマン', '前陣速攻', '左利き', '粒高・異質', 'ペンホルダー', '守備型（ブロック）', 'パワーヒッター', 'サーブが上手い相手']
export const LEVEL_OPTIONS = ['初級', '中級', '上級（市大会入賞）', '上級（県大会以上）']

export const EMPTY_PROFILE: PlayerProfile = {
  styles: [],
  strengths: [],
  weaknesses: [],
  serves: [],
  troubles: [],
  goals: '',
}

/** 設定から AI に渡すプロフィール文を組み立てる */
export function profileToText(settings: Settings): string {
  const p = settings.profile ?? EMPTY_PROFILE
  const lines = [
    `利き手: ${settings.myHand === 'left' ? '左' : '右'}`,
    p.grip ? `グリップ: ${GRIP_LABEL[p.grip]}` : '',
    p.foreRubber || p.backRubber
      ? `ラバー: フォア ${p.foreRubber ? RUBBER_LABEL[p.foreRubber] : '不明'} / バック ${p.backRubber ? RUBBER_LABEL[p.backRubber] : '不明'}`
      : '',
    p.level ? `レベル: ${p.level}` : '',
    p.styles.length ? `戦型: ${p.styles.join('、')}` : '',
    p.strengths.length ? `強み: ${p.strengths.join('、')}` : '',
    p.weaknesses.length ? `弱み: ${p.weaknesses.join('、')}` : '',
    p.serves.length ? `得意サーブ: ${p.serves.join('、')}` : '',
    p.troubles.length ? `苦手な相手: ${p.troubles.join('、')}` : '',
    p.goals.trim() ? `目指すプレー・願望: ${p.goals.trim()}` : '',
    settings.playerProfile?.trim() ? `補足: ${settings.playerProfile.trim()}` : '',
  ].filter(Boolean)
  if (lines.length <= 1) lines.push('戦型: シェークハンド両ハンドドライブ型（詳細未入力）')
  return lines.join('\n')
}

export function profileIsFilled(settings: Settings): boolean {
  const p = settings.profile
  return !!p && (p.styles.length > 0 || p.strengths.length > 0 || p.goals.trim().length > 0)
}
