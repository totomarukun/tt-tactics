import { RESULT_MARK, failureTagCounts, statsFor } from '../domain/outcome'
import { useStore } from '../store/useStore'

// 可視化は「だから次はこれ」まで翻訳する。練習ヒートマップと戦術別勝率。

const DAY_MS = 86400000
const WEEKS = 12

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function StatsPanel() {
  const { tactics, outcomes, logs } = useStore()

  // 練習ヒートマップ: 直近12週。各日の練習項目数で濃淡
  const today = new Date()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startDow = (end.getDay() + 6) % 7 // 月曜=0
  const gridEnd = new Date(end.getTime() + (6 - startDow) * DAY_MS)
  const countByDate = new Map<string, number>()
  for (const l of logs) countByDate.set(l.date, (countByDate.get(l.date) ?? 0) + l.items.length)
  const cells: { date: string; count: number; future: boolean }[] = []
  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(gridEnd.getTime() - (w * 7 + (6 - d)) * DAY_MS)
      const key = ymd(dt)
      cells.push({ date: key, count: countByDate.get(key) ?? 0, future: dt > end })
    }
  }
  const level = (c: number) => (c === 0 ? 0 : c <= 2 ? 1 : c <= 4 ? 2 : 3)
  const COLORS = ['#e5e7eb', '#a7d8b8', '#5cb98a', '#2f9e6b']
  const practiceDays30 = [...countByDate.entries()].filter(([dt, c]) => c > 0 && new Date(dt).getTime() > end.getTime() - 30 * DAY_MS).length

  // 戦術別勝率
  const rows = tactics
    .filter((t) => t.root)
    .map((t) => ({ t, s: statsFor(t.id, outcomes) }))
    .filter((r) => r.s.tried > 0)
    .sort((a, b) => (b.s.winRate ?? -1) - (a.s.winRate ?? -1) || b.s.tried - a.s.tried)

  const totalWon = outcomes.filter((o) => o.result === 'won').length
  const totalLost = outcomes.filter((o) => o.result === 'lost').length
  const overall = totalWon + totalLost > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : null
  const failures = failureTagCounts(outcomes).slice(0, 6)
  const maxFail = failures[0]?.count ?? 1

  const cw = 12
  const gap = 3
  const gridW = WEEKS * (cw + gap)
  const gridH = 7 * (cw + gap)

  return (
    <>
      <div className="section-head">
        <span>練習の継続</span>
        <span className="hint small">直近30日 {practiceDays30} 日</span>
      </div>
      <div className="stats-box">
        <svg viewBox={`0 0 ${gridW} ${gridH}`} className="heatmap" role="img" aria-label="練習ヒートマップ">
          {cells.map((c, i) => {
            const w = Math.floor(i / 7)
            const d = i % 7
            return (
              <rect
                key={c.date}
                x={w * (cw + gap)}
                y={d * (cw + gap)}
                width={cw}
                height={cw}
                rx={2}
                fill={c.future ? 'transparent' : COLORS[level(c.count)]}
              >
                <title>{`${c.date}: ${c.count ? `${c.count}項目` : '練習なし'}`}</title>
              </rect>
            )
          })}
        </svg>
        <div className="heatmap-legend">
          <span>少ない</span>
          {COLORS.map((c) => (
            <span key={c} className="legend-cell" style={{ background: c }} />
          ))}
          <span>多い</span>
        </div>
      </div>

      <div className="section-head">
        <span>戦術別の勝率</span>
        {overall !== null && <span className="hint small">通算 {overall}% 決まる（{totalWon}/{totalWon + totalLost}）</span>}
      </div>
      <div className="stats-box">
        {rows.length === 0 ? (
          <p className="hint small">試合結果を記録すると、効いている戦術が見えてきます。</p>
        ) : (
          <ul className="winrate-list">
            {rows.map(({ t, s }) => {
              const tot = s.won + s.even + s.lost || 1
              return (
                <li key={t.id}>
                  <div className="wr-title">
                    {t.title}
                    <span className="wr-rate">{s.winRate !== null ? `${Math.round(s.winRate * 100)}%` : '—'}</span>
                  </div>
                  <div className="wr-bar" aria-label={`◎${s.won} △${s.even} ✕${s.lost}`}>
                    <span className="won" style={{ width: `${(s.won / tot) * 100}%` }} />
                    <span className="even" style={{ width: `${(s.even / tot) * 100}%` }} />
                    <span className="lost" style={{ width: `${(s.lost / tot) * 100}%` }} />
                  </div>
                  <div className="wr-nums">
                    {RESULT_MARK.won}
                    {s.won} {RESULT_MARK.even}
                    {s.even} {RESULT_MARK.lost}
                    {s.lost}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {failures.length > 0 && (
        <>
          <div className="section-head">
            <span>崩れ方の傾向</span>
            <span className="hint small">記録した敗因</span>
          </div>
          <div className="stats-box">
            <ul className="fail-list">
              {failures.map((f) => (
                <li key={f.tag}>
                  <span className="fail-tag">{f.tag}</span>
                  <span className="fail-bar">
                    <span style={{ width: `${(f.count / maxFail) * 100}%` }} />
                  </span>
                  <span className="fail-count">{f.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  )
}
