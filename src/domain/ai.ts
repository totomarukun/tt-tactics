import { geminiJson } from './gemini'
import { nodeLabel } from './presets'
import { profileToText } from './profile'
import type { Settings, ShotNode, Tactic, Task } from './types'

export interface DrillProposal {
  title: string
  purpose: string
  detail: string
  /** 何球目・どの分岐を鍛えるか（説明用） */
  target: string
}

export interface CoachResponse {
  drills: DrillProposal[]
  coachNote: string
  /** 実際に使ったモデル名 */
  model: string
}

/** ツリーの全経路を「1. 自分 ... → 2. 相手 ...」の行に展開する */
export function tacticToText(t: Tactic): string {
  const lines: string[] = []
  const walk = (n: ShotNode, trail: ShotNode[]) => {
    const path = [...trail, n]
    if (n.children.length === 0) {
      lines.push(
        path
          .map((s, i) => `${i + 1}. ${nodeLabel(s)}${s.isFinisher ? '【決め球】' : ''}${s.note ? `（メモ: ${s.note}）` : ''}`)
          .join(' / '),
      )
      return
    }
    n.children.forEach((c) => walk(c, path))
  }
  if (t.root) walk(t.root, [])
  const head = [
    `戦術名: ${t.title}`,
    `状況: ${t.situation === 'my_serve' ? '自分のサーブから' : '相手のサーブから（レシーブ）'}`,
    t.goal ? `狙い: ${t.goal}` : '',
    t.tags.length ? `想定する相手: ${t.tags.join('、')}` : '',
    `相手の利き手: ${t.oppHand === 'left' ? '左' : '右'}`,
    `自信度: ${['練習中', '実戦で使える', '得意'][t.confidence - 1]}`,
    '',
    '展開（分岐ごとに1行。ゾーンは「前＝台上2バウンド／ハーフ＝ハーフロング／奥＝ロング」）:',
  ].filter((l) => l !== '')
  return [...head, ...(lines.length ? lines : ['（まだ球が登録されていません）'])].join('\n')
}

const SYSTEM = `あなたは日本のトップレベルで指導経験のある卓球コーチです。選手が登録した戦術（サーブやレシーブからの展開ツリー）を読み、その戦術を試合で決められるようになるための練習メニューを設計します。

設計の方針:
- 戦術のどの球（何球目・どの分岐）を鍛えるメニューなのかを必ず明示する。
- 多球練習、システム練習（パターン練習）、ゲーム形式の3種類を組み合わせる。決め球だけでなく、その前の球の質（回転量、深さ、コース）や相手の返球への対応も対象にする。
- 球出しの内容、コース、回転、本数またはセット数、成功の目安（例: 10本中7本）を具体的に書く。一人でできるかパートナーが必要かも書く。
- 選手のプレースタイル・用具・利き手を踏まえる。一般論ではなく、この戦術に固有の課題に絞る。
- 提案は4〜6個。多すぎない。
- 日本語で、選手に直接語りかける文体で書く。専門用語はそのまま使ってよい。
- 出力は指定された JSON スキーマに従う。`

const DRILLS_SCHEMA = {
  type: 'object',
  properties: {
    coachNote: { type: 'string', description: '戦術全体への短いコメント（弱点や優先順位）。2〜3文' },
    drills: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '練習メニュー名（20文字以内）' },
          target: { type: 'string', description: '鍛える球や分岐（例: 3球目バックドライブの質、相手ストップへの対応）' },
          purpose: { type: 'string', description: 'この練習の狙い（1〜2文）' },
          detail: {
            type: 'string',
            description: 'やり方。球出し・コース・回転・本数やセット数・成功の目安・必要な人数を具体的に。改行可',
          },
        },
        required: ['title', 'target', 'purpose', 'detail'],
      },
    },
  },
  required: ['coachNote', 'drills'],
}

export async function suggestDrills(tactic: Tactic, settings: Settings, existingTasks: Task[]): Promise<CoachResponse> {
  const existing = existingTasks.length
    ? `\n\nすでに登録済みの練習課題（重複しない提案にすること）:\n${existingTasks.map((t) => `- ${t.title}`).join('\n')}`
    : ''
  const user = `【選手のプロフィール】\n${profileToText(settings)}\n\n【戦術】\n${tacticToText(tactic)}${existing}\n\nこの戦術を実戦で決められるようにする練習メニューを提案してください。`
  const { data, model } = await geminiJson<{ drills?: DrillProposal[]; coachNote?: string }>(
    settings,
    SYSTEM,
    [{ role: 'user', text: user }],
    DRILLS_SCHEMA,
  )
  if (!Array.isArray(data.drills)) throw new Error('Gemini の応答に練習メニューが含まれていません')
  return { drills: data.drills, coachNote: data.coachNote ?? '', model }
}
