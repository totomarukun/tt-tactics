import { useEffect, useState } from 'react'
import { clearTraces, listTraces, onTraceChange, type TraceEntry } from '../domain/harness/trace'

const LABEL: Record<string, string> = {
  'propose-tactics': '戦術提案',
  followup: '追加質問',
  'verify-tactics': '戦術の審査',
  drills: '練習メニュー',
  'verify-drills': '練習の審査',
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function AiLog() {
  const [traces, setTraces] = useState<TraceEntry[]>([])
  const [open, setOpen] = useState<string | null>(null)

  const refresh = () => void listTraces().then(setTraces)
  useEffect(() => {
    refresh()
    return onTraceChange(refresh)
  }, [])

  return (
    <div className="field">
      <span>AI ログ（直近の呼び出し）</span>
      <p className="hint small">
        何を送って何が返ったか、モデル・所要時間・試行回数・エラーを記録します。提案がおかしいときの診断に使えます。
      </p>
      {traces.length === 0 ? (
        <p className="hint small">まだ記録がありません。</p>
      ) : (
        <>
          <ul className="trace-list">
            {traces.map((t) => (
              <li key={t.id} className="trace-row">
                <button className="trace-summary" onClick={() => setOpen(open === t.id ? null : t.id)}>
                  <span className={`trace-dot ${t.status}`} />
                  <span className="trace-label">{LABEL[t.label] ?? t.label}</span>
                  <span className="trace-meta">
                    {fmtTime(t.at)} · {t.model.replace('gemini-', '')} · {(t.durationMs / 1000).toFixed(1)}s{t.attempts > 1 ? ` · ${t.attempts}回試行` : ''}
                  </span>
                </button>
                {open === t.id && (
                  <div className="trace-detail">
                    <div className="hint small">
                      送信 約{Math.round((t.systemChars + t.promptChars) / 1000)}千字（知識ベース含む{Math.round(t.systemChars / 1000)}千字） / 応答 {t.responseChars}字
                    </div>
                    {t.error && (
                      <>
                        <h4>エラー</h4>
                        <div className="trace-err">{t.error}</div>
                      </>
                    )}
                    <h4>送信プロンプト（末尾は省略）</h4>
                    <pre>{t.promptPreview || '（なし）'}</pre>
                    <h4>応答（末尾は省略）</h4>
                    <pre>{t.responsePreview || '（なし）'}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button className="link-btn" onClick={() => void clearTraces()}>
            ログを消去
          </button>
        </>
      )}
    </div>
  )
}
