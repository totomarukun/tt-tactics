import { useMemo, useState } from 'react'
import { AiCoachSheet } from '../components/AiCoachSheet'
import { BottomNav } from '../components/BottomNav'
import { ShotSheet, type ShotData } from '../components/ShotSheet'
import { TaskSheet } from '../components/TaskSheet'
import { ShotTree } from '../components/ShotTree'
import { TableDiagram } from '../components/TableDiagram'
import { TacticMetaForm, metaOf } from '../components/TacticMetaForm'
import { nodeLabel } from '../domain/presets'
import { addChild, createShot, defaultPath, findNode, findPath, otherPlayer, removeNode, updateNode } from '../domain/tree'
import type { ShotNode } from '../domain/types'
import { useStore } from '../store/useStore'

type Sheet =
  | { kind: 'none' }
  | { kind: 'add'; parentId: string | null } // null = 根を作る
  | { kind: 'edit'; id: string }

export function TacticDetailPage({ id }: { id: string }) {
  const { tactics, tasks, settings, navigate, updateTactic, deleteTactic, addTask, updateTask } = useStore()
  const [aiOpen, setAiOpen] = useState(false)
  const [newTask, setNewTask] = useState(false)
  const tactic = tactics.find((t) => t.id === id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' })
  const [editingMeta, setEditingMeta] = useState(false)

  const root = tactic?.root ?? null
  const path = useMemo(() => {
    const p = selectedId ? findPath(root, selectedId) : null
    return p ?? defaultPath(root)
  }, [root, selectedId])
  const pathIds = useMemo(() => new Set(path.map((n) => n.id)), [path])

  if (!tactic) {
    return (
      <div className="page">
        <header className="app-bar">
          <button className="icon" onClick={() => navigate({ name: 'list' })}>
            ‹
          </button>
          <h1>見つかりません</h1>
        </header>
      </div>
    )
  }

  const hands = { me: settings.myHand, opp: tactic.oppHand }
  const linkedTasks = tasks.filter((t) => t.tacticIds.includes(tactic.id))
  const effectiveSelected = selectedId && findNode(root, selectedId) ? selectedId : (path[path.length - 1]?.id ?? null)

  const saveRoot = (next: ShotNode | null) => updateTactic(tactic.id, { root: next })

  const handleSave = (data: ShotData, next: boolean) => {
    if (sheet.kind === 'add') {
      const shot = createShot(data)
      const newRoot = sheet.parentId === null || !root ? shot : addChild(root, sheet.parentId, shot)
      void saveRoot(newRoot)
      setSelectedId(shot.id)
      setSheet(next ? { kind: 'add', parentId: shot.id } : { kind: 'none' })
    } else if (sheet.kind === 'edit' && root) {
      void saveRoot(updateNode(root, sheet.id, data))
      setSheet({ kind: 'none' })
    }
  }

  const handleDelete = (nid: string) => {
    if (!root) return
    const n = findNode(root, nid)
    if (!n) return
    const count = 1 + countDesc(n)
    if (!confirm(`「${nodeLabel(n)}」${count > 1 ? `と続く${count - 1}球` : ''}を削除しますか？`)) return
    void saveRoot(removeNode(root, nid))
    setSelectedId(null)
  }

  // 入力シートに渡す情報
  let sheetProps: { player: ShotNode['player']; isServe: boolean; contextPath: ShotNode[]; initial?: ShotNode } | null = null
  if (sheet.kind === 'add') {
    if (sheet.parentId === null || !root) {
      sheetProps = { player: tactic.situation === 'my_serve' ? 'me' : 'opp', isServe: true, contextPath: [] }
    } else {
      const p = findPath(root, sheet.parentId)
      const parent = p?.[p.length - 1]
      if (parent) sheetProps = { player: otherPlayer(parent.player), isServe: false, contextPath: p }
    }
  } else if (sheet.kind === 'edit' && root) {
    const p = findPath(root, sheet.id)
    const n = p?.[p.length - 1]
    if (n) sheetProps = { player: n.player, isServe: n.stroke === 'serve', contextPath: p, initial: n }
  }

  return (
    <div className="page">
      <header className="app-bar">
        <button className="icon" onClick={() => navigate({ name: 'list' })} aria-label="戻る">
          ‹
        </button>
        <h1 className="clickable" onClick={() => setEditingMeta(true)}>
          {tactic.title}
        </h1>
        <button className="icon" onClick={() => setEditingMeta(true)} aria-label="戦術の設定">
          ✎
        </button>
      </header>

      <div className="meta-line">
        <span className={`badge ${tactic.situation}`}>{tactic.situation === 'my_serve' ? 'サーブ' : 'レシーブ'}</span>
        {tactic.oppHand === 'left' && <span className="tag">対左</span>}
        {tactic.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
        {tactic.goal && <span className="goal">{tactic.goal}</span>}
      </div>

      <div className="diagram-wrap">
        <TableDiagram path={path} hands={hands} onShotTap={setSelectedId} selectedId={effectiveSelected} />
      </div>

      {root ? (
        <>
          <div className="section-head">
            <span>分岐</span>
            <span className="hint small">行をタップで経路を表示</span>
          </div>
          <ShotTree
            root={root}
            selectedId={effectiveSelected}
            pathIds={pathIds}
            onSelect={setSelectedId}
            onAddChild={(nid) => setSheet({ kind: 'add', parentId: nid })}
            onEdit={(nid) => setSheet({ kind: 'edit', id: nid })}
            onDelete={handleDelete}
          />
        </>
      ) : (
        <div className="empty">
          <p>{tactic.situation === 'my_serve' ? '自分のサーブ' : '相手のサーブ'}から始まります。</p>
          <button className="primary" onClick={() => setSheet({ kind: 'add', parentId: null })}>
            1球目を入力
          </button>
        </div>
      )}

      <div className="section-head">
        <span>練習メニュー</span>
        <span className="hint small">{linkedTasks.length} 件</span>
      </div>
      <div className="task-box">
        {linkedTasks.length === 0 && <p className="hint small">この戦術に紐づく課題はまだありません。</p>}
        <ul className="task-list plain">
          {linkedTasks.map((t) => (
            <li key={t.id} className={`task-row ${t.status}`}>
              <button className="task-check" onClick={() => updateTask(t.id, { status: t.status === 'done' ? 'open' : 'done' })}>
                {t.status === 'done' ? '☑' : '☐'}
              </button>
              <button className="task-main" onClick={() => navigate({ name: 'tasks' })}>
                <div className="task-title">
                  {t.title}
                  {t.source === 'ai' && <span className="ai-badge">AI</span>}
                </div>
                {t.purpose && <div className="task-purpose">{t.purpose}</div>}
              </button>
            </li>
          ))}
        </ul>
        <div className="btn-row">
          <button className="primary" onClick={() => setAiOpen(true)} disabled={!root}>
            AI コーチに提案してもらう
          </button>
          <button className="secondary" onClick={() => setNewTask(true)}>
            手動で追加
          </button>
        </div>
        {!root && <p className="hint small">球を入力してから AI コーチを呼んでください。</p>}
      </div>

      {aiOpen && <AiCoachSheet tactic={tactic} onClose={() => setAiOpen(false)} />}
      {newTask && (
        <TaskSheet
          isNew
          initial={{ title: '', purpose: '', detail: '', tacticIds: [tactic.id] }}
          tactics={tactics}
          onClose={() => setNewTask(false)}
          onSave={async (dft) => {
            await addTask(dft)
            setNewTask(false)
          }}
        />
      )}

      {sheetProps && (
        <ShotSheet
          key={`${sheet.kind}-${sheet.kind === 'edit' ? sheet.id : sheet.kind === 'add' ? sheet.parentId : ''}-${sheetProps.player}-${sheetProps.isServe}`}
          player={sheetProps.player}
          isServe={sheetProps.isServe}
          contextPath={sheetProps.contextPath}
          initial={sheetProps.initial}
          hands={hands}
          strokeOrder={settings.strokeOrder}
          allowNext={sheet.kind === 'add'}
          onSave={handleSave}
          onClose={() => setSheet({ kind: 'none' })}
        />
      )}

      {editingMeta && (
        <TacticMetaForm
          isNew={false}
          initial={metaOf(tactic)}
          onClose={() => setEditingMeta(false)}
          onSave={(m) => {
            void updateTactic(tactic.id, m)
            setEditingMeta(false)
          }}
          onDelete={() => {
            if (!confirm(`「${tactic.title}」を削除しますか？`)) return
            void deleteTactic(tactic.id)
            navigate({ name: 'list' })
          }}
        />
      )}
      <BottomNav />
    </div>
  )
}

function countDesc(n: ShotNode): number {
  return n.children.reduce((s, c) => s + 1 + countDesc(c), 0)
}
