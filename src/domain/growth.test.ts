import { describe, expect, it } from 'vitest'
import { sealedFailures, topHighlight, weaponBuckets, winRateThenNow } from './growth'
import type { Tactic, TacticOutcome } from './types'

const tactic = (id: string): Tactic => ({ id, title: id, situation: 'my_serve', goal: '', tags: [], oppHand: 'right', confidence: 1, root: { id: 'r' + id, player: 'me', zone: { side: 'opp', col: 'B', depth: 'S' }, stroke: 'serve', children: [] }, taskIds: [], createdAt: '', updatedAt: '' })
const oc = (tacticId: string, result: TacticOutcome['result'], date: string, failureTags?: string[]): TacticOutcome => ({ id: Math.random().toString(36), tacticId, result, date, createdAt: date, failureTags })
const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

describe('growth', () => {
  it('武器/育成中/未実戦に分ける', () => {
    const ts = [tactic('a'), tactic('b'), tactic('c')]
    const os = [...Array(4)].map(() => oc('a', 'won', ago(1))) // a=武器
    os.push(oc('b', 'lost', ago(1))) // b=育成中
    const b = weaponBuckets(ts, os)
    expect(b.weapon.map((t) => t.id)).toEqual(['a'])
    expect(b.growing.map((t) => t.id)).toEqual(['b'])
    expect(b.untried.map((t) => t.id)).toEqual(['c'])
  })

  it('封じた崩れ方: 昔あって直近に無いタグ', () => {
    const os = [oc('a', 'lost', ago(60), ['決め急ぎ']), oc('a', 'lost', ago(50), ['決め急ぎ']), oc('a', 'lost', ago(2), ['サーブが甘い'])]
    const sealed = sealedFailures(os)
    expect(sealed.map((s) => s.tag)).toContain('決め急ぎ')
    expect(sealed.map((s) => s.tag)).not.toContain('サーブが甘い') // 直近に出ている
  })

  it('Then vs Now: 前半と後半の勝率', () => {
    const os = [
      oc('a', 'lost', ago(60)), oc('a', 'lost', ago(55)), oc('a', 'lost', ago(50)),
      oc('a', 'won', ago(5)), oc('a', 'won', ago(4)), oc('a', 'won', ago(3)),
    ]
    const tn = winRateThenNow(os)
    expect(tn).not.toBeNull()
    expect(tn!.then).toBe(0)
    expect(tn!.now).toBe(100)
    expect(tn!.delta).toBe(100)
  })

  it('サンプル不足なら Then vs Now は null', () => {
    expect(winRateThenNow([oc('a', 'won', ago(1))])).toBeNull()
  })

  it('成長ハイライトを返す', () => {
    const ts = [tactic('a')]
    const os = [...Array(4)].map(() => oc('a', 'won', ago(1)))
    expect(topHighlight(ts, os, [])?.tone).toBe('good')
    expect(topHighlight([], [], [])).toBeNull()
  })
})
