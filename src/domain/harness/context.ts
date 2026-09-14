import { KNOWLEDGE_CHAPTERS, type Chapter } from '../knowledge'
import type { Settings, Situation } from '../types'

// ハーネスの Guide（文脈組み立て）。タスクに関係する知識だけを優先的に渡し、
// トークン量と 429 を抑える。全部を毎回送らない。

export type TaskKind = 'propose-tactics' | 'followup' | 'verify-tactics' | 'drills' | 'verify-drills'

const num = (file: string): number => parseInt(file.slice(0, 2), 10) || 99

// タスクごとに使う章番号（01=サーブ3球目, 02=レシーブ, 03=ラリー, 04=相手タイプ, 05=練習, 06=試合運び）
const CHAPTERS_FOR: Record<TaskKind, number[]> = {
  'propose-tactics': [1, 2, 3, 4, 6],
  followup: [1, 2, 3, 4, 6],
  'verify-tactics': [1, 2, 3, 4],
  drills: [1, 2, 3, 5],
  'verify-drills': [5, 1, 2, 3],
}

// 相手タイプの語が文脈にあるときだけ相手タイプ章を足す（proposal 以外の節約用）
const OPPONENT_HINTS = ['カット', '粒', '異質', 'ペン', '左', '前陣', '速攻', 'ブロック', 'パワー', '守備']

interface AssembleOpts {
  kind: TaskKind
  situation?: Situation
  tags?: string[]
  request?: string
}

function pick(opts: AssembleOpts): Chapter[] {
  const want = new Set(CHAPTERS_FOR[opts.kind])
  // サーブ戦術ならレシーブ章の比重を下げてもよいが、両方残す（分岐に相手サーブは出ない前提でないため）
  const hintText = `${opts.tags?.join(' ') ?? ''} ${opts.request ?? ''}`
  if (opts.kind === 'drills' && OPPONENT_HINTS.some((h) => hintText.includes(h))) want.add(4)
  return KNOWLEDGE_CHAPTERS.filter((c) => want.has(num(c.file)))
}

function stripSources(md: string): string {
  const idx = md.search(/\n#{1,3}\s*(参考|参照|出典|ソース|Sources|References)/i)
  return idx > 0 ? md.slice(0, idx).trimEnd() : md
}

/** タスクに応じた知識ブロックを組み立てる（コーチ方針は常に最優先で末尾に付ける） */
export function assembleKnowledge(settings: Settings, opts: AssembleOpts): string {
  const parts = pick(opts).map((c) => stripSources(c.text))
  if (settings.coachNotes?.trim()) {
    parts.push(`# 選手・指導者からの追加知識と方針（最優先で尊重する）\n\n${settings.coachNotes.trim()}`)
  }
  if (parts.length === 0) return ''
  return `

【コーチの知識ベース（このタスクに関係する章）】
以下は指導理論・戦術・練習法の知識ベースです。提案・判断はこの知識に基づき、根拠となる原則を短く添えてください。知識ベースと一般的な知識が食い違う場合は知識ベースを優先します。選手からの追加知識と方針があれば、それを最優先します。

${parts.join('\n\n---\n\n')}`
}

/** どの章が選ばれるか（UI 表示・デバッグ用） */
export function chaptersFor(opts: AssembleOpts): string[] {
  return pick(opts).map((c) => c.title)
}
