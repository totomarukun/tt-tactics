import type { Settings } from './types'

const API = 'https://generativelanguage.googleapis.com/v1beta'

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

const FALLBACK_MODEL = 'gemini-2.5-pro'
let cachedModel: { key: string; model: string } | null = null

export async function resolveModel(apiKey: string, override?: string): Promise<string> {
  if (override?.trim()) return override.trim().replace(/^models\//, '')
  if (cachedModel && cachedModel.key === apiKey) return cachedModel.model
  try {
    const res = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': apiKey } })
    if (res.ok) {
      const data = (await res.json()) as { models?: ModelInfo[] }
      const picked = pickModel(data.models ?? [])
      if (picked) {
        cachedModel = { key: apiKey, model: picked }
        return picked
      }
    }
  } catch {
    /* 一覧が取れなければ既定へ */
  }
  return FALLBACK_MODEL
}

function extractError(status: number, body: string): string {
  let msg = body.slice(0, 200)
  try {
    const j = JSON.parse(body) as { error?: { message?: string } }
    if (j.error?.message) msg = j.error.message
  } catch {
    /* noop */
  }
  if (status === 429 && /spending cap/i.test(msg)) {
    return '429: Google 側の月間支出上限に達しています。https://ai.studio/spend で上限を上げるか、設定のモデル名に gemini-2.5-flash（無料枠あり）を指定してください。'
  }
  if (status === 429) {
    return '429: 呼び出し回数の上限です。1分ほど待ってから再度お試しください。続く場合は設定のモデル名に gemini-2.5-flash を指定してください。'
  }
  if (status === 400 && /API key not valid/i.test(msg)) {
    return '400: API キーが無効です。設定画面のキーを確認してください。'
  }
  if (status === 404) {
    return `404: 指定したモデルが見つかりません。設定のモデル名を空にするか、別の名前にしてください。（${msg}）`
  }
  return `${status}: ${msg}`
}

export interface GeminiTurn {
  role: 'user' | 'model'
  text: string
}

/** JSON スキーマ付きで Gemini を呼び、パース済みの結果と使用モデルを返す */
export async function geminiJson<T>(
  settings: Settings,
  system: string,
  turns: GeminiTurn[],
  schema: unknown,
  opts: { temperature?: number } = {},
): Promise<{ data: T; model: string }> {
  const apiKey = settings.geminiApiKey?.trim()
  if (!apiKey) throw new Error('設定画面で Gemini の API キーを登録してください')
  const model = await resolveModel(apiKey, settings.geminiModel)

  const res = await fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        temperature: opts.temperature ?? 0.7,
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
  try {
    return { data: JSON.parse(text) as T, model }
  } catch {
    throw new Error('Gemini の応答を JSON として解釈できませんでした')
  }
}
