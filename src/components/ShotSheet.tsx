import { useState } from 'react'
import { HAND_LABEL, SERVE_MOTIONS, SERVE_MOTION_LABEL, STROKE_LABEL } from '../domain/presets'
import type { BallHeight, Col, Hand, Hands, Player, ServeMotion, ShotNode, Spin, StrokeType, Zone } from '../domain/types'
import { HEIGHT_LABEL } from '../domain/spin'
import { COL_LABEL, DEPTH_LONG_LABEL, zoneLabel } from '../domain/zone'
import { SpinPicker } from './Spin'
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
  const [serveMotion, setServeMotion] = useState<ServeMotion | undefined>(initial?.serveMotion ?? (isServe ? 'forehand' : undefined))
  const [serveFrom, setServeFrom] = useState<Col | undefined>(initial?.serveFrom)
  const [spin, setSpin] = useState<Spin | undefined>(initial?.spin)
  const [height, setHeight] = useState<BallHeight | undefined>(initial?.height)
  const [isFinisher, setFinisher] = useState(!!initial?.isFinisher)
  const [note, setNote] = useState(initial?.note ?? '')

  const tapSide = player === 'me' ? 'opp' : 'me'
  const ready = !!zone && (!isServe || (!!spin && (player === 'opp' || !!serveFrom)))

  const build = (): ShotData => ({
    player,
    zone: zone!,
    stroke: isServe ? 'serve' : stroke,
    hand: isServe ? undefined : hand,
    serveMotion: isServe ? serveMotion : undefined,
    serveFrom: isServe && player === 'me' ? serveFrom : undefined,
    spin,
    height,
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
          {zone
            ? `着点: ${zoneLabel(zone)}（${DEPTH_LONG_LABEL[zone.depth]}）`
            : `${player === 'me' ? '相手' : '自分'}コートの着点をタップ。前＝台上2バウンド、ハーフ＝出るか出ないか、奥＝ロング`}
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
              <span className="chip-label">出し方</span>
              {SERVE_MOTIONS.map((m) => (
                <button
                  key={m}
                  className={`chip ${serveMotion === m ? 'on' : ''}`}
                  onClick={() => setServeMotion(m)}
                >
                  {SERVE_MOTION_LABEL[m]}
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
          </>
        )}

        <div className="chip-group">
          <span className="chip-label">高さ</span>
          {(Object.keys(HEIGHT_LABEL) as BallHeight[]).map((h) => (
            <button key={h} className={`chip ${height === h ? 'on' : ''}`} onClick={() => setHeight(height === h ? undefined : h)}>
              {HEIGHT_LABEL[h]}
            </button>
          ))}
          <span className="hint small">未選択＝普通</span>
        </div>

        <div className="chip-group spin-row">
          <span className="chip-label">回転{isServe ? '' : '（任意）'}</span>
          <SpinPicker value={spin} onChange={setSpin} leftHanded={(player === 'me' ? hands.me : hands.opp) === 'left'} />
        </div>

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
          {allowNext && (
            <button className="primary" disabled={!ready} onClick={() => onSave(build(), true)}>
              保存して次の球へ
            </button>
          )}
          <button className={allowNext ? 'secondary' : 'primary'} disabled={!ready} onClick={() => onSave(build(), false)}>
            保存{allowNext ? 'して閉じる' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
