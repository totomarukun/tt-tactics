import { useRef, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import type { Handedness } from '../domain/types'
import { useStore, type ExportFile } from '../store/useStore'

export function SettingsPage() {
  const { settings, tactics, navigate, updateSettings, exportData, importData } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [keyDraft, setKeyDraft] = useState(settings.anthropicApiKey ?? '')
  const [profileDraft, setProfileDraft] = useState(settings.playerProfile ?? '')
  void navigate

  const doExport = async () => {
    const data = exportData()
    const json = JSON.stringify(data, null, 2)
    const date = new Date().toISOString().slice(0, 10)
    const name = `tt-tactics-${date}.json`
    const file = new File([json], name, { type: 'application/json' })
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: name })
        return
      } catch {
        /* キャンセル時はダウンロードにフォールバック */
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async (f: File, mode: 'merge' | 'replace') => {
    try {
      const parsed = JSON.parse(await f.text()) as ExportFile
      const n = await importData(parsed, mode)
      setMsg(`${n}件の戦術を読み込みました`)
    } catch (e) {
      setMsg(`読み込み失敗: ${(e as Error).message}`)
    }
  }

  return (
    <div className="page">
      <header className="app-bar">
        <h1>設定</h1>
      </header>

      <section className="settings-section">
        <h2>利き手</h2>
        <div className="chip-group">
          <span className="chip-label">自分</span>
          {(['right', 'left'] as Handedness[]).map((h) => (
            <button key={h} className={`chip ${settings.myHand === h ? 'on' : ''}`} onClick={() => updateSettings({ myHand: h })}>
              {h === 'right' ? '右' : '左'}
            </button>
          ))}
        </div>
        <div className="chip-group">
          <span className="chip-label">相手の既定</span>
          {(['right', 'left'] as Handedness[]).map((h) => (
            <button
              key={h}
              className={`chip ${settings.defaultOppHand === h ? 'on' : ''}`}
              onClick={() => updateSettings({ defaultOppHand: h })}
            >
              {h === 'right' ? '右' : '左'}
            </button>
          ))}
        </div>
        <p className="hint small">相手の利き手は戦術ごとに変更できます。ここは新規作成時の初期値です。</p>
      </section>

      <section className="settings-section">
        <h2>AI コーチ</h2>
        <p className="hint small">
          Anthropic の API キーを登録すると、戦術の詳細画面から練習メニューを提案してもらえます。キーはこの端末にだけ保存され、エクスポートには含まれません。
        </p>
        <label className="field">
          <span>API キー</span>
          <input
            type="password"
            value={keyDraft}
            placeholder="sk-ant-..."
            autoComplete="off"
            onChange={(e) => setKeyDraft(e.target.value)}
            onBlur={() => updateSettings({ anthropicApiKey: keyDraft.trim() || undefined })}
          />
        </label>
        <label className="field">
          <span>自分のプレースタイル（AI に渡す情報）</span>
          <textarea
            rows={3}
            value={profileDraft}
            placeholder="例: シェークハンド両ハンドドライブ型。両面裏ソフト。バックのチキータが得意、フォアの決定力が課題"
            onChange={(e) => setProfileDraft(e.target.value)}
            onBlur={() => updateSettings({ playerProfile: profileDraft.trim() || undefined })}
          />
        </label>
      </section>

      <section className="settings-section">
        <h2>データ</h2>
        <p className="hint">
          データはこの端末のブラウザ内にだけ保存されます。機種変更やブラウザのデータ削除に備えて、定期的にエクスポートしてください。
        </p>
        <p className="hint small">現在 {tactics.length} 件の戦術</p>
        <div className="btn-row">
          <button className="primary" onClick={doExport}>
            JSON をエクスポート
          </button>
          <button className="secondary" onClick={() => fileRef.current?.click()}>
            JSON をインポート
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            const replace = tactics.length > 0 && confirm('既存の戦術を消して置き換えますか？\n「キャンセル」で追加（同じIDは上書き）します。')
            void doImport(f, replace ? 'replace' : 'merge')
          }}
        />
        {msg && <p className="hint">{msg}</p>}
      </section>

      <section className="settings-section">
        <h2>このアプリについて</h2>
        <p className="hint small">tt-tactics v0.4 — 卓球の戦術を台の図と分岐図で整理し、練習課題につなげる個人用ノート。</p>
      </section>
      <BottomNav />
    </div>
  )
}
