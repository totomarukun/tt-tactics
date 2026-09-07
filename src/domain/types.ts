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
}

export interface Hands {
  me: Handedness
  opp: Handedness
}
