import { useRef, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { ProfileSheet } from '../components/ProfileSheet'
import { profileIsFilled } from '../domain/profile'
import { KNOWLEDGE_CHAPTERS, knowledgeStats } from '../domain/knowledge'
import type { Handedness } from '../domain/types'
import { useStore, type ExportFile } from '../store/useStore'

export function SettingsPage() {
  const { settings, tactics, navigate, updateSettings, exportData, importData } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [keyDraft, setKeyDraft] = useState(settings.geminiApiKey ?? '')
  const [modelDraft, setModelDraft] = useState(settings.geminiModel ?? '')
  const [profileOpen, setProfileOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState(settings.coachNotes ?? '')
  const [showChapters, setShowChapters] = useState(false)
  const kstats = knowledgeStats()
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
          Google AI Studio（aistudio.google.com）で発行した Gemini の API キーを登録すると、戦術の詳細画面から練習メニューを提案してもらえます。キーはこの端末にだけ保存され、エクスポートには含まれません。
        </p>
        <label className="field">
          <span>Gemini API キー</span>
          <input
            type="password"
            value={keyDraft}
            placeholder="AIza..."
            autoComplete="off"
            onChange={(e) => setKeyDraft(e.target.value)}
            onBlur={() => updateSettings({ geminiApiKey: keyDraft.trim() || undefined })}
          />
        </label>
        <label className="field">
          <span>モデル名（任意。空なら最新の Pro 系を自動選択）</span>
          <input
            value={modelDraft}
            placeholder="例: gemini-2.5-pro"
            autoComplete="off"
            onChange={(e) => setModelDraft(e.target.value)}
            onBlur={() => updateSettings({ geminiModel: modelDraft.trim() || undefined })}
          />
        </label>
        <div className="field">
          <span>プレースタイル診断</span>
          <button className="secondary full" onClick={() => setProfileOpen(true)}>
            {profileIsFilled(settings) ? '診断内容を編集' : '診断を入力する'}
          </button>
          <p className="hint small">戦型・強み・弱み・目指すプレーなど。AI コーチの戦術提案と練習メニューの材料になります。</p>
        </div>
        <div className="field">
          <span>コーチの知識ベース</span>
          <p className="hint small">
            {kstats.chapters} 章・約 {Math.round(kstats.chars / 1000)} 千字の指導理論をアプリに同梱し、毎回の提案時に AI へ渡しています。
            <button className="link-btn" onClick={() => setShowChapters(!showChapters)}>
              {showChapters ? '閉じる' : '章の一覧'}
            </button>
          </p>
          {showChapters && (
            <ul className="chapter-list">
              {KNOWLEDGE_CHAPTERS.map((c) => (
                <li key={c.file}>{c.title}</li>
              ))}
            </ul>
          )}
        </div>
        <label className="field">
          <span>コーチへの追加知識・指導方針</span>
          <textarea
            rows={4}
            value={notesDraft}
            placeholder="例: まず台上で崩してから攻める方針を優先。バック対バックで粘るより早めにフォアに回り込む。本で学んだ理論や、自分のコーチの教えもここに"
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => updateSettings({ coachNotes: notesDraft.trim() || undefined })}
          />
          <p className="hint small">ここに書いた内容は知識ベースより優先されます。</p>
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
      {profileOpen && <ProfileSheet onClose={() => setProfileOpen(false)} />}
      <BottomNav />
    </div>
  )
}
