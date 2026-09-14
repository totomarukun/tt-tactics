import { failureTagCounts, statsFor } from './outcome'
import type { Focus, Tactic, TacticOutcome } from './types'
import { weekStart } from './week'

// 今週の焦点。研究06: 失点から逆算して1〜2個に絞る。3個目は止める。手を広げない。

export const MAX_FOCUS = 2

export function currentFocuses(focuses: Focus[], now = new Date()): Focus[] {
  const wk = weekStart(now)
  return focuses.filter((f) => f.week === wk).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}

export interface FocusSuggestion {
  title: string
  note: string
  tacticId?: string
}

/** 試合の崩れ方・弱い戦術から「今週やる焦点」を提案する（多くて3件） */
export function suggestFocuses(tactics: Tactic[], outcomes: TacticOutcome[]): FocusSuggestion[] {
  const out: FocusSuggestion[] = []
  // 1) 最も多い崩れ方
  const fails = failureTagCounts(outcomes)
  if (fails[0] && fails[0].count >= 2) {
    out.push({ title: `「${fails[0].tag}」を減らす`, note: `直近で ${fails[0].count} 回あった崩れ方。ここを埋める練習に絞る。` })
  }
  // 2) 効いていない戦術を安定させる
  const weak = tactics
    .filter((t) => t.root)
    .map((t) => ({ t, s: statsFor(t.id, outcomes) }))
    .filter((r) => r.s.tried >= 2 && r.s.winRate !== null && r.s.winRate < 0.5)
    .sort((a, b) => (a.s.winRate ?? 0) - (b.s.winRate ?? 0))[0]
  if (weak) out.push({ title: `「${weak.t.title}」を安定させる`, note: '試合で決まっていない展開。反復して精度を上げる。', tacticId: weak.t.id })
  // 3) 効いている戦術を武器にする
  const strong = tactics
    .filter((t) => t.root)
    .map((t) => ({ t, s: statsFor(t.id, outcomes) }))
    .filter((r) => r.s.tried >= 2 && r.s.winRate !== null && r.s.winRate >= 0.6)
    .sort((a, b) => (b.s.winRate ?? 0) - (a.s.winRate ?? 0))[0]
  if (strong) out.push({ title: `「${strong.t.title}」を武器にする`, note: '効いている展開。派生パターンを足して確実な得点源にする。', tacticId: strong.t.id })
  // 4) データが無いとき
  if (out.length === 0) {
    out.push({ title: 'サーブから3球目で先手を取る', note: '中級の基本。得意サーブ→3球目のパターンを反復する。' })
    out.push({ title: 'ミドルを突いて崩す', note: '中級はミドル攻めが低リスク高効果。狙いを固定して反復する。' })
  }
  return out.slice(0, 3)
}
