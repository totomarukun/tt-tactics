import { proposalToTactic, type TacticProposal } from '../aiTactics'
import { nodeLabel } from '../presets'
import { flatten } from '../tree'
import type { Settings, ShotNode } from '../types'
import { checkTree, type CheckIssue, worstSeverity } from './checks'
import { runAgent } from './runner'

// ハーネスの Sensor（LLM 検証）。生成役とは別の「評価役」が卓球的な妥当性を辛口で点検する。
// 決定的チェック（checks.ts）の結果も判断材料として渡す。

export type Verdict = 'good' | 'revise' | 'reject'

export interface TacticVerdict {
  verdict: Verdict
  assessment: string
  issues: string[]
  /** 決定的チェックの結果 */
  checks: CheckIssue[]
}

export interface VerifyResult {
  verdicts: TacticVerdict[]
  model: string
}

const SYSTEM = `あなたは日本代表クラスの卓球コーチで、他のコーチが作った戦術案を辛口で審査する役です。褒めるのが仕事ではなく、実戦で通用しない点・物理的に無理な点・選手に合わない点を見つけるのが仕事です。

審査基準（ルーブリック）:
1. 回転と技術の整合: 例「下回転のツッツキをドライブと表記」「浮いていない短い下回転を一発でスマッシュ」は不自然。
2. 決め球の妥当性: 決め球は自分の攻撃技術で、直前の球が浮くか甘くなる根拠があるか。
3. コースと展開の現実性: 相手の返球分岐が実戦で起こりやすいか。自分のコース取り（ミドル・バック深く等）が理にかなっているか。
4. 選手適合: 選手の強み・弱み・目指すプレー・利き手に合っているか。弱みを露出しないか。
5. 相手タイプ適合: タグの相手タイプに対して有効か。

各案について verdict を付ける:
- "good": ほぼそのまま使える（軽微な指摘のみ）。
- "revise": 方向は良いが要修正の点がある。issues に具体的に書く。
- "reject": 卓球的に無理、または選手に明確に合わない。

甘い判定を避け、少しでも疑問があれば "revise" にする。issues は選手が直せるよう具体的に（「3球目のバックドライブは相手のツッツキが下回転なので、真上でなく順横上か上回転が自然」のように）。日本語。出力は指定 JSON スキーマに従う。`

const SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer', description: '対象の戦術案の番号（0始まり）' },
          verdict: { type: 'string', enum: ['good', 'revise', 'reject'] },
          assessment: { type: 'string', description: '総評（1〜2文）' },
          issues: { type: 'array', items: { type: 'string' }, description: '具体的な指摘（0〜4個）' },
        },
        required: ['index', 'verdict', 'assessment', 'issues'],
      },
    },
  },
  required: ['verdicts'],
}

function shotsText(root: ShotNode | null): string {
  if (!root) return '（球なし）'
  return flatten(root)
    .map(({ node, depth }) => `${'  '.repeat(depth)}- ${nodeLabel(node)}${node.isFinisher ? ' ★決め球' : ''}${node.note ? `（${node.note}）` : ''}`)
    .join('\n')
}

export async function verifyTactics(settings: Settings, proposals: TacticProposal[]): Promise<VerifyResult> {
  // 各案をツリー化し、決定的チェックを先に取る
  const built = proposals.map((p) => {
    const data = proposalToTactic(p, settings)
    const checks = data ? checkTree(data.root, data.situation) : [{ severity: 'error' as const, code: 'build', message: 'ツリーを組み立てられませんでした' }]
    return { p, root: data?.root ?? null, checks }
  })

  const listText = built
    .map((b, i) => {
      const checkLines = b.checks.length ? `\n  機械チェックの指摘: ${b.checks.map((c) => `[${c.severity}] ${c.message}`).join(' / ')}` : ''
      return `【案 ${i}】${b.p.title}（${b.p.situation === 'my_serve' ? '自分サーブ' : 'レシーブ'}）\n狙い: ${b.p.goal}\n根拠: ${b.p.reasoning}\n展開:\n${shotsText(b.root)}${checkLines}`
    })
    .join('\n\n')

  const user = `【選手情報】\n${settings.profile ? JSON.stringify(settings.profile) : '（診断未入力）'}\n\n【審査対象の戦術案】\n${listText}\n\n各案を審査し、verdict と指摘を JSON で返してください。機械チェックの指摘も判断材料にしてください。`

  const { data, model } = await runAgent<{ verdicts?: { index: number; verdict: Verdict; assessment: string; issues: string[] }[] }>(
    settings,
    SYSTEM,
    [{ role: 'user', text: user }],
    SCHEMA,
    { label: 'verify-tactics', kind: 'verify-tactics', temperature: 0.3 },
  )

  // index で対応付け。返らなかった案は決定的チェックのみで判定
  const byIndex = new Map((data.verdicts ?? []).map((v) => [v.index, v]))
  const verdicts: TacticVerdict[] = built.map((b, i) => {
    const v = byIndex.get(i)
    const worst = worstSeverity(b.checks)
    const base: Verdict = worst === 'error' ? 'reject' : worst === 'warn' ? 'revise' : 'good'
    if (!v) return { verdict: base, assessment: '（AI 審査の対象外。機械チェックのみ）', issues: [], checks: b.checks }
    // 機械チェックで error があれば AI が good と言っても revise 以上に引き上げる
    const verdict: Verdict = worst === 'error' ? 'reject' : v.verdict === 'good' && worst === 'warn' ? 'revise' : v.verdict
    return { verdict, assessment: v.assessment, issues: v.issues ?? [], checks: b.checks }
  })

  return { verdicts, model }
}
