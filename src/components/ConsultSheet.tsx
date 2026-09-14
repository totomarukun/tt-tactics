import { useState } from 'react'
import { research, toTacticData, type ResearchResult, type ResearchStage } from '../domain/harness/research'
import type { Verdict } from '../domain/harness/verify'
import { nodeLabel } from '../domain/presets'
import { defaultPath, flatten } from '../domain/tree'
import { useStore } from '../store/useStore'
import { TableDiagram } from './TableDiagram'

const VERDICT_META: Record<Verdict, { label: string; cls: string }> = {
  good: { label: '◎ 妥当', cls: 'v-good' },
  revise: { label: '⚠ 要確認', cls: 'v-revise' },
  reject: { label: '✕ 非推奨', cls: 'v-reject' },
}

const EXAMPLES = ['カットマンの攻略法を調べて', 'バックハンドのチキータのコツ', '前陣速攻の相手に勝つには', '効く新しいサーブを提案して', 'ミドルを抜かれない動き方']

const STAGE_LABEL: Record<ResearchStage, string> = {
  searching: 'Web で調べています…',
  synthesizing: '戦術と練習に落としています…',
  verifying: '妥当性を審査しています…',
}

type Step = { kind: 'intro' } | { kind: 'running'; stage: ResearchStage } | { kind: 'result'; res: ResearchResult } | { kind: 'error'; message: string }

export function ConsultSheet({ onClose, initialTopic }: { onClose: () => void; initialTopic?: string }) {
  const { settings, navigate, addTactic, addTask } = useStore()
  const [topic, setTopic] = useState(initialTopic ?? '')
  const [step, setStep] = useState<Step>({ kind: 'intro' })
  const [pickedT, setPickedT] = useState<Set<number>>(new Set())
  const [pickedD, setPickedD] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState<string | null>(null)

  const hasKey = !!settings.geminiApiKey

  const run = async (t: string) => {
    if (!t.trim()) return
    setStep({ kind: 'running', stage: 'searching' })
    try {
      const res = await research(settings, t.trim(), (s) => setStep({ kind: 'running', stage: s }))
      setPickedT(new Set(res.tactics.map((_, i) => i).filter((i) => res.verdicts[i]?.verdict !== 'reject')))
      setPickedD(new Set(res.drills.map((_, i) => i)))
      setStep({ kind: 'result', res })
    } catch (e) {
      setStep({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const save = async () => {
    if (step.kind !== 'result') return
    const ids: string[] = []
    for (const [i, p] of step.res.tactics.entries()) {
      if (!pickedT.has(i)) continue
      const data = toTacticData(p, settings)
      if (data) {
        const t = await addTactic(data)
        ids.push(t.id)
      }
    }
    for (const [i, d] of step.res.drills.entries()) {
      if (!pickedD.has(i)) continue
      await addTask({ title: d.title, purpose: d.purpose, detail: `${d.target}\n\n${d.detail}`, tacticIds: ids, source: 'ai' })
    }
    setSaved(`戦術 ${ids.length} 件 / 課題 ${[...pickedD].length} 件を登録しました。`)
  }

  const toggle = (set: Set<number>, i: number, upd: (s: Set<number>) => void) => {
    const s = new Set(set)
    s.has(i) ? s.delete(i) : s.add(i)
    upd(s)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">コーチに相談（Web 調査）</span>
          <button className="icon" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        {step.kind === 'intro' && (
          <>
            {!hasKey ? (
              <div className="empty">
                <p>設定画面で Gemini の API キーを登録してください。</p>
                <button className="secondary" onClick={() => navigate({ name: 'settings' })}>
                  設定画面へ
                </button>
              </div>
            ) : (
              <>
                <p className="hint">相手の攻略、技術の課題、新しいサーブなど、知りたいことを書いてください。Web を調べて、戦術と練習まで提案します。</p>
                <textarea rows={3} className="full" value={topic} placeholder="例: 粒高のカットマンに毎回負ける。どう崩せばいい？" onChange={(e) => setTopic(e.target.value)} />
                <div className="chip-group">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} className="chip small" onClick={() => setTopic(ex)}>
                      {ex}
                    </button>
                  ))}
                </div>
                <div className="sheet-foot">
                  <button className="primary" disabled={!topic.trim()} onClick={() => void run(topic)}>
                    調べて提案してもらう
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {step.kind === 'running' && (
          <div className="empty">
            <div className="spinner" />
            <p>{STAGE_LABEL[step.stage]}</p>
            <ol className="stage-list">
              {(['searching', 'synthesizing', 'verifying'] as ResearchStage[]).map((s, i) => {
                const order = ['searching', 'synthesizing', 'verifying'].indexOf(step.stage)
                const state = i < order ? 'done' : i === order ? 'now' : 'todo'
                return (
                  <li key={s} className={state}>
                    {state === 'done' ? '✓' : state === 'now' ? '●' : '○'} {STAGE_LABEL[s]}
                  </li>
                )
              })}
            </ol>
            <p className="hint small">1分ほどかかることがあります</p>
          </div>
        )}

        {step.kind === 'error' && (
          <div className="empty">
            <p>{step.message}</p>
            <button className="secondary" onClick={() => setStep({ kind: 'intro' })}>
              戻る
            </button>
          </div>
        )}

        {step.kind === 'result' && (
          <>
            <div className="coach-note">{step.res.report}</div>
            {step.res.keyPoints.length > 0 && (
              <ul className="keypoints">
                {step.res.keyPoints.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            )}
            <p className="hint small">
              {step.res.grounded ? `Web の ${step.res.citations.length} 件の情報を参照。` : 'Web 検索は使われず、モデルの知識で回答しました。'} モデル: {step.res.model}
            </p>
            {step.res.citations.length > 0 && (
              <details className="task-detail">
                <summary>出典（{step.res.citations.length}）</summary>
                <ul className="cite-list">
                  {step.res.citations.map((c, i) => (
                    <li key={i}>
                      <a href={c.uri} target="_blank" rel="noopener noreferrer">
                        {c.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {step.res.tactics.length > 0 && (
              <>
                <div className="section-head">
                  <span>提案された戦術</span>
                  <span className="hint small">登録すると編集できます</span>
                </div>
                <ul className="drill-list">
                  {step.res.tactics.map((p, i) => {
                    const data = toTacticData(p, settings)
                    const rows = flatten(data?.root ?? null)
                    const v = step.res.verdicts[i]
                    return (
                      <li key={i} className={`drill proposal ${pickedT.has(i) ? 'on' : ''} ${v ? VERDICT_META[v.verdict].cls : ''}`} onClick={() => !saved && toggle(pickedT, i, setPickedT)}>
                        <div className="drill-head">
                          <span className="check">{pickedT.has(i) ? '☑' : '☐'}</span>
                          <span className={`badge ${p.situation}`}>{p.situation === 'my_serve' ? 'サーブ' : 'レシーブ'}</span>
                          <span className="drill-title">{p.title}</span>
                          {v && <span className={`verdict ${VERDICT_META[v.verdict].cls}`}>{VERDICT_META[v.verdict].label}</span>}
                        </div>
                        <div className="proposal-body">
                          <div className="proposal-mini">
                            <TableDiagram path={defaultPath(data?.root ?? null)} hands={{ me: settings.myHand, opp: settings.defaultOppHand }} compact />
                          </div>
                          <div className="proposal-text">
                            <div className="drill-purpose">{p.goal}</div>
                            <div className="drill-detail">{p.reasoning}</div>
                          </div>
                        </div>
                        <details className="task-detail" onClick={(e) => e.stopPropagation()}>
                          <summary>展開（{rows.length} 球）</summary>
                          <ul className="proposal-tree">
                            {rows.map(({ node, depth }) => (
                              <li key={node.id} style={{ paddingLeft: depth * 12 }} className={node.player}>
                                <span className="dot" />
                                {nodeLabel(node)}
                                {node.isFinisher && <span className="star">★</span>}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}

            {step.res.drills.length > 0 && (
              <>
                <div className="section-head">
                  <span>提案された練習</span>
                </div>
                <ul className="drill-list">
                  {step.res.drills.map((d, i) => (
                    <li key={i} className={`drill ${pickedD.has(i) ? 'on' : ''}`} onClick={() => !saved && toggle(pickedD, i, setPickedD)}>
                      <div className="drill-head">
                        <span className="check">{pickedD.has(i) ? '☑' : '☐'}</span>
                        <span className="drill-title">{d.title}</span>
                      </div>
                      <div className="drill-target">{d.target}</div>
                      <div className="drill-detail">{d.detail}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="sheet-foot">
              {saved ? (
                <>
                  <p className="hint">{saved}</p>
                  <button className="primary" onClick={onClose}>
                    閉じる
                  </button>
                </>
              ) : (
                <>
                  <button className="primary" disabled={pickedT.size + pickedD.size === 0} onClick={() => void save()}>
                    選んだ内容を登録
                  </button>
                  <button className="secondary" onClick={() => setStep({ kind: 'intro' })}>
                    別のことを相談
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
