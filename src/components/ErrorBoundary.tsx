import { Component, type ReactNode } from 'react'
import { db } from '../store/db'
import { logEvent } from '../domain/harness/events'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

// ハーネスの Recovery。描画中のエラーを受け止め、白画面にせず復旧手段を出す。
// データを失わずに救出（エクスポート）してから再読み込みできる。

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    logEvent('error', 'render', error.message, error.stack)
  }

  private async rescueExport() {
    try {
      const [tactics, tasks, logs, settingsRow] = await Promise.all([
        db.tactics.toArray(),
        db.tasks.toArray(),
        db.logs.toArray(),
        db.settings.get('main'),
      ])
      const settings = settingsRow?.value ?? {}
      const { geminiApiKey: _drop, ...safeSettings } = settings as Record<string, unknown>
      void _drop
      const data = { app: 'tt-tactics', version: 2, exportedAt: new Date().toISOString(), settings: safeSettings, tactics, tasks, logs }
      const file = new File([JSON.stringify(data, null, 2)], `tt-tactics-rescue-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('データの救出に失敗しました。ブラウザのダウンロードが許可されているか確認してください。')
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page">
        <div className="crash">
          <h1>問題が発生しました</h1>
          <p className="hint">画面の描画中にエラーが起きました。データは端末に残っています。まずデータを救出してから再読み込みしてください。</p>
          <pre className="crash-msg">{this.state.error.message}</pre>
          <div className="sheet-foot">
            <button className="secondary" onClick={() => void this.rescueExport()}>
              データを救出（JSON 保存）
            </button>
            <button className="primary" onClick={() => location.reload()}>
              再読み込み
            </button>
          </div>
          <p className="hint small">直らない場合は、救出した JSON を保管したうえで、設定のデータ削除やブラウザのサイトデータ削除を試してください。</p>
        </div>
      </div>
    )
  }
}
