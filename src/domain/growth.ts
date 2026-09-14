import { statsFor } from './outcome'
import type { Focus, Tactic, TacticOutcome } from './types'

// 成長実感（研究09）。数字の羅列でなく「効果が目に見える」形に。
// 武器コレクション / 封じた崩れ方 / Then vs Now / 卒業した焦点。

const DAY = 86400000

export type WeaponStage = 'weapon' | 'growing' | 'untried'

export interface WeaponBuckets {
  weapon: Tactic[] // 決まる武器（試行3以上・勝率60%以上）
  growing: Tactic[] // 育成中（試したが未証明）
  untried: Tactic[] // 未実戦
}

export function weaponStage(t: Tactic, outcomes: TacticOutcome[]): WeaponStage {
  const s = statsFor(t.id, outcomes)
  if (s.tried >= 3 && s.winRate !== null && s.winRate >= 0.6) return 'weapon'
  if (s.tried >= 1) return 'growing'
  return 'untried'
}

export function weaponBuckets(tactics: Tactic[], outcomes: TacticOutcome[]): WeaponBuckets {
  const b: WeaponBuckets = { weapon: [], growing: [], untried: [] }
  for (const t of tactics.filter((x) => x.root)) b[weaponStage(t, outcomes)].push(t)
  return b
}

export interface SealedFailure {
  tag: string
  total: number
}

/** 封じた崩れ方: 以前2回以上あったが、直近(既定30日)には出ていない敗因 */
export function sealedFailures(outcomes: TacticOutcome[], now = Date.now(), windowDays = 30): SealedFailure[] {
  const cutoff = now - windowDays * DAY
  const total = new Map<string, number>()
  const recent = new Map<string, number>()
  const old = new Map<string, number>()
  for (const o of outcomes) {
    const t = new Date(o.date).getTime()
    for (const tag of o.failureTags ?? []) {
      total.set(tag, (total.get(tag) ?? 0) + 1)
      if (t >= cutoff) recent.set(tag, (recent.get(tag) ?? 0) + 1)
      else old.set(tag, (old.get(tag) ?? 0) + 1)
    }
  }
  const out: SealedFailure[] = []
  for (const [tag, n] of total) {
    if (n >= 2 && !recent.get(tag) && (old.get(tag) ?? 0) >= 1) out.push({ tag, total: n })
  }
  return out.sort((a, b) => b.total - a.total)
}

export interface ThenNow {
  then: number // %
  now: number // %
  delta: number
}

/** Then vs Now: 決着した試合を時系列で二分し、前半と後半の勝率を比べる。サンプル不足なら null */
export function winRateThenNow(outcomes: TacticOutcome[]): ThenNow | null {
  const decisive = outcomes
    .filter((o) => o.result === 'won' || o.result === 'lost')
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  if (decisive.length < 6) return null
  const mid = Math.floor(decisive.length / 2)
  const rate = (arr: TacticOutcome[]) => Math.round((arr.filter((o) => o.result === 'won').length / arr.length) * 100)
  const then = rate(decisive.slice(0, mid))
  const now = rate(decisive.slice(mid))
  return { then, now, delta: now - then }
}

export function graduatedFocusCount(focuses: Focus[]): number {
  return focuses.filter((f) => f.done).length
}

export interface GrowthHighlight {
  text: string
  tone: 'good' | 'info'
}

/** ホームに出す一番の成長シグナル。無ければ null */
export function topHighlight(tactics: Tactic[], outcomes: TacticOutcome[], focuses: Focus[]): GrowthHighlight | null {
  const b = weaponBuckets(tactics, outcomes)
  const tn = winRateThenNow(outcomes)
  const sealed = sealedFailures(outcomes)
  const grad = graduatedFocusCount(focuses)
  if (tn && tn.delta >= 10) return { text: `勝率が上がっています（以前 ${tn.then}% → 今 ${tn.now}%）`, tone: 'good' }
  if (b.weapon.length >= 1) return { text: `武器になった戦術が ${b.weapon.length} 個あります`, tone: 'good' }
  if (sealed.length >= 1) return { text: `「${sealed[0].tag}」の崩れ方を最近は出していません`, tone: 'good' }
  if (grad >= 1) return { text: `これまでに ${grad} 個の焦点を達成しました`, tone: 'info' }
  return null
}
