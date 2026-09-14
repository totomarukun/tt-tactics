import type { Cue, CueCategory } from './types'

// 意識キュー（研究08）。今意識していることを技術/戦術に分けて短く。各カテゴリ最大3件。1動作1言。

export const MAX_CUE = 3

export const CUE_CATEGORY_LABEL: Record<CueCategory, string> = { tech: '技術', tactic: '戦術' }

// タップで足せる定型（「◯◯のとき△△する」寄りの短文）。書くより選ぶ。
export const CUE_PRESETS: Record<CueCategory, string[]> = {
  tech: ['バックは前目で振る', '手首を使いすぎない', '体重移動で打つ', 'フォアは体の前で捉える', '力まず当てる', '打点を落とさない'],
  tactic: ['迷ったらミドルを突く', 'つなぎは深く低く', 'サーブは2種類を混ぜる', '3球目は決めにいく', '同じコースに固執しない', 'リードでも攻める'],
}

export function activeCues(cues: Cue[], category: CueCategory): Cue[] {
  return cues.filter((c) => c.category === category && !c.retired).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}

export function retiredCues(cues: Cue[]): Cue[] {
  return cues.filter((c) => c.retired).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

/** そのカテゴリがもう追加できない（3件）か */
export function cueFull(cues: Cue[], category: CueCategory): boolean {
  return activeCues(cues, category).length >= MAX_CUE
}

/** 一定日数（既定14日）更新のない現役キュー = 見直しどき */
export function staleCues(cues: Cue[], days = 14, now = Date.now()): Cue[] {
  const cutoff = now - days * 86400000
  return cues.filter((c) => !c.retired && new Date(c.updatedAt).getTime() < cutoff)
}
