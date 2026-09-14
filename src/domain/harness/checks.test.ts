import { describe, expect, it } from 'vitest'
import { checkTree } from './checks'
import { addChild, createShot } from '../tree'
import type { ShotNode } from '../types'

function serve(): ShotNode {
  return createShot({ player: 'me', zone: { side: 'opp', col: 'B', depth: 'S' }, stroke: 'serve', serveMotion: 'forehand', serveFrom: 'B', spin: 'under' })
}

describe('checkTree', () => {
  it('正常なツリーは error を出さない', () => {
    let root = serve()
    const push = createShot({ player: 'opp', zone: { side: 'me', col: 'B', depth: 'L' }, stroke: 'push', spin: 'under' })
    root = addChild(root, root.id, push)
    const drive = createShot({ player: 'me', zone: { side: 'opp', col: 'M', depth: 'L' }, stroke: 'drive', hand: 'B', spin: 'top', isFinisher: true })
    root = addChild(root, push.id, drive)
    const issues = checkTree(root, 'my_serve')
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0)
  })

  it('打者が交互でないと error', () => {
    let root = serve()
    const bad = createShot({ player: 'me', zone: { side: 'opp', col: 'B', depth: 'L' }, stroke: 'drive' })
    root = addChild(root, root.id, bad)
    expect(checkTree(root, 'my_serve').some((i) => i.code === 'alternation')).toBe(true)
  })

  it('回転と技術の不整合を warn する（ドライブに下回転）', () => {
    let root = serve()
    const opp = createShot({ player: 'opp', zone: { side: 'me', col: 'B', depth: 'L' }, stroke: 'push', spin: 'under' })
    root = addChild(root, root.id, opp)
    const drive = createShot({ player: 'me', zone: { side: 'opp', col: 'M', depth: 'L' }, stroke: 'drive', spin: 'under', isFinisher: true })
    root = addChild(root, opp.id, drive)
    expect(checkTree(root, 'my_serve').some((i) => i.code === 'spin-stroke')).toBe(true)
  })

  it('相手サーブ状況で根が自分だと root-player の error', () => {
    const root = serve() // player: me
    expect(checkTree(root, 'opp_serve').some((i) => i.code === 'root-player')).toBe(true)
  })

  it('決め球が無いと warn、つなぎ技術の決め球も warn', () => {
    let root = serve()
    const opp = createShot({ player: 'opp', zone: { side: 'me', col: 'B', depth: 'L' }, stroke: 'push', spin: 'under' })
    root = addChild(root, root.id, opp)
    expect(checkTree(root, 'my_serve').some((i) => i.code === 'no-finisher')).toBe(true)
    const stop = createShot({ player: 'me', zone: { side: 'opp', col: 'F', depth: 'S' }, stroke: 'stop', spin: 'under', isFinisher: true })
    root = addChild(root, opp.id, stop)
    expect(checkTree(root, 'my_serve').some((i) => i.code === 'weak-finisher')).toBe(true)
  })
})
