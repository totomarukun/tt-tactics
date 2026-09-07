import { geminiJson, type GeminiTurn } from './gemini'
import { knowledgeBlock } from './knowledge'
import { SERVE_MOTION_LABEL, STROKE_LABEL } from './presets'
import { profileToText } from './profile'
import { SPIN_LABEL } from './spin'
import { newId } from './tree'
import type { BallHeight, Col, Depth, Hand, ServeMotion, Settings, ShotNode, Spin, StrokeType, Tactic } from './types'
import { tacticToText } from './ai'

// ---------- AI から受け取る形（フラットなショット一覧） ----------

interface FlatShot {
  id: number
  parent: number | null
  player: 'me' | 'opp'
  col: Col
  depth: Depth
  stroke: StrokeType
  hand?: Hand | ''
  serveMotion?: ServeMotion | ''
  serveFrom?: Col | ''
  spin?: Spin | ''
  height?: BallHeight | ''
  isFinisher?: boolean
  note?: string
}

export interface TacticProposal {
  title: string
  situation: 'my_serve' | 'opp_serve'
  goal: string
  tags: string[]
  reasoning: string
  shots: FlatShot[]
}

export interface ProposalResponse {
  summary: string
  tactics: TacticProposal[]
  model: string
}

export interface FollowUpResponse {
  questions: string[]
  model: string
}

// ---------- 語彙の説明（AI に渡す） ----------

const VOCAB = `【このアプリのデータ形式】
戦術は「ショットのツリー」。1球目（サーブ）を根として、相手の返球ごとに分岐し、自分の対応が続く。自分と相手が交互に打つ。

各ショットのフィールド:
- id: 1 から始まる連番。parent: 直前の球の id（根は null）。
- player: "me"（選手自身）または "opp"（相手）。根から交互になる。
- col: 着点の左右。着点があるコートの持ち主から見た "F"（フォア側）/"M"（ミドル）/"B"（バック側）。例: 自分が相手のバック側に打つなら col="B"。
- depth: 着点の深さ。"S"＝台上2バウンドする短い球、"H"＝ハーフロング（エンドラインぎりぎり、出るか出ないか）、"L"＝ロング（深い）。
- stroke: ${Object.entries(STROKE_LABEL)
  .map(([k, v]) => `"${k}"=${v}`)
  .join(', ')}。根のサーブは必ず "serve"。
- hand: "F"（フォア面）/"B"（バック面）。サーブでは空。
- serveMotion（サーブのみ）: ${Object.entries(SERVE_MOTION_LABEL)
  .map(([k, v]) => `"${k}"=${v}`)
  .join(', ')}。
- serveFrom（自分のサーブのみ）: サーブを出す位置。自コートの "F"/"M"/"B"。
- spin: ${Object.entries(SPIN_LABEL)
  .map(([k, v]) => `"${k}"=${v}`)
  .join(', ')}。fwd＝順横（フォア面の横回転）、rev＝逆横（YG・バック・巻き込み系）。サーブとレシーブには必ず入れる。
- height: "low"（低い）/"high"（浮いた）。不要なら空。
- isFinisher: その球が決め球なら true。各戦術に1つ以上。
- note: 短いコツ（例: 「肘を前に出して面を作る」）。任意。

ツリーの作り方:
- 相手の返球は現実的な 2〜3 通りに分岐させる（例: ツッツキ／ストップ／フリック）。各分岐に自分の次の一手を必ず付け、決め球まで 3〜5 球で完結させる。
- 根の直下の分岐だけでなく、3球目の後に相手のブロック／カウンターで分岐させてもよい。
- 1つの戦術のショット数は 6〜14 程度。`

const SYSTEM = `あなたは日本のトップレベルで指導経験のある卓球コーチです。選手のプレースタイル、強み、弱み、目指すプレーを踏まえて、その選手が試合で得点するための戦術（サーブ／レシーブからの展開パターン）を設計します。

方針:
- 強みで得点し、弱みが露出しにくい展開を組む。願望（こういうプレーがしたい）は尊重しつつ、現実的に実行できる形に落とし込む。
- サーブからの戦術とレシーブからの戦術の両方を含める。
- 提案は 3〜5 個。似た戦術を並べない。各戦術に「なぜこの選手に合うか」を書く。
- 相手の返球の分岐には、実戦で多いものを選ぶ。
- 日本語で、選手に直接語りかける文体。専門用語はそのまま使ってよい。
- 出力は指定された JSON スキーマに従う。

${VOCAB}`

const ENUM = (vals: string[], allowEmpty = false) => ({ type: 'string', enum: allowEmpty ? ['', ...vals] : vals })

const SHOT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    parent: { type: ['integer', 'null'] },
    player: ENUM(['me', 'opp']),
    col: ENUM(['F', 'M', 'B']),
    depth: ENUM(['S', 'H', 'L']),
    stroke: ENUM(Object.keys(STROKE_LABEL)),
    hand: ENUM(['F', 'B'], true),
    serveMotion: ENUM(Object.keys(SERVE_MOTION_LABEL), true),
    serveFrom: ENUM(['F', 'M', 'B'], true),
    spin: ENUM(Object.keys(SPIN_LABEL), true),
    height: ENUM(['low', 'high'], true),
    isFinisher: { type: 'boolean' },
    note: { type: 'string' },
  },
  required: ['id', 'parent', 'player', 'col', 'depth', 'stroke', 'isFinisher'],
}

const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '選手の特徴と戦術の方向性のまとめ。3〜4文' },
    tactics: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '戦術名（25文字以内）' },
          situation: ENUM(['my_serve', 'opp_serve']),
          goal: { type: 'string', description: '狙い（1文）' },
          tags: { type: 'array', items: { type: 'string' }, description: '想定する相手タイプなど 0〜3 個' },
          reasoning: { type: 'string', description: 'なぜこの選手に合うか（2〜3文）' },
          shots: { type: 'array', items: SHOT_SCHEMA },
        },
        required: ['title', 'situation', 'goal', 'tags', 'reasoning', 'shots'],
      },
    },
  },
  required: ['summary', 'tactics'],
}

const FOLLOWUP_SCHEMA = {
  type: 'object',
  properties: {
    questions: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
  },
  required: ['questions'],
}

// ---------- 呼び出し ----------

function buildContext(settings: Settings, existing: Tactic[]): string {
  const ex = existing.length
    ? `\n\n【すでに登録済みの戦術（重複しない提案にする。改善案なら別名にする）】\n${existing.map((t) => `- ${t.title}（${t.situation === 'my_serve' ? 'サーブ' : 'レシーブ'}）${t.goal ? `: ${t.goal}` : ''}`).join('\n')}`
    : ''
  return `【選手のプロフィール】\n${profileToText(settings)}${ex}`
}

/** 戦術提案の前に、選手に聞いておきたい追加質問を 2〜4 個返す */
export async function askFollowUp(settings: Settings, existing: Tactic[]): Promise<FollowUpResponse> {
  const user = `${buildContext(settings, existing)}\n\n戦術を提案する前に、この選手に確認しておくべきことを 2〜4 個、短い質問文で挙げてください。プロフィールから既に分かることは聞かないでください。答えやすいように具体的に（例: 「相手の横回転サーブはツッツキとフリックのどちらで返すことが多いですか？」）。`
  const { data, model } = await geminiJson<{ questions?: string[] }>(settings, SYSTEM + knowledgeBlock(settings), [{ role: 'user', text: user }], FOLLOWUP_SCHEMA, {
    temperature: 0.8,
  })
  return { questions: (data.questions ?? []).filter((q) => typeof q === 'string' && q.trim()), model }
}

export interface QA {
  question: string
  answer: string
}

export async function proposeTactics(settings: Settings, existing: Tactic[], qa: QA[], extraRequest: string): Promise<ProposalResponse> {
  const qaText = qa.filter((x) => x.answer.trim()).length
    ? `\n\n【追加ヒアリングへの回答】\n${qa
        .filter((x) => x.answer.trim())
        .map((x) => `Q: ${x.question}\nA: ${x.answer.trim()}`)
        .join('\n')}`
    : ''
  const req = extraRequest.trim() ? `\n\n【選手からの要望】\n${extraRequest.trim()}` : ''
  const turns: GeminiTurn[] = [
    {
      role: 'user',
      text: `${buildContext(settings, existing)}${qaText}${req}\n\nこの選手のための戦術を 3〜5 個設計し、指定の JSON 形式で出力してください。`,
    },
  ]
  const { data, model } = await geminiJson<{ summary?: string; tactics?: TacticProposal[] }>(settings, SYSTEM + knowledgeBlock(settings), turns, PROPOSAL_SCHEMA, {
    temperature: 0.8,
  })
  const tactics = (data.tactics ?? []).filter((t) => t && Array.isArray(t.shots) && t.shots.length > 0)
  if (tactics.length === 0) throw new Error('Gemini の応答に戦術が含まれていません')
  return { summary: data.summary ?? '', tactics, model }
}

// ---------- フラット → ツリー変換（検証つき） ----------

const COLS = new Set(['F', 'M', 'B'])
const DEPTHS = new Set(['S', 'H', 'L'])
const STROKES = new Set(Object.keys(STROKE_LABEL))
const SPINS = new Set(Object.keys(SPIN_LABEL))
const MOTIONS = new Set(Object.keys(SERVE_MOTION_LABEL))

/**
 * AI の出力を ShotNode ツリーに変換する。
 * 打者は根から交互に強制し、着点の side は打者の反対側にする。不正な値は捨てる。
 */
export function buildTree(situation: 'my_serve' | 'opp_serve', shots: FlatShot[]): ShotNode | null {
  const byId = new Map<number, FlatShot>()
  shots.forEach((s) => {
    if (typeof s.id === 'number') byId.set(s.id, s)
  })
  const roots = shots.filter((s) => s.parent === null || s.parent === undefined || !byId.has(s.parent as number))
  const rootFlat = roots[0] ?? shots[0] // 根が見つからない（循環）なら先頭を根にする
  if (!rootFlat) return null

  const childrenOf = (id: number) => shots.filter((s) => s.parent === id && s.id !== id)
  const seen = new Set<number>()

  const convert = (f: FlatShot, player: 'me' | 'opp', isRoot: boolean, depthGuard: number): ShotNode | null => {
    if (seen.has(f.id) || depthGuard > 12) return null
    seen.add(f.id)
    const col = COLS.has(f.col) ? f.col : 'M'
    const depth = DEPTHS.has(f.depth) ? f.depth : 'L'
    let stroke: StrokeType = STROKES.has(f.stroke) ? f.stroke : 'other'
    if (isRoot) stroke = 'serve'
    else if (stroke === 'serve') stroke = 'other'
    const spin = f.spin && SPINS.has(f.spin) ? (f.spin as Spin) : undefined
    const node: ShotNode = {
      id: newId(),
      player,
      zone: { side: player === 'me' ? 'opp' : 'me', col, depth },
      stroke,
      hand: !isRoot && (f.hand === 'F' || f.hand === 'B') ? f.hand : undefined,
      serveMotion: isRoot && f.serveMotion && MOTIONS.has(f.serveMotion) ? (f.serveMotion as ServeMotion) : isRoot ? 'forehand' : undefined,
      serveFrom: isRoot && player === 'me' ? (f.serveFrom && COLS.has(f.serveFrom) ? (f.serveFrom as Col) : 'B') : undefined,
      spin,
      height: f.height === 'low' || f.height === 'high' ? f.height : undefined,
      isFinisher: !!f.isFinisher,
      note: typeof f.note === 'string' && f.note.trim() ? f.note.trim().slice(0, 80) : undefined,
      children: [],
    }
    node.children = childrenOf(f.id)
      .map((c) => convert(c, player === 'me' ? 'opp' : 'me', false, depthGuard + 1))
      .filter((c): c is ShotNode => c !== null)
    return node
  }

  return convert(rootFlat, situation === 'my_serve' ? 'me' : 'opp', true, 0)
}

export function proposalToTactic(p: TacticProposal, settings: Settings): Omit<Tactic, 'id' | 'createdAt' | 'updatedAt'> | null {
  const situation = p.situation === 'opp_serve' ? 'opp_serve' : 'my_serve'
  const root = buildTree(situation, p.shots)
  if (!root) return null
  return {
    title: (p.title || '無題の戦術').slice(0, 40),
    situation,
    goal: p.goal ?? '',
    tags: [...new Set([...(Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === 'string' && t.trim()) : []), 'AI提案'])].slice(0, 5),
    oppHand: settings.defaultOppHand,
    confidence: 1,
    root,
    taskIds: [],
  }
}

export { tacticToText }
