import { nodeLabel } from '../presets'
import { flatten } from '../tree'
import type { ShotNode, Spin, StrokeType, Tactic } from '../types'

// ハーネスの Sensor（決定的な検証）。LLM を使わず、卓球のルール・整合性を機械的に点検する。
// AI 提案とユーザー入力の両方に使える。verify.ts と eval の土台。

export type Severity = 'error' | 'warn'

export interface CheckIssue {
  severity: Severity
  code: string
  message: string
  nodeId?: string
}

type SpinFamily = 'top' | 'under' | 'side' | 'none'

function spinFamily(spin: Spin | undefined): SpinFamily | undefined {
  if (!spin) return undefined
  if (spin.startsWith('top')) return 'top'
  if (spin.startsWith('under')) return 'under'
  if (spin === 'none') return 'none'
  return 'side'
}

// 技術が本来生む回転の系統。ここから外れると物理的に不自然。
const STROKE_EXPECTS: Partial<Record<StrokeType, SpinFamily[]>> = {
  push: ['under', 'side'],
  stop: ['under', 'side', 'none'],
  chop: ['under'],
  drive: ['top', 'side'],
  loop: ['top'],
  flick: ['top', 'side'],
  chiquita: ['top', 'side'],
  counter: ['top', 'side'],
  smash: ['none', 'top'],
}

function alternates(root: ShotNode): CheckIssue[] {
  const out: CheckIssue[] = []
  const walk = (n: ShotNode) => {
    for (const c of n.children) {
      if (c.player === n.player) {
        out.push({ severity: 'error', code: 'alternation', message: `打者が交互になっていません（${nodeLabel(n)} の次も同じ打者）`, nodeId: c.id })
      }
      walk(c)
    }
  }
  walk(root)
  return out
}

/** ツリー1本の決定的チェック。situation は根の打者検証に使う */
export function checkTree(root: ShotNode | null, situation: 'my_serve' | 'opp_serve'): CheckIssue[] {
  const issues: CheckIssue[] = []
  if (!root) {
    issues.push({ severity: 'error', code: 'empty', message: '球が1つも登録されていません' })
    return issues
  }

  // 根はサーブ、打者は状況と一致
  if (root.stroke !== 'serve') issues.push({ severity: 'error', code: 'root-serve', message: '1球目がサーブになっていません', nodeId: root.id })
  const expectRootPlayer = situation === 'my_serve' ? 'me' : 'opp'
  if (root.player !== expectRootPlayer) {
    issues.push({ severity: 'error', code: 'root-player', message: `1球目の打者が状況（${situation === 'my_serve' ? '自分サーブ' : '相手サーブ'}）と一致しません`, nodeId: root.id })
  }
  if (root.stroke === 'serve' && !root.spin) {
    issues.push({ severity: 'warn', code: 'serve-spin', message: 'サーブの回転が指定されていません', nodeId: root.id })
  }

  issues.push(...alternates(root))

  const nodes = flatten(root).map((f) => f.node)

  // 回転と技術の整合
  for (const n of nodes) {
    if (n.stroke === 'serve') continue
    const fam = spinFamily(n.spin)
    const expect = STROKE_EXPECTS[n.stroke]
    if (fam && expect && !expect.includes(fam)) {
      const label = { top: '上系', under: '下系', side: '横', none: 'ナックル' }[fam]
      issues.push({ severity: 'warn', code: 'spin-stroke', message: `${nodeLabel(n)}: 技術と回転（${label}）が不自然かもしれません`, nodeId: n.id })
    }
  }

  // 決め球
  const finishers = nodes.filter((n) => n.isFinisher)
  if (finishers.length === 0) {
    issues.push({ severity: 'warn', code: 'no-finisher', message: '決め球（★）が設定されていません', nodeId: root.id })
  }
  for (const f of finishers) {
    if (f.player !== 'me') {
      issues.push({ severity: 'warn', code: 'opp-finisher', message: `決め球が相手の球になっています（${nodeLabel(f)}）。自分の得点で終える形が基本です`, nodeId: f.id })
    }
    if (['push', 'stop', 'chop', 'block'].includes(f.stroke)) {
      issues.push({ severity: 'warn', code: 'weak-finisher', message: `${nodeLabel(f)}: 決め球がつなぎ技術です。攻撃技術で終える形が基本です`, nodeId: f.id })
    }
  }

  // 各葉（分岐の終端）は自分の球で終わっているのが基本
  for (const f of flatten(root)) {
    if (f.node.children.length === 0 && f.node.player === 'opp' && !f.node.isFinisher) {
      issues.push({ severity: 'warn', code: 'ends-on-opp', message: `分岐が相手の球で終わっています（${nodeLabel(f.node)}）。自分の対応まで入れると展開が完成します`, nodeId: f.node.id })
    }
  }

  return issues
}

export function checkTactic(t: Tactic): CheckIssue[] {
  return checkTree(t.root, t.situation)
}

export function worstSeverity(issues: CheckIssue[]): Severity | 'ok' {
  if (issues.some((i) => i.severity === 'error')) return 'error'
  if (issues.some((i) => i.severity === 'warn')) return 'warn'
  return 'ok'
}
