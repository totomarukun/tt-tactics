import { useMemo, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { TacticCard } from '../components/TacticCard'
import { TacticMetaForm } from '../components/TacticMetaForm'
import type { Situation } from '../domain/types'
import { useStore } from '../store/useStore'

type Filter = 'all' | Situation

export function TacticListPage() {
  const { tactics, settings, navigate, addTactic } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [tag, setTag] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const allTags = useMemo(() => {
    const s = new Set<string>()
    tactics.forEach((t) => t.tags.forEach((x) => s.add(x)))
    return [...s]
  }, [tactics])

  const shown = tactics.filter(
    (t) => (filter === 'all' || t.situation === filter) && (!tag || t.tags.includes(tag)),
  )

  return (
    <div className="page">
      <header className="app-bar">
        <h1>戦術</h1>
      </header>

      <div className="chip-group filters">
        {(['all', 'my_serve', 'opp_serve'] as Filter[]).map((f) => (
          <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {{ all: 'すべて', my_serve: 'サーブ', opp_serve: 'レシーブ' }[f]}
          </button>
        ))}
        {allTags.length > 0 && <span className="sep" />}
        {allTags.map((t) => (
          <button key={t} className={`chip small ${tag === t ? 'on' : ''}`} onClick={() => setTag(tag === t ? null : t)}>
            {t}
          </button>
        ))}
      </div>

      {tactics.length === 0 ? (
        <div className="empty">
          <p>まだ戦術がありません。</p>
          <p>右下の「＋」から最初の戦術を作りましょう。</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p>条件に合う戦術がありません。</p>
        </div>
      ) : (
        <div className="card-list">
          {shown.map((t) => (
            <TacticCard key={t.id} tactic={t} myHand={settings.myHand} onOpen={(id) => navigate({ name: 'detail', id })} />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setCreating(true)} aria-label="新しい戦術">
        ＋
      </button>

      {creating && (
        <TacticMetaForm
          isNew
          initial={{
            title: '',
            situation: 'my_serve',
            goal: '',
            tags: [],
            oppHand: settings.defaultOppHand,
            confidence: 1,
          }}
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
