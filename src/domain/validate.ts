import { DEFAULT_STROKE_ORDER } from './presets'
import type { Col, Depth, Handedness, OutcomeResult, PracticeLog, Settings, ShotNode, Side, Situation, Tactic, TacticOutcome, Task } from './types'

// ハーネスの境界検証。IndexedDB からの読み込みや JSON インポートで入ってくるデータを、
// 描画で落ちない形に整える。壊れて直せないレコードは捨てる（白画面を防ぐ）。

const COLS = new Set<Col>(['F', 'M', 'B'])
const DEPTHS = new Set<Depth>(['S', 'H', 'L'])
const SIDES = new Set<Side>(['me', 'opp'])

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

export interface SanitizeReport {
  kept: number
  dropped: number
  repaired: number
}

function sanitizeShot(raw: unknown, report: SanitizeReport, depth = 0): ShotNode | null {
  if (!raw || typeof raw !== 'object' || depth > 20) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string') return null
  const zoneRaw = (r.zone ?? {}) as Record<string, unknown>
  const side = SIDES.has(zoneRaw.side as Side) ? (zoneRaw.side as Side) : 'opp'
  const col = COLS.has(zoneRaw.col as Col) ? (zoneRaw.col as Col) : 'M'
  const dep = DEPTHS.has(zoneRaw.depth as Depth) ? (zoneRaw.depth as Depth) : 'L'
  if (!zoneRaw.side || !zoneRaw.col || !zoneRaw.depth) report.repaired++
  const children = arr<unknown>(r.children)
    .map((c) => sanitizeShot(c, report, depth + 1))
    .filter((c): c is ShotNode => c !== null)
  const node: ShotNode = {
    ...(r as object),
    id: r.id,
    player: r.player === 'opp' ? 'opp' : 'me',
    zone: { side, col, depth: dep },
    stroke: str(r.stroke, 'other') as ShotNode['stroke'],
    children,
  }
  return node
}

const SITUATIONS = new Set<Situation>(['my_serve', 'opp_serve'])
const HANDS = new Set<Handedness>(['right', 'left'])

export function sanitizeTactic(raw: unknown, report: SanitizeReport): Tactic | null {
  if (!raw || typeof raw !== 'object') {
    report.dropped++
    return null
  }
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string') {
    report.dropped++
    return null
  }
  const conf = r.confidence === 2 || r.confidence === 3 ? r.confidence : 1
  const t: Tactic = {
    ...(r as object),
    id: r.id,
    title: str(r.title, '（無題）'),
    situation: SITUATIONS.has(r.situation as Situation) ? (r.situation as Situation) : 'my_serve',
    goal: str(r.goal),
    tags: arr<unknown>(r.tags).filter((x) => typeof x === 'string') as string[],
    oppHand: HANDS.has(r.oppHand as Handedness) ? (r.oppHand as Handedness) : 'right',
    confidence: conf as Tactic['confidence'],
    root: r.root ? sanitizeShot(r.root, report) : null,
    taskIds: arr<unknown>(r.taskIds).filter((x) => typeof x === 'string') as string[],
    createdAt: str(r.createdAt, new Date().toISOString()),
    updatedAt: str(r.updatedAt, new Date().toISOString()),
  }
  report.kept++
  return t
}

export function sanitizeTask(raw: unknown, report: SanitizeReport): Task | null {
  if (!raw || typeof raw !== 'object') {
    report.dropped++
    return null
  }
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string') {
    report.dropped++
    return null
  }
  const t: Task = {
    ...(r as object),
    id: r.id,
    title: str(r.title, '（無題の課題）'),
    detail: str(r.detail),
    purpose: str(r.purpose),
    tacticIds: arr<unknown>(r.tacticIds).filter((x) => typeof x === 'string') as string[],
    status: r.status === 'done' ? 'done' : 'open',
    source: r.source === 'ai' ? 'ai' : 'manual',
    createdAt: str(r.createdAt, new Date().toISOString()),
  }
  report.kept++
  return t
}

export function sanitizeLog(raw: unknown, report: SanitizeReport): PracticeLog | null {
  if (!raw || typeof raw !== 'object') {
    report.dropped++
    return null
  }
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.date !== 'string') {
    report.dropped++
    return null
  }
  const l: PracticeLog = {
    ...(r as object),
    id: r.id,
    date: r.date,
    items: arr<unknown>(r.items)
      .filter((i) => i && typeof i === 'object' && typeof (i as Record<string, unknown>).taskId === 'string')
      .map((i) => i as PracticeLog['items'][number]),
    note: str(r.note),
    createdAt: str(r.createdAt, new Date().toISOString()),
    updatedAt: str(r.updatedAt, new Date().toISOString()),
  }
  report.kept++
  return l
}

const RESULTS = new Set<OutcomeResult>(['won', 'even', 'lost'])

export function sanitizeOutcome(raw: unknown, report: SanitizeReport): TacticOutcome | null {
  if (!raw || typeof raw !== 'object') {
    report.dropped++
    return null
  }
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.tacticId !== 'string' || !RESULTS.has(r.result as OutcomeResult)) {
    report.dropped++
    return null
  }
  report.kept++
  return {
    ...(r as object),
    id: r.id,
    tacticId: r.tacticId,
    result: r.result as OutcomeResult,
    date: str(r.date, new Date().toISOString().slice(0, 10)),
    opponent: typeof r.opponent === 'string' ? r.opponent : undefined,
    note: typeof r.note === 'string' ? r.note : undefined,
    createdAt: str(r.createdAt, new Date().toISOString()),
  }
}

const DEFAULTS: Settings = { myHand: 'right', defaultOppHand: 'right', strokeOrder: DEFAULT_STROKE_ORDER }

export function sanitizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS }
  const r = raw as Record<string, unknown>
  return {
    ...DEFAULTS,
    ...(r as object),
    myHand: HANDS.has(r.myHand as Handedness) ? (r.myHand as Handedness) : 'right',
    defaultOppHand: HANDS.has(r.defaultOppHand as Handedness) ? (r.defaultOppHand as Handedness) : 'right',
    strokeOrder: arr<unknown>(r.strokeOrder).length ? (r.strokeOrder as Settings['strokeOrder']) : DEFAULT_STROKE_ORDER,
  }
}

export function newReport(): SanitizeReport {
  return { kept: 0, dropped: 0, repaired: 0 }
}
