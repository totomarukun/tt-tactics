import { describe, expect, it } from 'vitest'
import { weekProgress, weekStart } from './week'
import type { PracticeLog, TacticOutcome } from './types'

const wed = new Date(2026, 8, 9) // 2026-09-09 水
const log = (date: string, items = 1): PracticeLog => ({ id: date, date, items: Array(items).fill({ taskId: 'x' }), createdAt: date, updatedAt: date })
const oc = (date: string): TacticOutcome => ({ id: date + Math.random(), tacticId: 't', result: 'won', date, createdAt: date })

describe('week', () => {
  it('週の開始は月曜', () => {
    expect(weekStart(wed)).toBe('2026-09-07') // 月曜
  })

  it('練習と試合の活動日を数え、同じ日は1回', () => {
    const p = weekProgress([log('2026-09-07'), log('2026-09-08')], [oc('2026-09-08'), oc('2026-09-09')], 2, wed)
    expect(p.active).toBe(3) // 7,8,9
    expect(p.done).toBe(true)
  })

  it('先週の活動は今週に数えない', () => {
    const p = weekProgress([log('2026-09-01')], [], 2, wed)
    expect(p.active).toBe(0)
    expect(p.done).toBe(false)
  })

  it('項目のない練習ログは活動に数えない', () => {
    const p = weekProgress([log('2026-09-08', 0)], [], 1, wed)
    expect(p.active).toBe(0)
  })
})
