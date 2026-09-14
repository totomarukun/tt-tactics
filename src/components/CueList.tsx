import { useState } from 'react'
import { CUE_CATEGORY_LABEL, CUE_PRESETS, activeCues, cueFull, retiredCues } from '../domain/cue'
import type { CueCategory } from '../domain/types'
import { useStore } from '../store/useStore'

// 今意識していること（技術/戦術）。各カテゴリ最大3件。身についたら卒業して成長の記録に。

const CATS: CueCategory[] = ['tech', 'tactic']

export function CueList() {
  const { cues, addCue, updateCue, deleteCue } = useStore()
  const [adding, setAdding] = useState<CueCategory | null>(null)
  const [text, setText] = useState('')
  const [showRetired, setShowRetired] = useState(false)

  const retired = retiredCues(cues)

  const submit = async (cat: CueCategory) => {
    await addCue(cat, text)
    setText('')
    setAdding(null)
  }

  return (
    <div className="cue-box">
      <div className="focus-head">
        <span>意識していること</span>
        <span className="hint small">技術・戦術で今のキュー（各3件まで）</span>
      </div>

      {CATS.map((cat) => {
        const list = activeCues(cues, cat)
        const full = cueFull(cues, cat)
        const presets = CUE_PRESETS[cat].filter((p) => !list.some((c) => c.text === p))
        return (
          <div key={cat} className="cue-cat">
            <div className="cue-cat-label">{CUE_CATEGORY_LABEL[cat]}</div>
            {list.length === 0 && adding !== cat && <p className="hint small">まだありません。今意識していることを1つ。</p>}
            <ul className="cue-items">
              {list.map((c) => (
                <li key={c.id} className="cue-item">
                  <span className="cue-dot" />
                  <span className="cue-text">{c.text}</span>
                  <button className="cue-graduate" title="身についた（卒業）" onClick={() => void updateCue(c.id, { retired: true })}>
                    卒業
                  </button>
                  <button className="focus-del" aria-label="削除" onClick={() => void deleteCue(c.id)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {!full && adding !== cat && (
              <div className="cue-add-row">
                {presets.slice(0, 3).map((p) => (
                  <button key={p} className="chip small" onClick={() => void addCue(cat, p)}>
                    ＋ {p}
                  </button>
                ))}
                <button className="chip small" onClick={() => setAdding(cat)}>
                  ＋ 自分で
                </button>
              </div>
            )}
            {full && <p className="hint small">この3つに集中。増やしたいときは1つ卒業してから。</p>}
            {adding === cat && (
              <div className="focus-input">
                <input autoFocus placeholder={cat === 'tech' ? '例: バックは前目で振る' : '例: 迷ったらミドルを突く'} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void submit(cat)} />
                <button className="primary" disabled={!text.trim()} onClick={() => void submit(cat)}>
                  追加
                </button>
              </div>
            )}
          </div>
        )
      })}

      {retired.length > 0 && (
        <div className="focus-achieved">
          <button className="link-btn" onClick={() => setShowRetired(!showRetired)}>
            身についたこと {retired.length} 件 {showRetired ? '▲' : '▼'}
          </button>
          {showRetired && (
            <ul className="achieved-list">
              {retired.map((c) => (
                <li key={c.id}>
                  <span className="ac-check">✓</span>
                  <span className="ac-title">{c.text}</span>
                  <button className="focus-del" aria-label="現役に戻す" onClick={() => void updateCue(c.id, { retired: false })}>
                    ↩
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
