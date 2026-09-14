import type { TacticOutcome } from './types'

// 上達ループの Sensor。試合結果を集計し、戦術の「実績」と自信度を証拠ベースで導く。

export interface OutcomeStats {
  tried: number
  won: number
  even: number
  lost: number
  /** 決まった率（won /（won+lost）。五分は分母から除く）。試行なしは null */
  winRate: number | null
  lastDate: string | null
}

export function statsFor(tacticId: string, outcomes: TacticOutcome[]): OutcomeStats {
  const mine = outcomes.filter((o) => o.tacticId === tacticId)
  const won = mine.filter((o) => o.result === 'won').length
  const even = mine.filter((o) => o.result === 'even').length
  const lost = mine.filter((o) => o.result === 'lost').length
  const decisive = won + lost
  const lastDate = mine.reduce<string | null>((m, o) => (m && m > o.date ? m : o.date), null)
  return { tried: mine.length, won, even, lost, winRate: decisive > 0 ? won / decisive : null, lastDate }
}

/**
 * 実績から自信度を導く。十分な試行（3回以上）があるときだけ証拠として使う。
 * 足りなければ null（手動の自信度を尊重）。
 */
export function evidenceConfidence(stats: OutcomeStats): 1 | 2 | 3 | null {
  if (stats.tried < 3 || stats.winRate === null) return null
  if (stats.tried >= 5 && stats.winRate >= 0.7) return 3
  if (stats.winRate >= 0.5) return 2
  return 1
}

export const RESULT_LABEL: Record<TacticOutcome['result'], string> = {
  won: '決まった',
  even: '五分',
  lost: '効かなかった',
}

// 崩れ方・敗因タグ（リサーチ 04-postmatch-reflection の推奨: 局面×崩れ方の10個。動詞入りで練習/戦術へ橋渡し）
export const FAILURE_TAGS = [
  'サーブで先手を取れず',
  'レシーブでミス・浮かせた',
  '3球目を打ち急いだ',
  'つなぎが甘くなった',
  '決め球を焦った',
  '戦術が単調・選択ミス',
  'リードで守って逆転された',
  '競り合いで崩れた',
  '後半に切れた',
  '相手の戦型・回転に対応できず',
]

/** 崩れ方タグの頻度を集計（多い順）。lost/even を主対象に全結果から集める */
export function failureTagCounts(outcomes: TacticOutcome[]): { tag: string; count: number }[] {
  const m = new Map<string, number>()
  for (const o of outcomes) for (const t of o.failureTags ?? []) m.set(t, (m.get(t) ?? 0) + 1)
  return [...m.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
}
export const RESULT_MARK: Record<TacticOutcome['result'], string> = { won: '◎', even: '△', lost: '✕' }

/** カード等に出す一言。試行なしは「未実戦」 */
export function evidenceLabel(stats: OutcomeStats): string {
  if (stats.tried === 0) return '未実戦'
  if (stats.winRate === null) return `${stats.tried}回試行`
  return `${Math.round(stats.winRate * 100)}% 決まる（${stats.won}/${stats.won + stats.lost}）`
}
