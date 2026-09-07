import { useState } from 'react'
import { TAG_SUGGESTIONS } from '../domain/presets'
import type { Handedness, Situation, Tactic } from '../domain/types'

export interface TacticMeta {
  title: string
  situation: Situation
  goal: string
  tags: string[]
  oppHand: Handedness
  confidence: 1 | 2 | 3
}

interface Props {
  initial: TacticMeta
  isNew: boolean
  onSave: (m: TacticMeta) => void
  onDelete?: () => void
  onClose: () => void
}

export function metaOf(t: Tactic): TacticMeta {
  return {
    title: t.title,
    situation: t.situation,
    goal: t.goal ?? '',
    tags: t.tags,
    oppHand: t.oppHand,
    confidence: t.confidence,
  }
}

export function TacticMetaForm({ initial, isNew, onSave, onDelete, onClose }: Props) {
  const [m, setM] = useState<TacticMeta>(initial)
  const [tagInput, setTagInput] = useState('')

  const addTag = (t: string) => {
    const v = t.trim()
    if (!v || m.tags.includes(v)) return
    setM({ ...m, tags: [...m.tags, v] })
    setTagInput('')
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">{isNew ? '新しい戦術' : '戦術の設定'}</span>
          <button className="icon" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <label className="field">
          <span>タイトル</span>
          <input
            autoFocus={isNew}
            value={m.title}
            placeholder="例: フォア前下回転からのバック展開"
            onChange={(e) => setM({ ...m, title: e.target.value })}
          />
        </label>

        <div className="chip-group">
          <span className="chip-label">状況</span>
          <button
            className={`chip ${m.situation === 'my_serve' ? 'on' : ''}`}
            disabled={!isNew}
            onClick={() => setM({ ...m, situation: 'my_serve' })}
          >
            自分のサーブ
          </button>
          <button
            className={`chip ${m.situation === 'opp_serve' ? 'on' : ''}`}
            disabled={!isNew}
            onClick={() => setM({ ...m, situation: 'opp_serve' })}
          >
            相手のサーブ
          </button>
        </div>
        {!isNew && <p className="hint small">状況は作成後に変更できません（1球目が変わるため）</p>}

        <div className="chip-group">
          <span className="chip-label">相手の利き手</span>
          {(['right', 'left'] as Handedness[]).map((h) => (
            <button
              key={h}
              className={`chip ${m.oppHand === h ? 'on' : ''}`}
              onClick={() => setM({ ...m, oppHand: h })}
            >
              {h === 'right' ? '右' : '左'}
            </button>
          ))}
        </div>

        <div className="chip-group">
          <span className="chip-label">自信度</span>
          {([1, 2, 3] as const).map((c) => (
            <button
              key={c}
              className={`chip ${m.confidence === c ? 'on' : ''}`}
              onClick={() => setM({ ...m, confidence: c })}
            >
              {['練習中', '実戦で使える', '得意'][c - 1]}
            </button>
          ))}
        </div>

        <label className="field">
          <span>狙い</span>
          <input
            value={m.goal}
            placeholder="例: バックを崩して3球目フォア"
            onChange={(e) => setM({ ...m, goal: e.target.value })}
          />
        </label>

        <div className="field">
          <span>タグ</span>
          <div className="tag-edit">
            {m.tags.map((t) => (
              <button
                key={t}
                className="tag removable"
                onClick={() => setM({ ...m, tags: m.tags.filter((x) => x !== t) })}
              >
                {t} ×
              </button>
            ))}
            <input
              value={tagInput}
              placeholder="タグを追加"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(tagInput)
                }
              }}
            />
          </div>
          <div className="chip-group">
            {TAG_SUGGESTIONS.filter((t) => !m.tags.includes(t)).map((t) => (
              <button key={t} className="chip small" onClick={() => addTag(t)}>
                ＋{t}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-foot">
          <button className="primary" disabled={!m.title.trim()} onClick={() => onSave({ ...m, title: m.title.trim() })}>
            {isNew ? '作成して球を入力' : '保存'}
          </button>
          {onDelete && (
            <button className="danger-text" onClick={onDelete}>
              この戦術を削除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
