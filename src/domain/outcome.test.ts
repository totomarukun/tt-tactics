import { describe, expect, it } from 'vitest'
import { evidenceConfidence, evidenceLabel, statsFor } from './outcome'
import type { TacticOutcome } from './types'

const o = (tacticId: string, result: TacticOutcome['result'], date = '2026-09-01'): TacticOutcome => ({
  id: Math.random().toString(36),
  tacticId,
  result,
  date,
  createdAt: date,
})

describe('statsFor', () => {
  it('勝率は won/(won+lost)、五分は分母から除く', () => {
    const s = statsFor('t', [o('t', 'won'), o('t', 'won'), o('t', 'even'), o('t', 'lost'), o('x', 'won')])
    expect(s.tried).toBe(4)
    expect(s.won).toBe(2)
    expect(s.even).toBe(1)
    expect(s.lost).toBe(1)
    expect(s.winRate).toBeCloseTo(2 / 3)
  })
  it('試行なしは winRate null', () => {
    expect(statsFor('t', []).winRate).toBeNull()
    expect(statsFor('t', []).tried).toBe(0)
  })
  it('最終日を返す', () => {
    expect(statsFor('t', [o('t', 'won', '2026-09-01'), o('t', 'lost', '2026-09-10')]).lastDate).toBe('2026-09-10')
  })
})

describe('evidenceConfidence', () => {
  it('3回未満は証拠にしない（null）', () => {
    expect(evidenceConfidence(statsFor('t', [o('t', 'won'), o('t', 'won')]))).toBeNull()
  })
  it('5回以上・7割以上で得意(3)', () => {
    expect(evidenceConfidence(statsFor('t', Array(5).fill(0).map(() => o('t', 'won'))))).toBe(3)
  })
  it('5割以上で実戦で使える(2)', () => {
    expect(evidenceConfidence(statsFor('t', [o('t', 'won'), o('t', 'won'), o('t', 'lost')]))).toBe(2)
  })
  it('5割未満で練習中(1)', () => {
    expect(evidenceConfidence(statsFor('t', [o('t', 'won'), o('t', 'lost'), o('t', 'lost')]))).toBe(1)
  })
})

describe('evidenceLabel', () => {
  it('未実戦 / 試行のみ / 勝率', () => {
    expect(evidenceLabel(statsFor('t', []))).toBe('未実戦')
    expect(evidenceLabel(statsFor('t', [o('t', 'even'), o('t', 'even')]))).toContain('回試行')
    expect(evidenceLabel(statsFor('t', [o('t', 'won'), o('t', 'lost')]))).toContain('%')
  })
})
