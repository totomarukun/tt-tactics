import { describe, expect, it } from 'vitest'
import { buildTree } from './aiTactics'
import { countNodes } from './tree'

const shots = [
  { id: 1, parent: null, player: 'me', col: 'F', depth: 'S', stroke: 'serve', serveMotion: 'forehand', serveFrom: 'B', spin: 'under_fwd', isFinisher: false },
  { id: 2, parent: 1, player: 'opp', col: 'B', depth: 'L', stroke: 'push', spin: 'under', isFinisher: false },
  { id: 3, parent: 2, player: 'me', col: 'M', depth: 'L', stroke: 'drive', hand: 'B', isFinisher: true, note: '肘を前に' },
  { id: 4, parent: 1, player: 'opp', col: 'F', depth: 'S', stroke: 'stop', isFinisher: false },
  { id: 5, parent: 4, player: 'me', col: 'B', depth: 'L', stroke: 'flick', hand: 'B', isFinisher: true },
] as const

describe('buildTree', () => {
  it('フラット一覧をツリーにし、打者と着点の side を交互に強制する', () => {
    const root = buildTree('my_serve', shots.map((s) => ({ ...s })) as never)
    expect(root).not.toBeNull()
    expect(countNodes(root)).toBe(5)
    expect(root!.stroke).toBe('serve')
    expect(root!.player).toBe('me')
    expect(root!.zone.side).toBe('opp')
    expect(root!.children).toHaveLength(2)
    expect(root!.children[0].player).toBe('opp')
    expect(root!.children[0].zone.side).toBe('me')
    expect(root!.children[0].children[0].isFinisher).toBe(true)
    expect(root!.children[0].children[0].note).toBe('肘を前に')
  })

  it('AI が player を間違えても根からの交互を優先する', () => {
    const bad = shots.map((s) => ({ ...s, player: 'me' }))
    const root = buildTree('my_serve', bad as never)
    expect(root!.children[0].player).toBe('opp')
  })

  it('レシーブ戦術は相手のサーブが根になり、serveFrom を持たない', () => {
    const root = buildTree('opp_serve', shots.map((s) => ({ ...s })) as never)
    expect(root!.player).toBe('opp')
    expect(root!.serveFrom).toBeUndefined()
    expect(root!.children[0].player).toBe('me')
  })

  it('不正な列・技術は既定値に置き換え、根以外の serve は other にする', () => {
    const root = buildTree('my_serve', [
      { id: 1, parent: null, player: 'me', col: 'X', depth: 'S', stroke: 'serve', isFinisher: false },
      { id: 2, parent: 1, player: 'opp', col: 'B', depth: 'Z', stroke: 'serve', isFinisher: false },
    ] as never)
    expect(root!.zone.col).toBe('M')
    expect(root!.children[0].zone.depth).toBe('L')
    expect(root!.children[0].stroke).toBe('other')
  })

  it('循環参照や自己参照で無限ループしない', () => {
    const root = buildTree('my_serve', [
      { id: 1, parent: 2, player: 'me', col: 'F', depth: 'S', stroke: 'serve', isFinisher: false },
      { id: 2, parent: 1, player: 'opp', col: 'B', depth: 'L', stroke: 'push', isFinisher: false },
    ] as never)
    expect(root).not.toBeNull()
    expect(countNodes(root)).toBe(2)
  })

  it('空なら null', () => {
    expect(buildTree('my_serve', [])).toBeNull()
  })
})
