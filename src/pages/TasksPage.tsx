import { useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { TaskSheet, draftOf } from '../components/TaskSheet'
import type { Task } from '../domain/types'
import { useStore } from '../store/useStore'

type Sheet = { kind: 'none' } | { kind: 'new' } | { kind: 'edit'; id: string }

export function TasksPage() {
  const { tasks, tactics, logs, addTask, updateTask, deleteTask, navigate } = useStore()
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' })
  const [showDone, setShowDone] = useState(false)

  const open = tasks.filter((t) => t.status === 'open')
  const done = tasks.filter((t) => t.status === 'done')
  const tacticName = (id: string) => tactics.find((t) => t.id === id)?.title

  // 直近の練習結果（◎○△）を課題ごとに集計
  const recent = (taskId: string) =>
    logs
      .flatMap((l) => l.items.filter((i) => i.taskId === taskId && i.result).map((i) => ({ date: l.date, result: i.result! })))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)

  const RESULT_MARK = { good: '◎', ok: '○', bad: '△' } as const

  const row = (t: Task) => (
    <li key={t.id} className={`task-row ${t.status}`}>
      <button
        className="task-check"
        aria-label={t.status === 'done' ? '未達成に戻す' : '達成にする'}
        onClick={() => updateTask(t.id, { status: t.status === 'done' ? 'open' : 'done' })}
      >
        {t.status === 'done' ? '☑' : '☐'}
      </button>
      <button className="task-main" onClick={() => setSheet({ kind: 'edit', id: t.id })}>
        <div className="task-title">
          {t.title}
          {t.source === 'ai' && <span className="ai-badge">AI</span>}
        </div>
        {t.purpose && <div className="task-purpose">{t.purpose}</div>}
        <div className="task-meta">
          {t.tacticIds.map((id) => {
            const name = tacticName(id)
            return name ? (
              <span
                key={id}
                className="tag link"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate({ name: 'detail', id })
                }}
              >
                {name}
              </span>
            ) : null
          })}
          {recent(t.id).length > 0 && <span className="task-results">{recent(t.id).map((r) => RESULT_MARK[r.result]).join('')}</span>}
        </div>
      </button>
    </li>
  )

  const editing = sheet.kind === 'edit' ? tasks.find((t) => t.id === sheet.id) : undefined

  return (
    <div className="page">
      <header className="app-bar">
        <h1>練習課題</h1>
      </header>

      {open.length === 0 ? (
        <div className="empty">
          <p>取り組み中の課題はありません。</p>
          <p className="hint small">戦術の詳細画面で AI コーチに提案してもらうか、右下の「＋」から追加できます。</p>
        </div>
      ) : (
        <ul className="task-list">{open.map(row)}</ul>
      )}

      {done.length > 0 && (
        <>
          <button className="section-toggle" onClick={() => setShowDone(!showDone)}>
            達成した課題 {done.length} 件 {showDone ? '▲' : '▼'}
          </button>
          {showDone && <ul className="task-list">{done.map(row)}</ul>}
        </>
      )}

      <button className="fab" onClick={() => setSheet({ kind: 'new' })} aria-label="新しい課題">
        ＋
      </button>

      {sheet.kind === 'new' && (
        <TaskSheet
          isNew
          initial={{ title: '', purpose: '', detail: '', tacticIds: [] }}
          tactics={tactics}
          onClose={() => setSheet({ kind: 'none' })}
          onSave={async (d) => {
            await addTask(d)
            setSheet({ kind: 'none' })
          }}
        />
      )}
      {editing && (
        <TaskSheet
          isNew={false}
          initial={draftOf(editing)}
          tactics={tactics}
          onClose={() => setSheet({ kind: 'none' })}
          onSave={async (d) => {
            await updateTask(editing.id, d)
            setSheet({ kind: 'none' })
          }}
          onDelete={async () => {
            if (!confirm(`「${editing.title}」を削除しますか？`)) return
            await deleteTask(editing.id)
            setSheet({ kind: 'none' })
          }}
        />
      )}
      <BottomNav />
    </div>
  )
}
