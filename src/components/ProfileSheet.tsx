import { useState } from 'react'
import {
  EMPTY_PROFILE,
  GRIP_LABEL,
  LEVEL_OPTIONS,
  RUBBER_LABEL,
  SERVE_OPTIONS,
  STRENGTH_OPTIONS,
  STYLE_OPTIONS,
  TROUBLE_OPTIONS,
  WEAKNESS_OPTIONS,
} from '../domain/profile'
import type { Grip, PlayerProfile, Rubber } from '../domain/types'
import { useStore } from '../store/useStore'

interface Props {
  onClose: () => void
  onSaved?: () => void
  /** 提案フローから呼ぶときの文言 */
  ctaLabel?: string
}

function MultiChips({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [custom, setCustom] = useState('')
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])
  const add = () => {
    const v = custom.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setCustom('')
  }
  const extras = value.filter((v) => !options.includes(v))
  return (
    <div className="field">
      <span>{label}</span>
      <div className="chip-group">
        {options.map((o) => (
          <button key={o} className={`chip small ${value.includes(o) ? 'on' : ''}`} onClick={() => toggle(o)}>
            {o}
          </button>
        ))}
        {extras.map((o) => (
          <button key={o} className="chip small on" onClick={() => toggle(o)}>
            {o} ×
          </button>
        ))}
      </div>
      <input
        value={custom}
        placeholder={placeholder}
        onChange={(e) => setCustom(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
      />
    </div>
  )
}

export function ProfileSheet({ onClose, onSaved, ctaLabel }: Props) {
  const { settings, updateSettings } = useStore()
  const [p, setP] = useState<PlayerProfile>({ ...EMPTY_PROFILE, ...(settings.profile ?? {}) })
  const [free, setFree] = useState(settings.playerProfile ?? '')
  const set = (patch: Partial<PlayerProfile>) => setP((prev) => ({ ...prev, ...patch }))

  const save = async () => {
    await updateSettings({ profile: p, playerProfile: free.trim() || undefined })
    onSaved?.()
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">プレースタイル診断</span>
          <button className="icon" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <p className="hint small">AI コーチが戦術や練習メニューを考えるときの材料になります。分かる範囲で構いません。</p>

        <div className="chip-group">
          <span className="chip-label">グリップ</span>
          {(Object.keys(GRIP_LABEL) as Grip[]).map((g) => (
            <button key={g} className={`chip small ${p.grip === g ? 'on' : ''}`} onClick={() => set({ grip: p.grip === g ? undefined : g })}>
              {GRIP_LABEL[g]}
            </button>
          ))}
        </div>
        <div className="chip-group">
          <span className="chip-label">フォア面</span>
          {(Object.keys(RUBBER_LABEL) as Rubber[]).map((r) => (
            <button key={r} className={`chip small ${p.foreRubber === r ? 'on' : ''}`} onClick={() => set({ foreRubber: p.foreRubber === r ? undefined : r })}>
              {RUBBER_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="chip-group">
          <span className="chip-label">バック面</span>
          {(Object.keys(RUBBER_LABEL) as Rubber[]).map((r) => (
            <button key={r} className={`chip small ${p.backRubber === r ? 'on' : ''}`} onClick={() => set({ backRubber: p.backRubber === r ? undefined : r })}>
              {RUBBER_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="chip-group">
          <span className="chip-label">レベル</span>
          {LEVEL_OPTIONS.map((l) => (
            <button key={l} className={`chip small ${p.level === l ? 'on' : ''}`} onClick={() => set({ level: p.level === l ? undefined : l })}>
              {l}
            </button>
          ))}
        </div>

        <MultiChips label="戦型" options={STYLE_OPTIONS} value={p.styles} onChange={(v) => set({ styles: v })} placeholder="その他（入力して Enter）" />
        <MultiChips label="強み" options={STRENGTH_OPTIONS} value={p.strengths} onChange={(v) => set({ strengths: v })} placeholder="その他の強み" />
        <MultiChips label="弱み・課題" options={WEAKNESS_OPTIONS} value={p.weaknesses} onChange={(v) => set({ weaknesses: v })} placeholder="その他の弱み" />
        <MultiChips label="得意サーブ" options={SERVE_OPTIONS} value={p.serves} onChange={(v) => set({ serves: v })} placeholder="その他のサーブ" />
        <MultiChips label="苦手な相手" options={TROUBLE_OPTIONS} value={p.troubles} onChange={(v) => set({ troubles: v })} placeholder="その他" />

        <label className="field">
          <span>目指すプレー・願望</span>
          <textarea
            rows={3}
            value={p.goals}
            placeholder="例: サーブからの3球目で一発で決めたい。ラリーに持ち込まれると勝てないので前で勝負したい"
            onChange={(e) => set({ goals: e.target.value })}
          />
        </label>
        <label className="field">
          <span>補足（自由記述）</span>
          <textarea rows={2} value={free} placeholder="用具の詳細、ケガ、練習環境など" onChange={(e) => setFree(e.target.value)} />
        </label>

        <div className="sheet-foot">
          <button className="primary" onClick={save}>
            {ctaLabel ?? '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
