import { useStore } from '../store/useStore'

const TABS = [
  { key: 'list', label: '戦術', icon: '◫' },
  { key: 'tasks', label: '課題', icon: '☑' },
  { key: 'practice', label: '練習', icon: '📅' },
  { key: 'settings', label: '設定', icon: '⚙' },
] as const

export function BottomNav() {
  const { view, navigate } = useStore()
  const active = view.name === 'detail' ? 'list' : view.name
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <button key={t.key} className={active === t.key ? 'on' : ''} onClick={() => navigate({ name: t.key })}>
          <span className="nav-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
