import { useStore } from '../store/useStore'

const TABS = [
  { key: 'home', label: 'ホーム', icon: '🏠' },
  { key: 'list', label: '戦術', icon: '◫' },
  { key: 'practice', label: '記録', icon: '📅' },
] as const

export function BottomNav() {
  const { view, navigate } = useStore()
  const active = view.name === 'detail' ? 'list' : view.name === 'tasks' ? 'home' : view.name
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
