import { describe, expect, it } from 'vitest'
import { newReport, sanitizeLog, sanitizeSettings, sanitizeTactic, sanitizeTask } from './validate'

describe('sanitizeTactic', () => {
  it('壊れた zone や欠けたフィールドを既定値で補う', () => {
    const rep = newReport()
    const t = sanitizeTactic(
      { id: 'a', title: 'x', situation: 'my_serve', root: { id: 'r', player: 'me', stroke: 'serve', zone: { side: 'opp' }, children: [{ id: 'c', player: 'opp', stroke: 'push' }] } },
      rep,
    )
    expect(t).not.toBeNull()
    expect(t!.root!.zone.col).toBe('M') // 補完
    expect(t!.root!.zone.depth).toBe('L')
    expect(Array.isArray(t!.root!.children)).toBe(true)
    expect(t!.root!.children[0].children).toEqual([]) // children を配列化
    expect(rep.repaired).toBeGreaterThan(0)
  })

  it('id が無いレコードは捨てる', () => {
    const rep = newReport()
    expect(sanitizeTactic({ title: 'x' }, rep)).toBeNull()
    expect(sanitizeTactic(null, rep)).toBeNull()
    expect(rep.dropped).toBe(2)
  })

  it('不正な situation / confidence を既定に丸める', () => {
    const rep = newReport()
    const t = sanitizeTactic({ id: 'a', situation: 'bogus', confidence: 9, tags: ['ok', 5] }, rep)
    expect(t!.situation).toBe('my_serve')
    expect(t!.confidence).toBe(1)
    expect(t!.tags).toEqual(['ok'])
  })

  it('循環しない深いネストでも 20 段で止まる', () => {
    let node: Record<string, unknown> = { id: 'leaf', player: 'me', stroke: 'drive' }
    for (let i = 0; i < 30; i++) node = { id: `n${i}`, player: 'me', stroke: 'drive', children: [node] }
    const rep = newReport()
    const t = sanitizeTactic({ id: 'a', root: node }, rep)
    expect(t).not.toBeNull()
  })
})

describe('sanitizeTask / sanitizeLog / sanitizeSettings', () => {
  it('task の status/source を正規化', () => {
    const rep = newReport()
    const t = sanitizeTask({ id: 't', status: 'weird', source: 'ai', tacticIds: ['x', 1] }, rep)
    expect(t!.status).toBe('open')
    expect(t!.source).toBe('ai')
    expect(t!.tacticIds).toEqual(['x'])
  })
  it('log は date 必須、items は taskId を持つものだけ', () => {
    const rep = newReport()
    expect(sanitizeLog({ id: 'l' }, rep)).toBeNull()
    const l = sanitizeLog({ id: 'l', date: '2026-01-01', items: [{ taskId: 'a' }, { bad: true }] }, rep)
    expect(l!.items).toHaveLength(1)
  })
  it('settings は利き手と strokeOrder を保証', () => {
    const s = sanitizeSettings({ myHand: 'bogus', strokeOrder: [] })
    expect(s.myHand).toBe('right')
    expect(s.strokeOrder.length).toBeGreaterThan(0)
  })
})
