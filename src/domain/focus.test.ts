import { describe, expect, it } from 'vitest'
import { achievedFocuses, activeFocuses, suggestFocuses } from './focus'
import type { Focus, Tactic, TacticOutcome } from './types'

const tactic = (id: string): Tactic => ({ id, title: id, situation: 'my_serve', goal: '', tags: [], oppHand: 'right', confidence: 1, root: { id: 'r' + id, player: 'me', zone: { side: 'opp', col: 'B', depth: 'S' }, stroke: 'serve', children: [] }, taskIds: [], createdAt: '', updatedAt: '' })
const oc = (tacticId: string, result: TacticOutcome['result'], failureTags?: string[]): TacticOutcome => ({ id: Math.random().toString(36), tacticId, result, date: '2026-09-10', createdAt: '2026-09-10', failureTags })

describe('focus', () => {
  it('未達成を active、達成を achieved に分ける', () => {
    const f: Focus[] = [
      { id: '1', week: '2026-09-07', title: 'A', done: false, createdAt: '1' },
      { id: '2', week: '2026-09-07', title: 'B', done: true, createdAt: '2' },
    ]
    expect(activeFocuses(f).map((x) => x.id)).toEqual(['1'])
    expect(achievedFocuses(f).map((x) => x.id)).toEqual(['2'])
  })
  it('崩れ方の頻出・効かない戦術から提案する', () => {
    const s = suggestFocuses([tactic('t')], [oc('t', 'lost', ['決め急ぎ']), oc('t', 'lost', ['決め急ぎ'])])
    expect(s.some((x) => x.title.includes('決め急ぎ'))).toBe(true)
    expect(s.length).toBeLessThanOrEqual(3)
  })
  it('データが無ければ中級の基本を提案', () => {
    const s = suggestFocuses([], [])
    expect(s.length).toBeGreaterThan(0)
  })
})
