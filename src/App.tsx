import { useEffect } from 'react'
import { SettingsPage } from './pages/SettingsPage'
import { TacticDetailPage } from './pages/TacticDetailPage'
import { TacticListPage } from './pages/TacticListPage'
import { useStore } from './store/useStore'

export default function App() {
  const { loaded, view, load } = useStore()

  useEffect(() => {
    void load()
  }, [load])

  if (!loaded) return <div className="page loading">読み込み中…</div>

  switch (view.name) {
    case 'detail':
      return <TacticDetailPage id={view.id} />
    case 'settings':
      return <SettingsPage />
    default:
      return <TacticListPage />
  }
}
