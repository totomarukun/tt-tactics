import { describe, expect, it } from 'vitest'
import { allZones, colIndex, zoneCenter, zoneFromPoint, zoneRect } from './zone'
import type { Hands } from './types'

const rr: Hands = { me: 'right', opp: 'right' }
const rl: Hands = { me: 'right', opp: 'left' }

describe('colIndex', () => {
  it('右利き同士: 自分のフォアは右、相手のフォアは左', () => {
    expect(colIndex('F', 'me', rr)).toBe(2)
    expect(colIndex('B', 'me', rr)).toBe(0)
    expect(colIndex('F', 'opp', rr)).toBe(0)
    expect(colIndex('B', 'opp', rr)).toBe(2)
  })
  it('相手が左利きなら相手コートだけ反転する', () => {
    expect(colIndex('F', 'opp', rl)).toBe(2)
    expect(colIndex('B', 'opp', rl)).toBe(0)
    expect(colIndex('F', 'me', rl)).toBe(2)
  })
})

describe('zoneRect', () => {
  it('相手ロングは最上段、自分ロングは最下段', () => {
    expect(zoneRect({ side: 'opp', col: 'M', depth: 'L' }, rr).y).toBe(0)
    expect(zoneRect({ side: 'opp', col: 'M', depth: 'S' }, rr).y).toBe(180)
    expect(zoneRect({ side: 'me', col: 'M', depth: 'S' }, rr).y).toBe(270)
    expect(zoneRect({ side: 'me', col: 'M', depth: 'L' }, rr).y).toBe(450)
  })
})

describe('zoneFromPoint', () => {
  it('全ゾーンの中心から元のゾーンに戻る', () => {
    for (const hands of [rr, rl]) {
      for (const z of allZones()) {
        const c = zoneCenter(z, hands)
        expect(zoneFromPoint(c.x, c.y, hands)).toEqual(z)
      }
    }
  })
  it('台の外は null', () => {
    expect(zoneFromPoint(-1, 10, rr)).toBeNull()
    expect(zoneFromPoint(10, 540, rr)).toBeNull()
  })
})
