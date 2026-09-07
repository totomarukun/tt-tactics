import type { Player, ShotNode } from './types'

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function otherPlayer(p: Player): Player {
  return p === 'me' ? 'opp' : 'me'
}

export function createShot(data: Omit<ShotNode, 'id' | 'children'>): ShotNode {
  return { ...data, id: newId(), children: [] }
}

/** 根から指定ノードまでの経路。見つからなければ null */
export function findPath(root: ShotNode | null, id: string): ShotNode[] | null {
  if (!root) return null
  if (root.id === id) return [root]
  for (const c of root.children) {
    const p = findPath(c, id)
    if (p) return [root, ...p]
  }
  return null
}

export function findNode(root: ShotNode | null, id: string): ShotNode | null {
  const p = findPath(root, id)
  return p ? p[p.length - 1] : null
}

/** 表示用の既定経路。決め球があればそこまで、なければ先頭の子を辿って葉まで */
export function defaultPath(root: ShotNode | null): ShotNode[] {
  if (!root) return []
  const toFinisher = (n: ShotNode): ShotNode[] | null => {
    if (n.isFinisher) return [n]
    for (const c of n.children) {
      const p = toFinisher(c)
      if (p) return [n, ...p]
    }
    return null
  }
  const f = toFinisher(root)
  if (f) return f
  const path: ShotNode[] = []
  let cur: ShotNode | undefined = root
  while (cur) {
    path.push(cur)
    cur = cur.children[0]
  }
  return path
}

function mapTree(root: ShotNode, fn: (n: ShotNode) => ShotNode | null): ShotNode | null {
  const mapped = fn(root)
  if (!mapped) return null
  const children = mapped.children
    .map((c) => mapTree(c, fn))
    .filter((c): c is ShotNode => c !== null)
  return { ...mapped, children }
}

export function addChild(root: ShotNode, parentId: string, child: ShotNode): ShotNode {
  return (
    mapTree(root, (n) =>
      n.id === parentId ? { ...n, children: [...n.children, child] } : n,
    ) ?? root
  )
}

export function updateNode(
  root: ShotNode,
  id: string,
  patch: Partial<Omit<ShotNode, 'id' | 'children'>>,
): ShotNode {
  return mapTree(root, (n) => (n.id === id ? { ...n, ...patch } : n)) ?? root
}

/** 根は削除できない。削除したら root をそのまま返す */
export function removeNode(root: ShotNode, id: string): ShotNode {
  if (root.id === id) return root
  return mapTree(root, (n) => (n.id === id ? null : n)) ?? root
}

export function countNodes(root: ShotNode | null): number {
  if (!root) return 0
  return 1 + root.children.reduce((s, c) => s + countNodes(c), 0)
}

export interface FlatNode {
  node: ShotNode
  depth: number
  parentId: string | null
}

/** 分岐ツリーを深さ優先で平坦化（縦リスト描画用） */
export function flatten(root: ShotNode | null): FlatNode[] {
  const out: FlatNode[] = []
  const walk = (n: ShotNode, depth: number, parentId: string | null) => {
    out.push({ node: n, depth, parentId })
    n.children.forEach((c) => walk(c, depth + 1, n.id))
  }
  if (root) walk(root, 0, null)
  return out
}
