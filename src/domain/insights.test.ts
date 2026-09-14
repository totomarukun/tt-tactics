import { describe, expect, it } from 'vitest'
import { computeInsights, type InsightInput } from './insights'
import type { Tactic, TacticOutcome } from './types'

const tactic = (id: string, over: Partial<Tactic> = {}): Tactic => ({
  id,
  title: id,
  situation: 'my_serve',
  goal: '',
  tags: [],
  oppHand: 'right',
  confidence: 1,
  root: { id: `r-${id}`, player: 'me', zone: { side: 'opp', col: 'B', depth: 'S' }, stroke: 'serve', children: [] },
  taskIds: [],
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  ...over,
})
const oc = (tacticId: string, result: TacticOutcome['result'], over: Partial<TacticOutcome> = {}): TacticOutcome => ({
  id: Math.random().toString(36),
  tacticId,
  result,
  date: '2026-09-10',
  createdAt: '2026-09-10',
  ...over,
})
const base = (over: Partial<InsightInput> = {}): InsightInput => ({ tactics: [], outcomes: [], tasks: [], logs: [], ...over })

describe('computeInsights', () => {
  it('データが乏しいときは記録を促す', () => {
    const ins = computeInsights(base({ tactics: [tactic('a')] }))
    expect(ins.some((i) => i.id === 'seed-outcomes')).toBe(true)
  })

  it('効いている戦術を good で出す', () => {
    const ins = computeInsights(base({ tactics: [tactic('a')], outcomes: [oc('a', 'won'), oc('a', 'won'), oc('a', 'won'), oc('a', 'won'), oc('a', 'lost')] }))
    const s = ins.find((i) => i.id === 'strong-a')
    expect(s?.tone).toBe('good')
  })

  it('効かない戦術を warn で出し、相談へ誘導', () => {
    const ins = computeInsights(base({ tactics: [tactic('a')], outcomes: [oc('a', 'lost'), oc('a', 'lost'), oc('a', 'won')] }))
    const w = ins.find((i) => i.id === 'weak-a')
    expect(w?.tone).toBe('warn')
    expect(w?.action?.view).toBe('consult')
  })

  it('自信ありなのに未実戦を促す', () => {
    const ins = computeInsights(base({ tactics: [tactic('a', { confidence: 3 })], outcomes: [oc('b', 'won'), oc('b', 'won'), oc('b', 'won')], }))
    expect(ins.some((i) => i.id === 'untried-a')).toBe(true)
  })

  it('苦手な相手を検出', () => {
    const ins = computeInsights(
      base({ tactics: [tactic('a')], outcomes: [oc('a', 'lost', { opponent: 'カットマン' }), oc('a', 'lost', { opponent: 'カットマン' }), oc('a', 'won', { opponent: 'カットマン' })] }),
    )
    expect(ins.some((i) => i.id === 'hard-opp-カットマン')).toBe(true)
  })

  it('優先度の降順で返る', () => {
    const ins = computeInsights(base({ tactics: [tactic('a')], outcomes: [oc('a', 'lost'), oc('a', 'lost'), oc('a', 'lost')] }))
    for (let i = 1; i < ins.length; i++) expect(ins[i - 1].priority).toBeGreaterThanOrEqual(ins[i].priority)
  })
})
