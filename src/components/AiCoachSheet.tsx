import { useEffect, useState } from 'react'
import { suggestDrills, type CoachResponse } from '../domain/ai'
import type { Tactic } from '../domain/types'
import { useStore } from '../store/useStore'

interface Props {
  tactic: Tactic
  onClose: () => void
}

export function AiCoachSheet({ tactic, onClose }: Props) {
  const { settings, tasks, addTask, navigate } = useStore()
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; res: CoachResponse }>({ kind: 'loading' })
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState(false)

  const linked = tasks.filter((t) => t.tacticIds.includes(tactic.id))

  useEffect(() => {
    if (!settings.geminiApiKey) {
      setState({ kind: 'error', message: 'AI コーチを使うには、設定画面で Gemini の API キーを登録してください。' })
      return
    }
    let cancelled = false
    suggestDrills(tactic, settings, linked)
      .then((res) => {
        if (cancelled) return
        setState({ kind: 'ok', res })
        setPicked(new Set(res.drills.map((_, i) => i)))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      cancelled = true
    }
    // 初回のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (i: number) => {
    const s = new Set(picked)
    if (s.has(i)) s.delete(i)
    else s.add(i)
    setPicked(s)
  }

  const save = async () => {
    if (state.kind !== 'ok') return
    for (const [i, d] of state.res.drills.entries()) {
      if (!picked.has(i)) continue
      await addTask({ title: d.title, purpose: d.purpose, detail: `${d.target}\n\n${d.detail}`, tacticIds: [tactic.id], source: 'ai' })
    }
    setSaved(true)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">AI コーチの練習メニュー</span>
          <button className="icon" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <p className="hint small">「{tactic.title}」を実戦で決めるための練習を提案します。</p>

        {state.kind === 'loading' && (
          <div className="empty">
            <div className="spinner" />
            <p>戦術を読んでメニューを考えています…</p>
            <p className="hint small">30秒ほどかかることがあります</p>
          </div>
        )}
        {state.kind === 'error' && (
          <div className="empty">
            <p>{state.message}</p>
            {!settings.geminiApiKey && (
              <button className="secondary" onClick={() => navigate({ name: 'settings' })}>
                設定画面へ
              </button>
            )}
          </div>
        )}
        {state.kind === 'ok' && (
          <>
            <div className="coach-note">{state.res.coachNote}</div>
            <p className="hint small">モデル: {state.res.model}</p>
            <ul className="drill-list">
              {state.res.drills.map((d, i) => (
                <li key={i} className={`drill ${picked.has(i) ? 'on' : ''}`} onClick={() => !saved && toggle(i)}>
                  <div className="drill-head">
                    <span className="check">{picked.has(i) ? '☑' : '☐'}</span>
                    <span className="drill-title">{d.title}</span>
                  </div>
                  <div className="drill-target">{d.target}</div>
                  <div className="drill-purpose">{d.purpose}</div>
                  <div className="drill-detail">{d.detail}</div>
                </li>
              ))}
            </ul>
            <div className="sheet-foot">
              {saved ? (
                <>
                  <p className="hint">課題に追加しました。</p>
                  <button className="primary" onClick={onClose}>
                    閉じる
                  </button>
                </>
              ) : (
                <button className="primary" disabled={picked.size === 0} onClick={save}>
                  選んだ {picked.size} 件を課題に追加
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
