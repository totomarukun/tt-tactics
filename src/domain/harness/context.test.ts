import { describe, expect, it } from 'vitest'
import { assembleKnowledge, chaptersFor } from './context'
import type { Settings } from '../types'

const base: Settings = { myHand: 'right', defaultOppHand: 'right', strokeOrder: [] }

describe('context assembly', () => {
  it('タスクごとに章数が変わる（練習は練習章、提案は広く）', () => {
    const drills = chaptersFor({ kind: 'drills' })
    const propose = chaptersFor({ kind: 'propose-tactics' })
    expect(drills.length).toBeGreaterThan(0)
    expect(propose.length).toBeGreaterThanOrEqual(drills.length)
    expect(propose.some((t) => t.includes('相手タイプ'))).toBe(true)
  })

  it('drills でも相手タイプの語があれば相手タイプ章を足す', () => {
    const withoutHint = chaptersFor({ kind: 'drills' })
    const withHint = chaptersFor({ kind: 'drills', tags: ['カットマン'] })
    expect(withHint.length).toBeGreaterThan(withoutHint.length)
    expect(withHint.some((t) => t.includes('相手タイプ'))).toBe(true)
  })

  it('コーチ方針は最優先ブロックとして末尾に付く', () => {
    const text = assembleKnowledge({ ...base, coachNotes: 'まず台上で崩す' }, { kind: 'drills' })
    expect(text).toContain('まず台上で崩す')
    expect(text).toContain('最優先')
  })

  it('参照ソース節は知識ブロックに含めない', () => {
    const text = assembleKnowledge(base, { kind: 'propose-tactics' })
    expect(text).not.toContain('## 参照ソース')
  })
})
