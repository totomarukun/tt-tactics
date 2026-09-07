import { nodeLabel } from './presets'
import type { Settings, ShotNode, Tactic, Task } from './types'

export interface DrillProposal {
  title: string
  purpose: string
  detail: string
  /** 何球目・どの分岐を鍛えるか（説明用） */
  target: string
}

export interface CoachResponse {
  drills: DrillProposal[]
  coachNote: string
  /** 実際に使ったモデル名 */
  model: string
}

const API = 'https://generativelanguage.googleapis.com/v1beta'

/** ツリーの全経路を「1. 自分 ... → 2. 相手 ...」の行に展開する */
export function tacticToText(t: Tactic): string {
  const lines: string[] = []
  const walk = (n: ShotNode, trail: ShotNode[]) => {
    const path = [...trail, n]
    if (n.children.length === 0) {
      lines.push(
        path
          .map((s, i) => `${i + 1}. ${nodeLabel(s)}${s.isFinisher ? '【決め球】' : ''}${s.note ? `（メモ: ${s.note}）` : ''}`)
          .join(' / '),
      )
      return
    }
    n.children.forEach((c) => walk(c, path))
  }
  if (t.root) walk(t.root, [])
  const head = [
    `戦術名: ${t.title}`,
    `状況: ${t.situation === 'my_serve' ? '自分のサーブから' : '相手のサーブから（レシーブ）'}`,
    t.goal ? `狙い: ${t.goal}` : '',
    t.tags.length ? `想定する相手: ${t.tags.join('、')}` : '',
    `相手の利き手: ${t.oppHand === 'left' ? '左' : '右'}`,
    `自信度: ${['練習中', '実戦で使える', '得意'][t.confidence - 1]}`,
    '',
    '展開（分岐ごとに1行。ゾーンは「前＝台上2バウンド／ハーフ＝ハーフロング／奥＝ロング」）:',
  ].filter((l) => l !== '')
  return [...head, ...(lines.length ? lines : ['（まだ球が登録されていません）'])].join('\n')
}

const SYSTEM = `あなたは日本のトップレベルで指導経験のある卓球コーチです。選手が登録した戦術（サーブやレシーブからの展開ツリー）を読み、その戦術を試合で決められるようになるための練習メニューを設計します。

設計の方針:
- 戦術のどの球（何球目・どの分岐）を鍛えるメニューなのかを必ず明示する。
- 多球練習、システム練習（パターン練習）、ゲーム形式の3種類を組み合わせる。決め球だけでなく、その前の球の質（回転量、深さ、コース）や相手の返球への対応も対象にする。
- 球出しの内容、コース、回転、本数またはセット数、成功の目安（例: 10本中7本）を具体的に書く。一人でできるかパートナーが必要かも書く。
- 選手のプレースタイル・用具・利き手を踏まえる。一般論ではなく、この戦術に固有の課題に絞る。
- 提案は4〜6個。多すぎない。
- 日本語で、選手に直接語りかける文体で書く。専門用語はそのまま使ってよい。
- 出力は指定された JSON スキーマに従う。`

const DRILLS_SCHEMA = {
  type: 'object',
  properties: {
    coachNote: { type: 'string', description: '戦術全体への短いコメント（弱点や優先順位）。2〜3文' },
    drills: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '練習メニュー名（20文字以内）' },
          target: { type: 'string', description: '鍛える球や分岐（例: 3球目バックドライブの質、相手ストップへの対応）' },
          purpose: { type: 'string', description: 'この練習の狙い（1〜2文）' },
          detail: {
            type: 'string',
            description: 'やり方。球出し・コース・回転・本数やセット数・成功の目安・必要な人数を具体的に。改行可',
          },
        },
        required: ['title', 'target', 'purpose', 'detail'],
      },
    },
  },
  required: ['coachNote', 'drills'],
}

interface ModelInfo {
  name: string // "models/gemini-2.5-pro"
  supportedGenerationMethods?: string[]
}

/** 利用可能なモデルから、最新世代の Pro 系を選ぶ。Pro がなければ Flash */
export function pickModel(models: ModelInfo[]): string | null {
  const cands = models
    .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .map((id) => {
      const mm = id.match(/^gemini-(\d+(?:\.\d+)?)-(pro|flash)(?!-lite)(?:-preview)?(?:-\d+)?$/)
      if (!mm) return null
      return { id, ver: parseFloat(mm[1]), tier: mm[2], preview: id.includes('preview'), dated: /-\d{2,}$/.test(id) }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
  cands.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === 'pro' ? -1 : 1
    if (a.ver !== b.ver) return b.ver - a.ver
    if (a.dated !== b.dated) return a.dated ? 1 : -1 // 日付付きより無印のエイリアスを優先
    if (a.preview !== b.preview) return a.preview ? 1 : -1
    return a.id.localeCompare(b.id)
  })
  return cands[0]?.id ?? null
}

const FALLBACK_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash']

async function resolveModel(apiKey: string, override?: string): Promise<string> {
  if (override?.trim()) return override.trim().replace(/^models\//, '')
  try {
    const res = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': apiKey } })
    if (res.ok) {
      const data = (await res.json()) as { models?: ModelInfo[] }
      const picked = pickModel(data.models ?? [])
      if (picked) return picked
    }
  } catch {
    /* 一覧が取れなければ既定へ */
  }
  return FALLBACK_MODELS[0]
}

function extractError(status: number, body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string } }
    if (j.error?.message) return `${status}: ${j.error.message}`
  } catch {
    /* noop */
  }
  return `${status}: ${body.slice(0, 200)}`
}

export async function suggestDrills(tactic: Tactic, settings: Settings, existingTasks: Task[]): Promise<CoachResponse> {
  const apiKey = settings.geminiApiKey?.trim()
  if (!apiKey) throw new Error('設定画面で Gemini の API キーを登録してください')

  const model = await resolveModel(apiKey, settings.geminiModel)

  const profile = [`利き手: ${settings.myHand === 'left' ? '左' : '右'}`, settings.playerProfile?.trim() || 'シェークハンド、両ハンドドライブ型'].join('\n')
  const existing = existingTasks.length
    ? `\n\nすでに登録済みの練習課題（重複しない提案にすること）:\n${existingTasks.map((t) => `- ${t.title}`).join('\n')}`
    : ''
  const user = `【選手のプロフィール】\n${profile}\n\n【戦術】\n${tacticToText(tactic)}${existing}\n\nこの戦術を実戦で決められるようにする練習メニューを提案してください。`

  const res = await fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: DRILLS_SCHEMA,
        temperature: 0.7,
      },
    }),
  })
  if (!res.ok) throw new Error(`Gemini API エラー ${extractError(res.status, await res.text())}`)

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
    promptFeedback?: { blockReason?: string }
  }
  if (data.promptFeedback?.blockReason) throw new Error(`Gemini がリクエストをブロックしました（${data.promptFeedback.blockReason}）`)
  const cand = data.candidates?.[0]
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('')
  if (!text) throw new Error(`Gemini から本文が返りませんでした（finishReason: ${cand?.finishReason ?? '不明'}）`)

  let parsed: { drills?: DrillProposal[]; coachNote?: string }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini の応答を JSON として解釈できませんでした')
  }
  if (!Array.isArray(parsed.drills)) throw new Error('Gemini の応答に練習メニューが含まれていません')
  return { drills: parsed.drills, coachNote: parsed.coachNote ?? '', model }
}
