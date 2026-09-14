import { TACTIC_ITEM_SCHEMA, VOCAB_BLOCK, proposalToTactic, type TacticProposal } from '../aiTactics'
import type { DrillProposal } from '../ai'
import type { Citation } from '../gemini'
import { profileToText } from '../profile'
import type { Settings, Tactic } from '../types'
import { runAgent, runGrounded } from './runner'
import { verifyTactics, type TacticVerdict } from './verify'

// リサーチエージェント。Web で調べる → 戦術・練習に落とす → 審査、の多段。
// グラウンディングと構造化出力は併用できないため2回に分ける。

export interface ResearchResult {
  topic: string
  report: string // 選手向けにまとめた調査結果
  keyPoints: string[]
  citations: Citation[]
  grounded: boolean
  tactics: TacticProposal[]
  verdicts: TacticVerdict[]
  drills: DrillProposal[]
  model: string
}

export type ResearchStage = 'searching' | 'synthesizing' | 'verifying'

const RESEARCH_SYSTEM = `あなたは卓球の専門コーチ兼リサーチャーです。選手の相談（対戦相手の攻略、技術の課題、新しいサーブ、最新の戦術トレンドなど）について、Web を調べて、実戦で使える具体的な情報を集めます。

方針:
- 一般論で終わらせず、コース・回転・タイミング・練習方法まで踏み込んだ具体を集める。
- 日本の卓球メディア（卓球王国、Butterfly、VICTAS、Nittaku 等）、選手・コーチの発言、技術解説を優先。
- 相手タイプ攻略なら「特徴→弱点→サーブ→レシーブ→ラリーの狙い→やってはいけないこと」を押さえる。
- 出典を伴う事実に基づいて書く。憶測は避ける。
- 日本語で、選手に語りかける文体。`

const SYNTH_SYSTEM = `あなたは卓球コーチです。リサーチ結果と選手のプロフィールを読み、選手がすぐ使える形にまとめます。
- report: 調査の要点を選手向けに5〜8文でまとめる。
- keyPoints: 実戦で意識する点を3〜6個の短い箇条書きで。
- tactics: 具体的な戦術を1〜3個、指定のショット形式で設計する（決め球まで含める）。
- drills: その戦術/課題を身につける練習を2〜4個。
日本語。出力は指定 JSON スキーマに従う。

${VOCAB_BLOCK}`

const SYNTH_SCHEMA = {
  type: 'object',
  properties: {
    report: { type: 'string' },
    keyPoints: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
    tactics: { type: 'array', minItems: 0, maxItems: 3, items: TACTIC_ITEM_SCHEMA },
    drills: {
      type: 'array',
      minItems: 0,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          target: { type: 'string' },
          purpose: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['title', 'target', 'purpose', 'detail'],
      },
    },
  },
  required: ['report', 'keyPoints', 'tactics', 'drills'],
}

export async function research(settings: Settings, topic: string, onStage?: (s: ResearchStage) => void): Promise<ResearchResult> {
  const profile = profileToText(settings)

  // 1) Web で調べる（グラウンディング）
  onStage?.('searching')
  const researchPrompt = `【選手のプロフィール】\n${profile}\n\n【相談・調べたいこと】\n${topic}\n\nこの選手の役に立つよう、Web を調べて具体的な情報と出典を集めてください。`
  const grounded = await runGrounded(settings, RESEARCH_SYSTEM, [{ role: 'user', text: researchPrompt }], {
    label: 'research-search',
    kind: 'propose-tactics',
    request: topic,
    temperature: 0.5,
  })

  // 2) 構造化して戦術・練習に落とす（グラウンディングなし）
  onStage?.('synthesizing')
  const synthPrompt = `【選手のプロフィール】\n${profile}\n\n【相談】\n${topic}\n\n【リサーチ結果】\n${grounded.text}\n\n上記を踏まえ、選手がすぐ使える形（report / keyPoints / tactics / drills）にまとめてください。`
  const { data, model } = await runAgent<{ report?: string; keyPoints?: string[]; tactics?: TacticProposal[]; drills?: DrillProposal[] }>(
    settings,
    SYNTH_SYSTEM,
    [{ role: 'user', text: synthPrompt }],
    SYNTH_SCHEMA,
    { label: 'research-synth', noKnowledge: true, temperature: 0.7 },
  )

  const tactics = (data.tactics ?? []).filter((t) => t && Array.isArray(t.shots) && t.shots.length > 0)

  // 3) 戦術を審査（あれば）
  let verdicts: TacticVerdict[] = []
  if (tactics.length > 0) {
    onStage?.('verifying')
    try {
      verdicts = (await verifyTactics(settings, tactics)).verdicts
    } catch {
      /* 審査失敗は無視 */
    }
  }

  return {
    topic,
    report: data.report ?? grounded.text.slice(0, 800),
    keyPoints: data.keyPoints ?? [],
    citations: grounded.citations,
    grounded: grounded.grounded,
    tactics,
    verdicts,
    drills: data.drills ?? [],
    model,
  }
}

/** 戦術案を登録用に変換 */
export function toTacticData(p: TacticProposal, settings: Settings): Omit<Tactic, 'id' | 'createdAt' | 'updatedAt'> | null {
  return proposalToTactic(p, settings)
}
