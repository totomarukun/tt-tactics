// 座標系
export type Side = 'me' | 'opp'
export type Col = 'F' | 'M' | 'B'
export type Depth = 'S' | 'H' | 'L'
export interface Zone {
  side: Side
  col: Col
  depth: Depth
}

export type Player = 'me' | 'opp'
export type Hand = 'F' | 'B'
export type Handedness = 'right' | 'left'

export type ServeMotion = 'forehand' | 'backhand' | 'yg' | 'makikomi' | 'squat'

export type StrokeType =
  | 'serve'
  | 'drive'
  | 'loop'
  | 'smash'
  | 'counter'
  | 'block'
  | 'push'
  | 'stop'
  | 'flick'
  | 'chiquita'
  | 'lob'
  | 'chop'
  | 'other'

// 回転。fwd = 順横（フォア面の横回転）、rev = 逆横（YG・バック・巻き込み系）
export type BallHeight = 'low' | 'high'
export type SpinAmount = 'weak' | 'strong'

export type Spin =
  | 'top_fwd'
  | 'top'
  | 'top_rev'
  | 'side_fwd'
  | 'none'
  | 'side_rev'
  | 'under_fwd'
  | 'under'
  | 'under_rev'

export interface ShotNode {
  id: string
  player: Player
  zone: Zone
  stroke: StrokeType
  hand?: Hand
  serveMotion?: ServeMotion          // サーブの出し方（stroke === serve のとき）
  serveFrom?: Col
  spin?: Spin
  height?: BallHeight               // 未指定＝普通の高さ
  spinAmount?: SpinAmount           // 未指定＝普通の回転量
  isFinisher?: boolean
  note?: string
  children: ShotNode[]
}

export type Situation = 'my_serve' | 'opp_serve'

export interface Tactic {
  id: string
  title: string
  situation: Situation
  goal?: string
  tags: string[]
  oppHand: Handedness
  confidence: 1 | 2 | 3
  root: ShotNode | null
  taskIds: string[]
  createdAt: string
  updatedAt: string
}

export interface Settings {
  myHand: Handedness
  defaultOppHand: Handedness
  strokeOrder: StrokeType[]
  /** AI コーチ用（Google Gemini）。端末内にのみ保存される */
  geminiApiKey?: string
  /** モデル名の手動指定。空なら最新の Pro 系を自動選択 */
  geminiModel?: string
  /** 自分のプレースタイルの自由記述（AI に渡す） */
  playerProfile?: string
  /** プレースタイル診断（AI に渡す構造化情報） */
  profile?: PlayerProfile
  /** コーチへの追加知識・指導方針（知識ベースに追記される） */
  coachNotes?: string
  /** 週の練習/試合の目標回数（既定2）。連続日数でなく週の達成を主指標にする */
  weeklyGoal?: number
}

export type Grip = 'shake' | 'pen_jp' | 'pen_cn'
export type Rubber = 'inverted' | 'short_pips' | 'long_pips' | 'anti'
export interface PlayerProfile {
  grip?: Grip
  foreRubber?: Rubber
  backRubber?: Rubber
  styles: string[]        // 例: 両ハンドドライブ, 前陣速攻
  strengths: string[]     // 例: フォアドライブの威力
  weaknesses: string[]    // 例: 台上処理
  serves: string[]        // 得意サーブ
  troubles: string[]      // 苦手な相手タイプ
  goals: string           // こういうプレーがしたい
  level?: string          // 競技レベル
}

// ---- Phase 2: 練習課題と練習ログ ----
export type TaskStatus = 'open' | 'done'
export interface Task {
  id: string
  title: string
  detail?: string        // やり方（球出し、回数など）
  purpose?: string       // 狙い
  tacticIds: string[]
  status: TaskStatus
  source: 'manual' | 'ai'
  createdAt: string
  doneAt?: string
}

export type PracticeResult = 'good' | 'ok' | 'bad'
export interface PracticeItem {
  taskId: string
  result?: PracticeResult
  note?: string
}
export interface PracticeLog {
  id: string
  date: string           // YYYY-MM-DD
  items: PracticeItem[]
  note?: string          // その日の振り返り
  createdAt: string
  updatedAt: string
}

// 意識キュー: 今意識していること（技術/戦術）を短い1行で。各カテゴリ最大3件。身についたら卒業（retired）
export type CueCategory = 'tech' | 'tactic'
export interface Cue {
  id: string
  category: CueCategory
  text: string
  retired: boolean // 身についた（卒業）
  createdAt: string
  updatedAt: string
}

// 今週の焦点: 週1プレーヤーが、その1回の練習で何をやるかを1〜2個に絞る（最大2）
export interface Focus {
  id: string
  week: string           // その週の開始日 YYYY-MM-DD（月曜）
  title: string
  note?: string
  tacticId?: string      // 関連する戦術（任意）
  done: boolean
  createdAt: string
}

// 上達ループを閉じる: 戦術を試合で試した結果
export type OutcomeResult = 'won' | 'even' | 'lost' // 決まった / 五分 / 効かなかった
export interface TacticOutcome {
  id: string
  tacticId: string
  date: string           // YYYY-MM-DD
  result: OutcomeResult
  opponent?: string      // 相手（任意）
  failureTags?: string[] // 崩れ方・敗因（任意）
  note?: string          // 崩れ方の一言（任意）
  createdAt: string
}

export interface Hands {
  me: Handedness
  opp: Handedness
}
