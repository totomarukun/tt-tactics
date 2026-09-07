import { useState } from 'react'
import { HAND_LABEL, SERVE_LABEL, SERVE_TYPES, SPINS, SPIN_LABEL, STROKE_LABEL } from '../domain/presets'
import type { Col, Hand, Hands, Player, ServeType, ShotNode, Spin, StrokeType, Zone } from '../domain/types'
import { COL_LABEL, zoneLabel } from '../domain/zone'
import { TableDiagram } from './TableDiagram'

export type ShotData = Omit<ShotNode, 'id' | 'children'>

interface Props {
  player: Player
  isServe: boolean
  contextPath: ShotNode[]
  hands: Hands
  strokeOrder: StrokeType[]
  initial?: ShotNode
  allowNext: boolean
  onSave: (data: ShotData, next: boolean) => void
  onClose: () => void
}

export function ShotSheet({
  player,
  isServe,
  contextPath,
  hands,
  strokeOrder,
  initial,
  allowNext,
  onSave,
  onClose,
}: Props) {
  const [zone, setZone] = useState<Zone | null>(initial?.zone ?? null)
  const [stroke, setStroke] = useState<StrokeType>(initial?.stroke ?? (isServe ? 'serve' : strokeOrder[0]))
  const [hand, setHand] = useState<Hand | undefined>(initial?.hand)
  const [serveType, setServeType] = useState<ServeType | undefined>(initial?.serveType)
  const [serveFrom, setServeFrom] = useState<Col | undefined>(initial?.serveFrom)
  const [spin, setSpin] = useState<Spin | undefined>(initial?.spin)
  const [isFinisher, setFinisher] = useState(!!initial?.isFinisher)
  const [note, setNote] = useState(initial?.note ?? '')

  const tapSide = player === 'me' ? 'opp' : 'me'
  const ready = !!zone && (!isServe || (!!serveType && (player === 'opp' || !!serveFrom)))

  const build = (): ShotData => ({
    player,
    zone: zone!,
    stroke: isServe ? 'serve' : stroke,
    hand,
    serveType: isServe ? serveType : undefined,
    serveFrom: isServe && player === 'me' ? serveFrom : undefined,
    spin,
    isFinisher,
    note: note.trim() || undefined,
  })

  const who = player === 'me' ? '自分' : '相手'

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className={`who ${player}`}>{who}の球</span>
          <span className="sheet-title">
            {initial ? '編集' : `${contextPath.length + 1}球目`}
            {isServe ? '（サーブ）' : ''}
          </span>
          <button className="icon" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <p className="hint">
          {zone ? `着点: ${zoneLabel(zone)}` : `${player === 'me' ? '相手' : '自分'}コートの着点をタップ`}
        </p>
        <TableDiagram
          path={initial ? contextPath.slice(0, -1) : contextPath}
          hands={hands}
          tapSide={tapSide}
          onZoneTap={setZone}
          highlightZone={zone}
          pendingServeFrom={isServe && player === 'me' ? serveFrom ?? null : null}
          dim
        />

        {isServe ? (
          <>
            {player === 'me' && (
              <div className="chip-group">
                <span className="chip-label">出す位置</span>
                {(['F', 'M', 'B'] as Col[]).map((c) => (
                  <button
                    key={c}
                    className={`chip ${serveFrom === c ? 'on' : ''}`}
                    onClick={() => setServeFrom(c)}
                  >
                    {COL_LABEL[c]}側
                  </button>
                ))}
              </div>
            )}
            <div className="chip-group">
              <span className="chip-label">サーブ</span>
              {SERVE_TYPES.map((s) => (
                <button
                  key={s}
                  className={`chip ${serveType === s ? 'on' : ''}`}
                  onClick={() => setServeType(s)}
                >
                  {SERVE_LABEL[s]}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="chip-group">
              <span className="chip-label">技術</span>
              {strokeOrder.map((s) => (
                <button
                  key={s}
                  className={`chip ${stroke === s ? 'on' : ''}`}
                  onClick={() => setStroke(s)}
                >
                  {STROKE_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="chip-group">
              <span className="chip-label">面</span>
              {(['F', 'B'] as Hand[]).map((h) => (
                <button
                  key={h}
                  className={`chip ${hand === h ? 'on' : ''}`}
                  onClick={() => setHand(hand === h ? undefined : h)}
                >
                  {HAND_LABEL[h]}
                </button>
              ))}
            </div>
            <div className="chip-group">
              <span className="chip-label">回転</span>
              {SPINS.map((s) => (
                <button
                  key={s}
                  className={`chip ${spin === s ? 'on' : ''}`}
                  onClick={() => setSpin(spin === s ? undefined : s)}
                >
                  {SPIN_LABEL[s]}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="chip-group">
          <button className={`chip star-chip ${isFinisher ? 'on' : ''}`} onClick={() => setFinisher(!isFinisher)}>
            ★ 決め球
          </button>
          <input
            className="note-input"
            placeholder="メモ（任意）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="sheet-foot">
          <button className="primary" disabled={!ready} onClick={() => onSave(build(), false)}>
            保存
          </button>
          {allowNext && (
            <button className="secondary" disabled={!ready} onClick={() => onSave(build(), true)}>
              保存して次の球へ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
