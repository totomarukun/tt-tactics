import type { Settings } from './types'

/**
 * docs/knowledge/*.md をビルド時に文字列として取り込む。
 * 章はファイル名順（01-, 02-, ...）。AI コーチのシステムプロンプトに渡す。
 */
const modules = import.meta.glob('../../docs/knowledge/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export interface Chapter {
  file: string
  title: string
  text: string
}

function stripSources(md: string): string {
  // 文末の「参考ソース」「参照」「出典」以降は AI に渡さない（トークン節約）
  const idx = md.search(/\n#{1,3}\s*(参考|参照|出典|ソース|Sources|References)/i)
  return idx > 0 ? md.slice(0, idx).trimEnd() : md
}

export const KNOWLEDGE_CHAPTERS: Chapter[] = Object.entries(modules)
  .map(([path, text]) => {
    const file = path.split('/').pop() ?? path
    const title = text.match(/^#\s+(.+)$/m)?.[1] ?? file
    return { file, title, text }
  })
  .sort((a, b) => a.file.localeCompare(b.file))

export function knowledgeText(settings: Settings): string {
  const parts = KNOWLEDGE_CHAPTERS.map((c) => stripSources(c.text))
  if (settings.coachNotes?.trim()) {
    parts.push(`# 選手・指導者からの追加知識と方針（最優先で尊重する）\n\n${settings.coachNotes.trim()}`)
  }
  return parts.join('\n\n---\n\n')
}

export function knowledgeStats(): { chapters: number; chars: number } {
  const chars = KNOWLEDGE_CHAPTERS.reduce((s, c) => s + stripSources(c.text).length, 0)
  return { chapters: KNOWLEDGE_CHAPTERS.length, chars }
}

/** システムプロンプトに埋め込む知識ブロック */
export function knowledgeBlock(settings: Settings): string {
  const body = knowledgeText(settings)
  if (!body.trim()) return ''
  return `

【コーチの知識ベース】
以下は指導理論・戦術・練習法の知識ベースです。提案はこの知識に基づいて行い、根拠となる原則を短く添えてください。知識ベースと一般的な知識が食い違う場合は知識ベースを優先します。選手からの追加知識と方針があれば、それを最優先します。

${body}`
}
