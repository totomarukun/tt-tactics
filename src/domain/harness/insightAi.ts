import { evidenceLabel, statsFor } from '../outcome'
import { profileToText } from '../profile'
import type { PracticeLog, Settings, Tactic, TacticOutcome, Task } from '../types'
import { computeInsights, type Insight } from '../insights'
import { runAgent } from './runner'

// AI インサイト層。決定的インサイト（insights.ts）と実績データを渡し、
// 「今の診断＋次の一つの狙い」を言語化する。チャットではなくカードで先回りする設計。

export interface AiInsight {
  diagnosis: string // 今の状態の見立て（2〜4文）
  oneAim: string // 次に絞る一つの狙い
  focusTacticTitle?: string // 特に見直す/伸ばす戦術（あれば）
  model: string
}

const SYSTEM = `あなたは選手専属の卓球コーチです。選手の戦術・試合結果・気づきのデータを読み、今の状態を短く見立て、次に絞るべき「一つの狙い」を示します。

方針:
- 断定しすぎず、データにある事実（勝率、試した回数、苦手な相手など）に基づく。
- 一度にたくさん言わない。次にやることは一つに絞る。
- 選手に直接語りかける。前向きだが正直に。煽らない。
- 出力は指定 JSON スキーマに従う。`

const SCHEMA = {
  type: 'object',
  properties: {
    diagnosis: { type: 'string', description: '今の状態の見立て。2〜4文。データの事実に触れる' },
    oneAim: { type: 'string', description: '次に絞る一つの狙い。具体的な行動。1〜2文' },
    focusTacticTitle: { type: 'string', description: '特に見直す/伸ばす戦術名（あれば。無ければ空文字）' },
  },
  required: ['diagnosis', 'oneAim'],
}

function dataSummary(tactics: Tactic[], outcomes: TacticOutcome[], insights: Insight[]): string {
  const withRoot = tactics.filter((t) => t.root)
  const lines: string[] = []
  lines.push(`戦術 ${withRoot.length} 件、試合結果 ${outcomes.length} 件。`)
  const rows = withRoot
    .map((t) => ({ t, s: statsFor(t.id, outcomes) }))
    .sort((a, b) => (b.s.winRate ?? -1) - (a.s.winRate ?? -1))
  for (const { t, s } of rows.slice(0, 8)) {
    lines.push(`- ${t.title}（${t.situation === 'my_serve' ? 'サーブ' : 'レシーブ'}／自信度${t.confidence}）: ${evidenceLabel(s)}`)
  }
  if (insights.length) {
    lines.push('', '機械が見つけた気づき:')
    for (const i of insights.slice(0, 6)) lines.push(`- [${i.tone}] ${i.title}`)
  }
  return lines.join('\n')
}

export async function diagnose(settings: Settings, tactics: Tactic[], outcomes: TacticOutcome[], tasks: Task[], logs: PracticeLog[]): Promise<AiInsight> {
  const insights = computeInsights({ tactics, outcomes, tasks, logs })
  const summary = dataSummary(tactics, outcomes, insights)
  const user = `【選手のプロフィール】\n${profileToText(settings)}\n\n【データ】\n${summary}\n\n今の状態を見立て、次に絞る一つの狙いを示してください。`
  const { data, model } = await runAgent<{ diagnosis?: string; oneAim?: string; focusTacticTitle?: string }>(settings, SYSTEM, [{ role: 'user', text: user }], SCHEMA, {
    label: 'insight-diagnose',
    noKnowledge: true,
    temperature: 0.5,
  })
  return {
    diagnosis: data.diagnosis ?? '',
    oneAim: data.oneAim ?? '',
    focusTacticTitle: data.focusTacticTitle?.trim() || undefined,
    model,
  }
}
