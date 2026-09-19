import { describe, expect, it } from 'vitest'
import { activeCues, cueFull, retiredCues, staleCues } from './cue'
import type { Cue } from './types'

const cue = (id: string, cat: 'tech' | 'tactic', over: Partial<Cue> = {}): Cue => ({ id, category: cat, text: id, retired: false, createdAt: '2026-09-01', updatedAt: '2026-09-01', ...over })

describe('cue', () => {
  it('カテゴリ別に現役キューを返す', () => {
    const cs = [cue('a', 'tech'), cue('b', 'tactic'), cue('c', 'tech', { retired: true })]
    expect(activeCues(cs, 'tech').map((c) => c.id)).toEqual(['a'])
    expect(retiredCues(cs).map((c) => c.id)).toEqual(['c'])
  })
  it('3件で満杯', () => {
    const cs = ['a', 'b', 'c'].map((id) => cue(id, 'tech'))
    expect(cueFull(cs, 'tech')).toBe(true)
    expect(cueFull(cs, 'tactic')).toBe(false)
  })
  it('14日更新なしは見直し対象', () => {
    const old = new Date(Date.now() - 20 * 86400000).toISOString()
    const fresh = new Date(Date.now() - 2 * 86400000).toISOString()
    expect(staleCues([cue('a', 'tech', { updatedAt: old })]).length).toBe(1)
    expect(staleCues([cue('b', 'tech', { updatedAt: fresh })]).length).toBe(0)
  })
})
