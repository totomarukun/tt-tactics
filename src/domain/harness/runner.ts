import { FALLBACK_MODEL, GeminiError, type Citation, callGeminiGroundedOnce, callGeminiOnce, resolveModel, type GeminiTurn } from '../gemini'
import type { Settings, Situation } from '../types'
import { assembleKnowledge, type TaskKind } from './context'
import { recordTrace } from './trace'

// ハーネスの実行中核。すべての AI 呼び出しはここを通す。
// - 関係する知識だけを文脈に組み立てる（context）
// - リトライ（指数バックオフ）と Flash への自動フォールバック
// - 入出力をトレースに記録（observability）
// - JSON パースまで面倒を見る

export interface RunOptions {
  /** トレースに残すラベル */
  label: string
  /** 文脈組み立てのタスク種別。省略時は知識ベースを付けない */
  kind?: TaskKind
  /** 知識選択のヒント */
  situation?: Situation
  tags?: string[]
  request?: string
  /** 知識ベースを付けない（純粋なプロンプトだけ） */
  noKnowledge?: boolean
  temperature?: number
  maxAttempts?: number
}

export interface RunResult<T> {
  data: T
  model: string
  attempts: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // ```json ... ``` や前後の説明文が混ざった場合の救済
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fence) {
      try {
        return JSON.parse(fence[1])
      } catch {
        /* fallthrough */
      }
    }
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(text.slice(s, e + 1))
      } catch {
        /* fallthrough */
      }
    }
    throw new Error('応答を JSON として解釈できませんでした')
  }
}

export async function runAgent<T>(
  settings: Settings,
  system: string,
  turns: GeminiTurn[],
  schema: unknown,
  opts: RunOptions,
): Promise<RunResult<T>> {
  const apiKey = settings.geminiApiKey?.trim()
  if (!apiKey) throw new Error('設定画面で Gemini の API キーを登録してください')

  const knowledge = opts.noKnowledge || !opts.kind ? '' : assembleKnowledge(settings, { kind: opts.kind, situation: opts.situation, tags: opts.tags, request: opts.request })
  const fullSystem = system + knowledge
  const promptText = turns.map((t) => t.text).join('\n')

  const primary = await resolveModel(apiKey, settings.geminiModel)
  const maxAttempts = opts.maxAttempts ?? 3
  const started = performance.now()

  let attempt = 0
  let lastErr: unknown = null
  let model = primary
  while (attempt < maxAttempts) {
    attempt++
    // 最終トライで、まだ Flash でなければ Flash に切り替える（無料枠・別レート）
    if (attempt === maxAttempts && model !== FALLBACK_MODEL && !settings.geminiModel?.trim()) {
      model = FALLBACK_MODEL
    }
    try {
      const raw = await callGeminiOnce(apiKey, model, fullSystem, turns, schema, opts.temperature ?? 0.7)
      const data = extractJson(raw.text) as T
      await recordTrace({
        label: opts.label,
        model: raw.model,
        attempts: attempt,
        durationMs: Math.round(performance.now() - started),
        status: 'ok',
        systemChars: fullSystem.length,
        promptChars: promptText.length,
        responseChars: raw.text.length,
        promptPreview: promptText,
        responsePreview: raw.text,
      })
      return { data, model: raw.model, attempts: attempt }
    } catch (e) {
      lastErr = e
      const retriable = e instanceof GeminiError ? e.retriable : e instanceof Error && /JSON/.test(e.message)
      if (!retriable || attempt >= maxAttempts) break
      await sleep(600 * 2 ** (attempt - 1)) // 0.6s, 1.2s, ...
    }
  }

  await recordTrace({
    label: opts.label,
    model,
    attempts: attempt,
    durationMs: Math.round(performance.now() - started),
    status: 'error',
    systemChars: fullSystem.length,
    promptChars: promptText.length,
    responseChars: 0,
    promptPreview: promptText,
    responsePreview: '',
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  })
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

export interface GroundedRunResult {
  text: string
  citations: Citation[]
  grounded: boolean
  model: string
  attempts: number
}

/** Google 検索グラウンディング付きの実行。JSON パースはしない（プレーンテキスト＋出典を返す）。 */
export async function runGrounded(settings: Settings, system: string, turns: GeminiTurn[], opts: RunOptions): Promise<GroundedRunResult> {
  const apiKey = settings.geminiApiKey?.trim()
  if (!apiKey) throw new Error('設定画面で Gemini の API キーを登録してください')

  const knowledge = opts.noKnowledge || !opts.kind ? '' : assembleKnowledge(settings, { kind: opts.kind, situation: opts.situation, tags: opts.tags, request: opts.request })
  const fullSystem = system + knowledge
  const promptText = turns.map((t) => t.text).join('\n')
  const primary = await resolveModel(apiKey, settings.geminiModel)
  const maxAttempts = opts.maxAttempts ?? 3
  const started = performance.now()

  let attempt = 0
  let lastErr: unknown = null
  let model = primary
  while (attempt < maxAttempts) {
    attempt++
    if (attempt === maxAttempts && model !== FALLBACK_MODEL && !settings.geminiModel?.trim()) model = FALLBACK_MODEL
    try {
      const raw = await callGeminiGroundedOnce(apiKey, model, fullSystem, turns, opts.temperature ?? 0.6)
      await recordTrace({
        label: opts.label,
        model: raw.model,
        attempts: attempt,
        durationMs: Math.round(performance.now() - started),
        status: 'ok',
        systemChars: fullSystem.length,
        promptChars: promptText.length,
        responseChars: raw.text.length,
        promptPreview: promptText,
        responsePreview: `${raw.grounded ? `[出典 ${raw.citations.length} 件]\n` : '[Web検索は使われませんでした]\n'}${raw.text}`,
      })
      return { ...raw, attempts: attempt }
    } catch (e) {
      lastErr = e
      const retriable = e instanceof GeminiError ? e.retriable : false
      if (!retriable || attempt >= maxAttempts) break
      await sleep(600 * 2 ** (attempt - 1))
    }
  }
  await recordTrace({
    label: opts.label,
    model,
    attempts: attempt,
    durationMs: Math.round(performance.now() - started),
    status: 'error',
    systemChars: fullSystem.length,
    promptChars: promptText.length,
    responseChars: 0,
    promptPreview: promptText,
    responsePreview: '',
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  })
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}
