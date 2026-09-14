import { useMemo, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { ConsultSheet } from '../components/ConsultSheet'
import { TacticMetaForm } from '../components/TacticMetaForm'
import { WeeklyFocus } from '../components/WeeklyFocus'
import { diagnose, type AiInsight } from '../domain/harness/insightAi'
import { computeInsights, type Insight, type InsightView } from '../domain/insights'
import { weekProgress } from '../domain/week'
import { useStore } from '../store/useStore'

const TONE_ICON: Record<Insight['tone'], string> = { good: '◎', warn: '⚠', info: '💡' }

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function HomePage() {
  const { tactics, outcomes, tasks, logs, settings, navigate, addTactic } = useStore()
  const [consult, setConsult] = useState(false)
  const [creating, setCreating] = useState(false)
  const [ai, setAi] = useState<{ kind: 'idle' } | { kind: 'loading' } | { kind: 'ok'; res: AiInsight } | { kind: 'error'; message: string }>({ kind: 'idle' })

  const insights = useMemo(() => computeInsights({ tactics, outcomes, tasks, logs }), [tactics, outcomes, tasks, logs])

  const weekAgo = daysAgo(7)
  const weekOutcomes = outcomes.filter((o) => o.date >= weekAgo).length
  const weekPracticeDays = new Set(logs.filter((l) => l.date >= weekAgo && l.items.length > 0).map((l) => l.date)).size
  const openTasks = tasks.filter((t) => t.status === 'open').length
  const withRoot = tactics.filter((t) => t.root)

  const act = (view: InsightView, tacticId?: string) => {
    if (view === 'consult') setConsult(true)
    else if (view === 'detail' && tacticId) navigate({ name: 'detail', id: tacticId })
    else if (view === 'tasks') navigate({ name: 'tasks' })
    else if (view === 'practice') navigate({ name: 'practice' })
  }

  const runDiagnose = async () => {
    setAi({ kind: 'loading' })
    try {
      const res = await diagnose(settings, tactics, outcomes, tasks, logs)
      setAi({ kind: 'ok', res })
    } catch (e) {
      setAi({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const top = insights.slice(0, 3)

  return (
    <div className="page">
      <header className="app-bar">
        <h1>ホーム</h1>
        <button className="icon" onClick={() => navigate({ name: 'settings' })} aria-label="設定">
          ⚙
        </button>
      </header>

      {/* 今週の焦点（このアプリの背骨） */}
      {withRoot.length > 0 && <WeeklyFocus />}

      {/* 今週の目標（やさしい継続） */}
      {(() => {
        const goal = settings.weeklyGoal ?? 1
        const wp = weekProgress(logs, outcomes, goal)
        return (
          <div className={`week-goal ${wp.done ? 'done' : ''}`}>
            <div className="wg-top">
              <span className="wg-label">今週の目標</span>
              <span className="wg-count">
                {wp.active} / {goal} 日{wp.done && ' ◎'}
              </span>
            </div>
            <div className="wg-bar">
              {Array.from({ length: goal }).map((_, i) => (
                <span key={i} className={i < wp.active ? 'fill' : ''} />
              ))}
            </div>
            <div className="wg-msg">{wp.done ? '今週の目標を達成。お疲れさま。' : wp.active === 0 ? '練習や試合を記録すると進みます。休む週があってもOK。' : 'いいペース。焦らず続けましょう。'}</div>
          </div>
        )
      })()}

      {/* 今週の数字 */}
      <div className="week-stats">
        <div>
          <b>{weekOutcomes}</b>
          <span>今週の試合記録</span>
        </div>
        <div>
          <b>{weekPracticeDays}</b>
          <span>今週の練習日</span>
        </div>
        <div>
          <b>{openTasks}</b>
          <span>取り組み中の課題</span>
        </div>
      </div>

      {/* 今日の一手 */}
      <div className="section-head">
        <span>今日の一手</span>
      </div>
      {withRoot.length === 0 ? (
        <div className="home-card info">
          <div className="hc-title">💡 まず最初の戦術をつくろう</div>
          <div className="hc-detail">あなたのサーブやレシーブからの得意な展開を1つ登録するところから始めます。AI に提案してもらうこともできます。</div>
          <div className="btn-row">
            <button className="primary" onClick={() => setConsult(true)}>
              コーチに相談
            </button>
            <button className="secondary" onClick={() => setCreating(true)}>
              手動でつくる
            </button>
          </div>
        </div>
      ) : (
        top.map((i) => (
          <div key={i.id} className={`home-card ${i.tone}`}>
            <div className="hc-title">
              {TONE_ICON[i.tone]} {i.title}
            </div>
            <div className="hc-detail">{i.detail}</div>
            {i.action && (
              <button className="hc-action" onClick={() => act(i.action!.view, i.action!.tacticId)}>
                {i.action.label} ›
              </button>
            )}
          </div>
        ))
      )}
      {insights.length > 3 && <p className="hint small" style={{ textAlign: 'center' }}>ほか {insights.length - 3} 件の気づき</p>}

      {/* AI 診断 */}
      {withRoot.length > 0 && (
        <>
          <div className="section-head">
            <span>AI コーチの診断</span>
          </div>
          {ai.kind === 'idle' && (
            <button className="ai-cta diagnose" onClick={() => void runDiagnose()}>
              <span className="ai-cta-icon">✦</span>
              <span>
                <strong>今の状態を診断してもらう</strong>
                <small>戦術と試合結果を読んで、次に絞る一つの狙いを教えてくれます</small>
              </span>
            </button>
          )}
          {ai.kind === 'loading' && (
            <div className="home-card info">
              <div className="spinner" />
              <p className="hint small" style={{ textAlign: 'center' }}>データを読んで考えています…</p>
            </div>
          )}
          {ai.kind === 'error' && (
            <div className="home-card warn">
              <div className="hc-detail">{ai.message}</div>
              <button className="hc-action" onClick={() => void runDiagnose()}>
                もう一度 ›
              </button>
            </div>
          )}
          {ai.kind === 'ok' && (
            <div className="home-card ai">
              <div className="hc-detail">{ai.res.diagnosis}</div>
              <div className="ai-aim">
                <span className="aim-label">次の狙い</span>
                {ai.res.oneAim}
              </div>
              <div className="btn-row">
                <button className="secondary" onClick={() => setConsult(true)}>
                  相談する
                </button>
                <button className="link-btn" onClick={() => void runDiagnose()}>
                  更新
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* クイック導線 */}
      <div className="home-quick">
        <button onClick={() => setConsult(true)}>🔎 コーチに相談</button>
        <button onClick={() => navigate({ name: 'tasks' })}>☑ すべての課題</button>
        <button onClick={() => navigate({ name: 'practice' })}>📅 練習を記録</button>
      </div>

      {consult && <ConsultSheet onClose={() => setConsult(false)} />}
      {creating && (
        <TacticMetaForm
          isNew
          initial={{ title: '', situation: 'my_serve', goal: '', tags: [], oppHand: settings.defaultOppHand, confidence: 1 }}
          onClose={() => setCreating(false)}
          onSave={async (m) => {
            const t = await addTactic({ ...m })
            setCreating(false)
            navigate({ name: 'detail', id: t.id })
          }}
        />
      )}
      <BottomNav />
    </div>
  )
}
