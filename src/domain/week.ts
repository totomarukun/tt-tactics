import type { PracticeLog, TacticOutcome } from './types'

// やさしい継続: 連続日数でなく「今週の達成」を主指標にする（リサーチ 05-habit-motivation）。

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 今週（月曜始まり）の開始日 YYYY-MM-DD */
export function weekStart(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = (d.getDay() + 6) % 7 // 月曜=0
  return ymd(new Date(d.getTime() - dow * 86400000))
}

export interface WeekProgress {
  active: number
  goal: number
  start: string
  done: boolean
}

/** 今週、練習または試合をした「活動日数」を数える（同じ日は1回） */
export function weekProgress(logs: PracticeLog[], outcomes: TacticOutcome[], goal: number, now = new Date()): WeekProgress {
  const start = weekStart(now)
  const days = new Set<string>()
  for (const l of logs) if (l.date >= start && l.items.length > 0) days.add(l.date)
  for (const o of outcomes) if (o.date >= start) days.add(o.date)
  const active = days.size
  return { active, goal, start, done: active >= goal }
}
