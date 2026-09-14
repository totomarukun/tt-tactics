import { describe, expect, it } from 'vitest'
import { buildTree } from '../aiTactics'
import { checkTree, worstSeverity } from './checks'

// ラチェット: 提案（フラット→ツリー→決定的チェック）に期待する判定を固定する。
// チェックを弱めるとここが落ちる。良くなった状態を退行から守るための eval。

type Sit = 'my_serve' | 'opp_serve'
interface Case {
  name: string
  situation: Sit
  shots: Record<string, unknown>[]
  expect: 'ok' | 'warn' | 'error'
}

const CASES: Case[] = [
  {
    name: '正常: サーブ→ツッツキ→バックドライブ決め',
    situation: 'my_serve',
    expect: 'ok',
    shots: [
      { id: 1, parent: null, player: 'me', col: 'B', depth: 'S', stroke: 'serve', serveMotion: 'forehand', serveFrom: 'B', spin: 'under', isFinisher: false },
      { id: 2, parent: 1, player: 'opp', col: 'B', depth: 'L', stroke: 'push', spin: 'under', isFinisher: false },
      { id: 3, parent: 2, player: 'me', col: 'M', depth: 'L', stroke: 'drive', hand: 'B', spin: 'top', isFinisher: true },
    ],
  },
  {
    name: '不自然: ドライブに真下回転（warn）',
    situation: 'my_serve',
    expect: 'warn',
    shots: [
      { id: 1, parent: null, player: 'me', col: 'B', depth: 'S', stroke: 'serve', serveMotion: 'forehand', serveFrom: 'B', spin: 'under', isFinisher: false },
      { id: 2, parent: 1, player: 'opp', col: 'B', depth: 'L', stroke: 'push', spin: 'under', isFinisher: false },
      { id: 3, parent: 2, player: 'me', col: 'M', depth: 'L', stroke: 'drive', spin: 'under', isFinisher: true },
    ],
  },
  {
    name: '正常: レシーブ（相手サーブ）からチキータ4球目決め',
    situation: 'opp_serve',
    expect: 'ok',
    shots: [
      { id: 1, parent: null, player: 'opp', col: 'B', depth: 'S', stroke: 'serve', spin: 'side_fwd', isFinisher: false },
      { id: 2, parent: 1, player: 'me', col: 'M', depth: 'L', stroke: 'chiquita', hand: 'B', spin: 'top_rev', isFinisher: false },
      { id: 3, parent: 2, player: 'opp', col: 'F', depth: 'H', stroke: 'block', isFinisher: false },
      { id: 4, parent: 3, player: 'me', col: 'B', depth: 'L', stroke: 'drive', hand: 'F', spin: 'top', isFinisher: true },
    ],
  },
  {
    name: '決め球がつなぎ技術（warn）',
    situation: 'my_serve',
    expect: 'warn',
    shots: [
      { id: 1, parent: null, player: 'me', col: 'B', depth: 'S', stroke: 'serve', serveMotion: 'forehand', serveFrom: 'B', spin: 'under', isFinisher: false },
      { id: 2, parent: 1, player: 'opp', col: 'B', depth: 'L', stroke: 'push', spin: 'under', isFinisher: false },
      { id: 3, parent: 2, player: 'me', col: 'F', depth: 'S', stroke: 'stop', spin: 'under', isFinisher: true },
    ],
  },
]

describe('harness eval (ratchet)', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const root = buildTree(c.situation, c.shots as never)
      const issues = checkTree(root, c.situation)
      expect(worstSeverity(issues)).toBe(c.expect)
    })
  }

  it('全体の合格率を記録', () => {
    let pass = 0
    for (const c of CASES) {
      const root = buildTree(c.situation, c.shots as never)
      if (worstSeverity(checkTree(root, c.situation)) === c.expect) pass++
    }
    expect(pass).toBe(CASES.length)
  })
})
