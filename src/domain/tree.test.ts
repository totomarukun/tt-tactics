import { describe, expect, it } from 'vitest'
import {
  addChild,
  createShot,
  defaultPath,
  findPath,
  flatten,
  removeNode,
  updateNode,
} from './tree'
import type { ShotNode } from './types'

const serve = (): ShotNode =>
  createShot({
    player: 'me',
    zone: { side: 'opp', col: 'F', depth: 'S' },
    stroke: 'serve',
    serveType: 'under',
    serveFrom: 'B',
  })
const push = (): ShotNode =>
  createShot({ player: 'opp', zone: { side: 'me', col: 'B', depth: 'L' }, stroke: 'push' })
const drive = (fin = false): ShotNode =>
  createShot({
    player: 'me',
    zone: { side: 'opp', col: 'M', depth: 'L' },
    stroke: 'drive',
    hand: 'B',
    isFinisher: fin,
  })

describe('tree', () => {
  it('addChild と findPath', () => {
    let root = serve()
    const p = push()
    root = addChild(root, root.id, p)
    const d = drive()
    root = addChild(root, p.id, d)
    expect(findPath(root, d.id)?.map((n) => n.id)).toEqual([root.id, p.id, d.id])
    expect(findPath(root, 'nope')).toBeNull()
  })

  it('updateNode は他ノードを変えない', () => {
    let root = serve()
    const p = push()
    root = addChild(root, root.id, p)
    const next = updateNode(root, p.id, { note: 'x' })
    expect(findPath(next, p.id)?.[1].note).toBe('x')
    expect(next.note).toBeUndefined()
  })

  it('removeNode は根を消さない', () => {
    let root = serve()
    const p = push()
    root = addChild(root, root.id, p)
    expect(removeNode(root, root.id).id).toBe(root.id)
    expect(removeNode(root, p.id).children).toHaveLength(0)
  })

  it('defaultPath は決め球優先', () => {
    let root = serve()
    const p1 = push()
    const p2 = push()
    root = addChild(root, root.id, p1)
    root = addChild(root, root.id, p2)
    const fin = drive(true)
    root = addChild(root, p2.id, fin)
    expect(defaultPath(root).map((n) => n.id)).toEqual([root.id, p2.id, fin.id])
    expect(defaultPath(null)).toEqual([])
  })

  it('flatten は深さ付きで DFS 順', () => {
    let root = serve()
    const p = push()
    root = addChild(root, root.id, p)
    root = addChild(root, p.id, drive())
    const f = flatten(root)
    expect(f.map((x) => x.depth)).toEqual([0, 1, 2])
    expect(f[1].parentId).toBe(root.id)
  })
})
