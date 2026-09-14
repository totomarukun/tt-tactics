import { describe, expect, it } from 'vitest'
import { extractCitations, pickModel } from './gemini'

const m = (name: string, methods = ['generateContent']) => ({ name: `models/${name}`, supportedGenerationMethods: methods })

describe('pickModel', () => {
  it('Pro を Flash より優先し、世代が新しいものを選ぶ', () => {
    expect(pickModel([m('gemini-2.5-flash'), m('gemini-2.5-pro'), m('gemini-2.0-pro')])).toBe('gemini-2.5-pro')
  })
  it('新しい世代の preview は古い世代の正式版より優先', () => {
    expect(pickModel([m('gemini-2.5-pro'), m('gemini-3.1-pro-preview')])).toBe('gemini-3.1-pro-preview')
  })
  it('lite やタイプ違い、generateContent 非対応は除外', () => {
    expect(pickModel([m('gemini-3.1-flash-lite'), m('gemini-embedding-001'), m('gemini-2.5-pro', ['embedContent'])])).toBeNull()
  })
  it('日付付きより無印エイリアスを優先', () => {
    expect(pickModel([m('gemini-2.5-pro-0605'), m('gemini-2.5-pro')])).toBe('gemini-2.5-pro')
  })
})

describe('extractCitations', () => {
  it('groundingChunks から URL と題を取り出し、重複を除く', () => {
    const c = extractCitations({
      groundingChunks: [
        { web: { uri: 'https://a.com', title: 'A' } },
        { web: { uri: 'https://a.com', title: 'A dup' } },
        { web: { uri: 'https://b.com' } },
        { notweb: {} },
      ],
    })
    expect(c).toHaveLength(2)
    expect(c[0]).toEqual({ uri: 'https://a.com', title: 'A' })
    expect(c[1].title).toBe('https://b.com')
  })
  it('メタデータ無しは空配列', () => {
    expect(extractCitations(undefined)).toEqual([])
    expect(extractCitations({})).toEqual([])
  })
})
