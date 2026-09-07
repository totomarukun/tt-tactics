import { useState } from 'react'
import type { Tactic, Task } from '../domain/types'

export interface TaskDraft {
  title: string
  purpose: string
  detail: string
  tacticIds: string[]
}

interface Props {
  initial: TaskDraft
  isNew: boolean
  tactics: Tactic[]
  onSave: (d: TaskDraft) => void
  onDelete?: () => void
  onClose: () => void
}

export function draftOf(t: Task): TaskDraft {
  return { title: t.title, purpose: t.purpose ?? '', detail: t.detail ?? '', tacticIds: t.tacticIds }
}

export function TaskSheet({ initial, isNew, tactics, onSave, onDelete, onClose }: Props) {
  const [d, setD] = useState<TaskDraft>(initial)
  const toggle = (id: string) =>
    setD({ ...d, tacticIds: d.tacticIds.includes(id) ? d.tacticIds.filter((x) => x !== id) : [...d.tacticIds, id] })

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">{isNew ? '新しい練習課題' : '課題を編集'}</span>
          <button className="icon" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <label className="field">
          <span>課題名</span>
          <input autoFocus={isNew} value={d.title} placeholder="例: 3球目バックドライブの多球練習" onChange={(e) => setD({ ...d, title: e.target.value })} />
        </label>
        <label className="field">
          <span>狙い</span>
          <input value={d.purpose} placeholder="例: ツッツキに対するドライブの安定" onChange={(e) => setD({ ...d, purpose: e.target.value })} />
        </label>
        <label className="field">
          <span>やり方</span>
          <textarea rows={4} value={d.detail} placeholder="球出し、コース、本数、成功の目安など" onChange={(e) => setD({ ...d, detail: e.target.value })} />
        </label>
        <div className="field">
          <span>関連する戦術</span>
          <div className="chip-group">
            {tactics.length === 0 && <span className="hint small">戦術がまだありません</span>}
            {tactics.map((t) => (
              <button key={t.id} className={`chip small ${d.tacticIds.includes(t.id) ? 'on' : ''}`} onClick={() => toggle(t.id)}>
                {t.title}
              </button>
            ))}
          </div>
        </div>
        <div className="sheet-foot">
          <button className="primary" disabled={!d.title.trim()} onClick={() => onSave({ ...d, title: d.title.trim() })}>
            保存
          </button>
          {onDelete && (
            <button className="danger-text" onClick={onDelete}>
              この課題を削除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
