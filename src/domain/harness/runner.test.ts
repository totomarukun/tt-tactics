import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runAgent } from './runner'
import type { Settings } from '../types'

// geminiModel を明示してモデル一覧 fetch を回避
const settings: Settings = { myHand: 'right', defaultOppHand: 'right', strokeOrder: [], geminiApiKey: 'k', geminiModel: 'gemini-2.5-pro' }

function ok(body: unknown) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }), { status: 200 })
}
function err(status: number, message = 'x') {
  return new Response(JSON.stringify({ error: { message } }), { status })
}

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runAgent', () => {
  it('成功時はデータを返し、試行は1回', async () => {
    fetchMock.mockResolvedValueOnce(ok({ v: 1 }))
    const r = await runAgent<{ v: number }>(settings, 'sys', [{ role: 'user', text: 'hi' }], {}, { label: 't' })
    expect(r.data.v).toBe(1)
    expect(r.attempts).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('429 はリトライして成功する', async () => {
    fetchMock.mockResolvedValueOnce(err(429)).mockResolvedValueOnce(ok({ v: 2 }))
    const r = await runAgent<{ v: number }>(settings, 'sys', [{ role: 'user', text: 'hi' }], {}, { label: 't', maxAttempts: 3 })
    expect(r.data.v).toBe(2)
    expect(r.attempts).toBe(2)
  })

  it('400 はリトライせず即失敗', async () => {
    fetchMock.mockResolvedValue(err(400, 'API key not valid'))
    await expect(runAgent(settings, 'sys', [{ role: 'user', text: 'hi' }], {}, { label: 't' })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('支出上限の 429 はリトライしない', async () => {
    fetchMock.mockResolvedValue(err(429, 'exceeded its monthly spending cap'))
    await expect(runAgent(settings, 'sys', [{ role: 'user', text: 'hi' }], {}, { label: 't' })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('壊れた JSON もフェンス/波括弧から救済する', async () => {
    const bad = new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'これです```json\n{"v":9}\n```' }] } }] }), { status: 200 })
    fetchMock.mockResolvedValueOnce(bad)
    const r = await runAgent<{ v: number }>(settings, 'sys', [{ role: 'user', text: 'hi' }], {}, { label: 't' })
    expect(r.data.v).toBe(9)
  })
})
