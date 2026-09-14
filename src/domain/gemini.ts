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

export const FALLBACK_MODEL = 'gemini-2.5-flash'
const DEFAULT_MODEL = 'gemini-2.5-pro'
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
  return DEFAULT_MODEL
}

export function friendlyError(status: number, msg: string): string {
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

export class GeminiError extends Error {
  status: number
  retriable: boolean
  constructor(status: number, rawMsg: string) {
    super(friendlyError(status, rawMsg))
    this.name = 'GeminiError'
    this.status = status
    // 429（レート）と 5xx（一時障害）と 0（ネットワーク）はリトライ対象。支出上限は待っても復帰しないので除外
    this.retriable = (status === 429 && !/spending cap/i.test(rawMsg)) || status >= 500 || status === 0
  }
}

function parseErrMsg(body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string } }
    if (j.error?.message) return j.error.message
  } catch {
    /* noop */
  }
  return body.slice(0, 200)
}

export interface GeminiTurn {
  role: 'user' | 'model'
  text: string
}

export interface RawResult {
  text: string
  model: string
}

/** 1回だけ Gemini を呼ぶ（リトライなし）。失敗時は GeminiError を投げる */
export async function callGeminiOnce(
  apiKey: string,
  model: string,
  system: string,
  turns: GeminiTurn[],
  schema: unknown,
  temperature: number,
): Promise<RawResult> {
  let res: Response
  try {
    res = await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature },
      }),
    })
  } catch (e) {
    throw new GeminiError(0, `ネットワークエラー: ${(e as Error).message}`)
  }
  if (!res.ok) throw new GeminiError(res.status, parseErrMsg(await res.text()))

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
    promptFeedback?: { blockReason?: string }
  }
  if (data.promptFeedback?.blockReason) throw new GeminiError(400, `ブロック（${data.promptFeedback.blockReason}）`)
  const cand = data.candidates?.[0]
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('')
  if (!text) throw new GeminiError(0, `本文が空（finishReason: ${cand?.finishReason ?? '不明'}）`)
  return { text, model }
}

export interface Citation {
  uri: string
  title: string
}
export interface GroundedResult {
  text: string
  citations: Citation[]
  grounded: boolean
  model: string
}

/** 出典メタデータから引用元を取り出す（重複 URL は除く） */
export function extractCitations(groundingMetadata: unknown): Citation[] {
  const gm = groundingMetadata as { groundingChunks?: { web?: { uri?: string; title?: string } }[] } | undefined
  const seen = new Set<string>()
  const out: Citation[] = []
  for (const c of gm?.groundingChunks ?? []) {
    const uri = c.web?.uri
    if (!uri || seen.has(uri)) continue
    seen.add(uri)
    out.push({ uri, title: c.web?.title || uri })
  }
  return out
}

/**
 * Google 検索グラウンディング付きで1回呼ぶ。構造化出力は併用不可なのでプレーンテキスト＋出典を返す。
 */
export async function callGeminiGroundedOnce(apiKey: string, model: string, system: string, turns: GeminiTurn[], temperature: number): Promise<GroundedResult> {
  let res: Response
  try {
    res = await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        tools: [{ google_search: {} }],
        generationConfig: { temperature },
      }),
    })
  } catch (e) {
    throw new GeminiError(0, `ネットワークエラー: ${(e as Error).message}`)
  }
  if (!res.ok) throw new GeminiError(res.status, parseErrMsg(await res.text()))

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string; groundingMetadata?: unknown }[]
    promptFeedback?: { blockReason?: string }
  }
  if (data.promptFeedback?.blockReason) throw new GeminiError(400, `ブロック（${data.promptFeedback.blockReason}）`)
  const cand = data.candidates?.[0]
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('')
  if (!text) throw new GeminiError(0, `本文が空（finishReason: ${cand?.finishReason ?? '不明'}）`)
  const citations = extractCitations(cand?.groundingMetadata)
  return { text, citations, grounded: citations.length > 0, model }
}
