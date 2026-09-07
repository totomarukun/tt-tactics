import { useState } from 'react'
import { askFollowUp, proposalToTactic, proposeTactics, type ProposalResponse, type QA } from '../domain/aiTactics'
import { profileIsFilled, profileToText } from '../domain/profile'
import { defaultPath } from '../domain/tree'
import { useStore } from '../store/useStore'
import { ProfileSheet } from './ProfileSheet'
import { TableDiagram } from './TableDiagram'
import { nodeLabel } from '../domain/presets'
import { flatten } from '../domain/tree'

type Step =
  | { kind: 'intro' }
  | { kind: 'asking' }
  | { kind: 'questions'; qa: QA[] }
  | { kind: 'proposing' }
  | { kind: 'result'; res: ProposalResponse }
  | { kind: 'error'; message: string; back: Step }

interface Props {
  onClose: () => void
}

export function AiTacticSheet({ onClose }: Props) {
  const { settings, tactics, addTactic, navigate } = useStore()
  const [step, setStep] = useState<Step>({ kind: 'intro' })
  const [profileOpen, setProfileOpen] = useState(false)
  const [request, setRequest] = useState('')
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [savedIds, setSavedIds] = useState<string[] | null>(null)
  const [qaState, setQaState] = useState<QA[]>([])

  const hasKey = !!settings.geminiApiKey
  const filled = profileIsFilled(settings)

  const runFollowUp = async () => {
    setStep({ kind: 'asking' })
    try {
      const r = await askFollowUp(settings, tactics)
      const qa = r.questions.map((q) => ({ question: q, answer: '' }))
      setQaState(qa)
      setStep({ kind: 'questions', qa })
    } catch (e) {
      setStep({ kind: 'error', message: e instanceof Error ? e.message : String(e), back: { kind: 'intro' } })
    }
  }

  const runPropose = async (qa: QA[]) => {
    setStep({ kind: 'proposing' })
    try {
      const res = await proposeTactics(settings, tactics, qa, request)
      setPicked(new Set(res.tactics.map((_, i) => i)))
      setStep({ kind: 'result', res })
    } catch (e) {
      setStep({ kind: 'error', message: e instanceof Error ? e.message : String(e), back: { kind: 'intro' } })
    }
  }

  const register = async () => {
    if (step.kind !== 'result') return
    const ids: string[] = []
    for (const [i, p] of step.res.tactics.entries()) {
      if (!picked.has(i)) continue
      const data = proposalToTactic(p, settings)
      if (!data) continue
      const t = await addTactic(data)
      ids.push(t.id)
    }
    setSavedIds(ids)
  }

  const toggle = (i: number) => {
    const s = new Set(picked)
    if (s.has(i)) s.delete(i)
    else s.add(i)
    setPicked(s)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">AI コーチの戦術提案</span>
          <button className="icon" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        {step.kind === 'intro' && (
          <>
            {!hasKey && (
              <div className="empty">
                <p>設定画面で Gemini の API キーを登録してください。</p>
                <button className="secondary" onClick={() => navigate({ name: 'settings' })}>
                  設定画面へ
                </button>
              </div>
            )}
            {hasKey && (
              <>
                <div className="field">
                  <span>コーチに渡すあなたの情報</span>
                  <pre className="profile-preview">{profileToText(settings)}</pre>
                  <button className="secondary full" onClick={() => setProfileOpen(true)}>
                    {filled ? '診断内容を編集' : 'プレースタイル診断を入力する'}
                  </button>
                  {!filled && <p className="hint small">診断を入力すると、あなたに合った提案になります。未入力でも進められます。</p>}
                </div>
                <label className="field">
                  <span>今回の要望（任意）</span>
                  <textarea
                    rows={2}
                    value={request}
                    placeholder="例: 来月の大会でカットマンと当たりそう。レシーブからの展開を増やしたい"
                    onChange={(e) => setRequest(e.target.value)}
                  />
                </label>
                <div className="sheet-foot">
                  <button className="primary" onClick={runFollowUp}>
                    コーチに質問してもらってから提案
                  </button>
                  <button className="secondary" onClick={() => runPropose([])}>
                    すぐに提案してもらう
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {(step.kind === 'asking' || step.kind === 'proposing') && (
          <div className="empty">
            <div className="spinner" />
            <p>{step.kind === 'asking' ? 'あなたに聞きたいことを考えています…' : 'プロフィールを読んで戦術を組み立てています…'}</p>
            <p className="hint small">{step.kind === 'asking' ? '数秒〜20秒' : '30秒〜1分ほどかかることがあります'}</p>
          </div>
        )}

        {step.kind === 'questions' && (
          <>
            <p className="hint">コーチからの質問です。分かる範囲で答えてください。空欄のままでも構いません。</p>
            {qaState.map((q, i) => (
              <label key={i} className="field">
                <span>
                  Q{i + 1}. {q.question}
                </span>
                <textarea
                  rows={2}
                  value={q.answer}
                  onChange={(e) => setQaState(qaState.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                />
              </label>
            ))}
            <div className="sheet-foot">
              <button className="primary" onClick={() => runPropose(qaState)}>
                この内容で提案してもらう
              </button>
            </div>
          </>
        )}

        {step.kind === 'error' && (
          <div className="empty">
            <p>{step.message}</p>
            <button className="secondary" onClick={() => setStep(step.back)}>
              戻る
            </button>
          </div>
        )}

        {step.kind === 'result' && (
          <>
            <div className="coach-note">{step.res.summary}</div>
            <p className="hint small">モデル: {step.res.model}。登録後は普通の戦術と同じように編集できます。</p>
            <ul className="drill-list">
              {step.res.tactics.map((p, i) => {
                const data = proposalToTactic(p, settings)
                const root = data?.root ?? null
                const path = defaultPath(root)
                const rows = flatten(root)
                return (
                  <li key={i} className={`drill proposal ${picked.has(i) ? 'on' : ''}`} onClick={() => !savedIds && toggle(i)}>
                    <div className="drill-head">
                      <span className="check">{picked.has(i) ? '☑' : '☐'}</span>
                      <span className={`badge ${p.situation}`}>{p.situation === 'my_serve' ? 'サーブ' : 'レシーブ'}</span>
                      <span className="drill-title">{p.title}</span>
                    </div>
                    <div className="proposal-body">
                      <div className="proposal-mini">
                        <TableDiagram path={path} hands={{ me: settings.myHand, opp: settings.defaultOppHand }} compact />
                      </div>
                      <div className="proposal-text">
                        <div className="drill-purpose">{p.goal}</div>
                        <div className="drill-detail">{p.reasoning}</div>
                      </div>
                    </div>
                    <details className="task-detail" onClick={(e) => e.stopPropagation()}>
                      <summary>展開を見る（{rows.length} 球）</summary>
                      <ul className="proposal-tree">
                        {rows.map(({ node, depth }) => (
                          <li key={node.id} style={{ paddingLeft: depth * 12 }} className={node.player}>
                            <span className="dot" />
                            {nodeLabel(node)}
                            {node.isFinisher && <span className="star">★</span>}
                            {node.note && <span className="shot-note"> — {node.note}</span>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                )
              })}
            </ul>
            <div className="sheet-foot">
              {savedIds ? (
                <>
                  <p className="hint">{savedIds.length} 件の戦術を登録しました。</p>
                  {savedIds.length > 0 && (
                    <button className="primary" onClick={() => navigate({ name: 'detail', id: savedIds[0] })}>
                      最初の戦術を開く
                    </button>
                  )}
                  <button className="secondary" onClick={onClose}>
                    閉じる
                  </button>
                </>
              ) : (
                <>
                  <button className="primary" disabled={picked.size === 0} onClick={register}>
                    選んだ {picked.size} 件を戦術に登録
                  </button>
                  <button className="secondary" onClick={() => runPropose(qaState)}>
                    別の案を出してもらう
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      {profileOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ProfileSheet onClose={() => setProfileOpen(false)} ctaLabel="保存して戻る" />
        </div>
      )}
    </div>
  )
}
