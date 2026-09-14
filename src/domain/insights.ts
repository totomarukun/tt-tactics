import { failureTagCounts, statsFor } from './outcome'
import type { PracticeLog, Tactic, TacticOutcome, Task } from './types'

// あなたのデータから気づきを見つける決定的エンジン（LLM なし）。
// 上達ループの Sensor を「次の一手」に翻訳する。AI のインサイト層はこの上に載せる。

export type InsightTone = 'good' | 'warn' | 'info'
export type InsightView = 'detail' | 'tasks' | 'practice' | 'consult'

export interface InsightAction {
  label: string
  view: InsightView
  tacticId?: string
}
export interface Insight {
  id: string
  tone: InsightTone
  priority: number // 高いほど上
  title: string
  detail: string
  action?: InsightAction
}

export interface InsightInput {
  tactics: Tactic[]
  outcomes: TacticOutcome[]
  tasks: Task[]
  logs: PracticeLog[]
}

const daysSince = (date: string): number => Math.floor((Date.now() - new Date(date).getTime()) / 86400000)

export function computeInsights(input: InsightInput): Insight[] {
  const { tactics, outcomes, tasks, logs } = input
  const out: Insight[] = []
  const withRoot = tactics.filter((t) => t.root)

  // データが乏しいときは「記録を促す」だけ返す
  if (outcomes.length < 3 && withRoot.length > 0) {
    out.push({
      id: 'seed-outcomes',
      tone: 'info',
      priority: 40,
      title: '試合結果を記録すると気づきが増える',
      detail: '戦術を試合で試したら◎△✕を記録しましょう。3回たまると、効いている戦術と苦手な相手が見えてきます。',
      action: withRoot[0] ? { label: '戦術を開く', view: 'detail', tacticId: withRoot[0].id } : undefined,
    })
  }

  // 状況別の勝率差（サーブ vs レシーブ）
  const bySit = (sit: Tactic['situation']) => {
    const ids = new Set(tactics.filter((t) => t.situation === sit).map((t) => t.id))
    const o = outcomes.filter((x) => ids.has(x.tacticId))
    const won = o.filter((x) => x.result === 'won').length
    const lost = o.filter((x) => x.result === 'lost').length
    return { n: won + lost, rate: won + lost > 0 ? won / (won + lost) : null }
  }
  const serve = bySit('my_serve')
  const rec = bySit('opp_serve')
  if (serve.rate !== null && rec.rate !== null && serve.n >= 3 && rec.n >= 3 && Math.abs(serve.rate - rec.rate) >= 0.25) {
    const weak = serve.rate < rec.rate ? 'サーブから' : 'レシーブから'
    const rate = Math.round(Math.min(serve.rate, rec.rate) * 100)
    out.push({
      id: 'situation-gap',
      tone: 'warn',
      priority: 85,
      title: `${weak}の展開が弱い（${rate}%）`,
      detail: `${weak}の戦術の勝率が低めです。ここを重点的に見直すと伸びしろが大きいです。`,
      action: { label: 'コーチに相談', view: 'consult' },
    })
  }

  // 戦術ごとの実績
  for (const t of withRoot) {
    const s = statsFor(t.id, outcomes)
    if (s.tried >= 3 && s.winRate !== null && s.winRate >= 0.7) {
      out.push({
        id: `strong-${t.id}`,
        tone: 'good',
        priority: 70,
        title: `「${t.title}」が効いている（${Math.round(s.winRate * 100)}%）`,
        detail: '実績が良い戦術です。試合で積極的に使い、派生パターンを増やすと武器になります。',
        action: { label: '開く', view: 'detail', tacticId: t.id },
      })
    } else if (s.tried >= 3 && s.winRate !== null && s.winRate < 0.4) {
      out.push({
        id: `weak-${t.id}`,
        tone: 'warn',
        priority: 80,
        title: `「${t.title}」が効いていない（${Math.round(s.winRate * 100)}%）`,
        detail: '試合で決まっていません。展開を見直すか、AI コーチに相談して修正案をもらいましょう。',
        action: { label: 'コーチに相談', view: 'consult' },
      })
    } else if (s.tried === 0 && t.confidence >= 2) {
      out.push({
        id: `untried-${t.id}`,
        tone: 'info',
        priority: 60,
        title: `「${t.title}」をまだ試合で試していない`,
        detail: '自信ありに設定されていますが、実戦の記録がありません。次の試合で試して結果を残しましょう。',
        action: { label: '開く', view: 'detail', tacticId: t.id },
      })
    }
  }

  // 苦手な相手（outcome の opponent 別 lost 率）
  const byOpp = new Map<string, { won: number; lost: number }>()
  for (const o of outcomes) {
    if (!o.opponent) continue
    const e = byOpp.get(o.opponent) ?? { won: 0, lost: 0 }
    if (o.result === 'won') e.won++
    else if (o.result === 'lost') e.lost++
    byOpp.set(o.opponent, e)
  }
  for (const [opp, e] of byOpp) {
    if (e.won + e.lost >= 3 && e.lost / (e.won + e.lost) >= 0.6) {
      out.push({
        id: `hard-opp-${opp}`,
        tone: 'warn',
        priority: 75,
        title: `「${opp}」に苦戦している`,
        detail: `この相手に対して勝率が低めです。攻略法をコーチに相談すると突破口が見つかるかもしれません。`,
        action: { label: 'コーチに相談', view: 'consult' },
      })
    }
  }

  // 頻出の崩れ方（敗因タグ）
  const failures = failureTagCounts(outcomes)
  if (failures.length > 0 && failures[0].count >= 2) {
    out.push({
      id: `failure-${failures[0].tag}`,
      tone: 'warn',
      priority: 82,
      title: `崩れ方の傾向: 「${failures[0].tag}」が ${failures[0].count} 回`,
      detail: '負けや五分の場面で繰り返している崩れ方です。ここを埋める練習や戦術をコーチに相談しましょう。',
      action: { label: 'コーチに相談', view: 'consult' },
    })
  }

  // 練習と試合のギャップ: 練習した戦術を試合で試していない
  const practicedTaskIds = new Set(logs.flatMap((l) => l.items.map((i) => i.taskId)))
  for (const t of withRoot) {
    const linked = tasks.filter((k) => k.tacticIds.includes(t.id))
    const practiced = linked.some((k) => practicedTaskIds.has(k.id))
    const tried = statsFor(t.id, outcomes).tried > 0
    if (practiced && !tried) {
      out.push({
        id: `practiced-untried-${t.id}`,
        tone: 'info',
        priority: 55,
        title: `「${t.title}」は練習済み。試合で試そう`,
        detail: '練習した戦術を試合で使って、効くかどうかを確かめましょう。',
        action: { label: '開く', view: 'detail', tacticId: t.id },
      })
    }
  }

  // 放置課題
  const stale = tasks.filter((k) => k.status === 'open' && daysSince(k.createdAt) >= 14 && !practicedTaskIds.has(k.id))
  if (stale.length >= 2) {
    out.push({
      id: 'stale-tasks',
      tone: 'info',
      priority: 45,
      title: `${stale.length} 件の課題が手つかず`,
      detail: '2週間以上、練習記録のない課題があります。今日の練習に1つ入れてみましょう。',
      action: { label: '練習を開く', view: 'practice' },
    })
  }

  // 戦術はあるが課題が無い（ループが繋がっていない）
  const noTask = withRoot.filter((t) => !tasks.some((k) => k.tacticIds.includes(t.id)))
  if (noTask.length >= 1 && outcomes.length >= 1) {
    out.push({
      id: 'no-task',
      tone: 'info',
      priority: 42,
      title: `${noTask.length} 件の戦術に練習課題が無い`,
      detail: '戦術を身につけるには練習課題が要ります。AI コーチにメニューを作ってもらいましょう。',
      action: noTask[0] ? { label: '開く', view: 'detail', tacticId: noTask[0].id } : undefined,
    })
  }

  return out.sort((a, b) => b.priority - a.priority)
}
