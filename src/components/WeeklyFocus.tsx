import { useState } from 'react'
import { MAX_FOCUS, currentFocuses, suggestFocuses } from '../domain/focus'
import { useStore } from '../store/useStore'

// ホームの主役。週1プレーヤーが「今週の1回でやること」を1〜2個に絞る。手を広げない。

export function WeeklyFocus() {
  const { focuses, tactics, outcomes, addFocus, toggleFocus, deleteFocus, navigate } = useStore()
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')

  const week = currentFocuses(focuses)
  const full = week.length >= MAX_FOCUS
  const suggestions = suggestFocuses(tactics, outcomes).filter((s) => !week.some((f) => f.title === s.title))

  const add = async (title: string, note?: string, tacticId?: string) => {
    if (!title.trim() || full) return
    await addFocus({ title: title.trim(), note, tacticId })
    setText('')
    setAdding(false)
    if ('vibrate' in navigator) navigator.vibrate?.(15)
  }

  return (
    <div className="focus-box">
      <div className="focus-head">
        <span>今週の焦点</span>
        <span className="hint small">次の1回でやることを1〜2個だけ</span>
      </div>

      {week.length === 0 && !adding && (
        <div className="focus-empty">
          <p className="hint">試合の悔しさが濃いうちに、今週やることを1つ決めましょう。手を広げず、1〜2個に絞るのがコツです。</p>
          <div className="focus-suggest">
            {suggestions.map((s) => (
              <button key={s.title} className="focus-sg" onClick={() => void add(s.title, s.note, s.tacticId)}>
                <b>{s.title}</b>
                <small>{s.note}</small>
              </button>
            ))}
          </div>
          <button className="link-btn" onClick={() => setAdding(true)}>
            自分で入力する
          </button>
        </div>
      )}

      {week.map((f) => {
        const t = f.tacticId ? tactics.find((x) => x.id === f.tacticId) : undefined
        return (
          <div key={f.id} className={`focus-item ${f.done ? 'done' : ''}`}>
            <button className="focus-check" aria-label={f.done ? '未達成に戻す' : '達成にする'} onClick={() => void toggleFocus(f.id)}>
              {f.done ? '☑' : '☐'}
            </button>
            <div className="focus-main">
              <div className="focus-title">{f.title}</div>
              {f.note && <div className="focus-note">{f.note}</div>}
              {t && (
                <button className="focus-link" onClick={() => navigate({ name: 'detail', id: t.id })}>
                  {t.title} を開く ›
                </button>
              )}
            </div>
            <button className="focus-del" aria-label="外す" onClick={() => void deleteFocus(f.id)}>
              ×
            </button>
          </div>
        )
      })}

      {week.length > 0 && !full && !adding && (
        <div className="focus-more">
          {suggestions.slice(0, 2).map((s) => (
            <button key={s.title} className="chip small" onClick={() => void add(s.title, s.note, s.tacticId)}>
              ＋ {s.title}
            </button>
          ))}
          <button className="chip small" onClick={() => setAdding(true)}>
            ＋ 自分で
          </button>
        </div>
      )}

      {full && <p className="hint small">今週はこの2つに集中。3つ目は作らず、次の週に回します。</p>}

      {adding && (
        <div className="focus-input">
          <input autoFocus placeholder="例: 3球目のバックドライブを安定させる" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void add(text)} />
          <button className="primary" disabled={!text.trim()} onClick={() => void add(text)}>
            追加
          </button>
        </div>
      )}
    </div>
  )
}
