import type { ReactNode } from 'react'
import { SPIN_GRID, SPIN_LABEL, SPIN_VECTOR } from '../domain/spin'
import type { Spin } from '../domain/types'

interface GlyphProps {
  spin: Spin
  size?: number
  color?: string
  /** SVG 内に埋め込む場合の中心座標 */
  cx?: number
  cy?: number
  asGroup?: boolean
  /** 打者が左利きなら横回転の向きを反転 */
  leftHanded?: boolean
}

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180
  return { x: r * Math.cos(a), y: r * Math.sin(a) }
}

/**
 * ボールを上から見た回転の図。
 * 横回転: 順横＝時計回り、逆横＝反時計回りの円弧矢印（左利きは反転）。
 * 上下回転: 中央に上向き／下向きの矢印。ナックルは点。
 */
export function SpinGlyph({ spin, size = 22, color = '#1a202c', cx = 0, cy = 0, asGroup, leftHanded }: GlyphProps) {
  const r = size / 2
  const v = SPIN_VECTOR[spin]
  const side = leftHanded ? -v.x : v.x // +1 = 時計回り
  const vert = v.y // -1 上回転, +1 下回転
  const sw = Math.max(1.5, size / 12)

  let arc: ReactNode = null
  if (side !== 0) {
    const ar = r * 0.68
    // 画面座標では角度が増える向きが時計回り
    const startDeg = side > 0 ? -160 : -20
    const endDeg = side > 0 ? 110 : -290
    const s = polar(ar, startDeg)
    const e = polar(ar, endDeg)
    const sweep = side > 0 ? 1 : 0
    const tRad = (endDeg * Math.PI) / 180
    const tx = side > 0 ? -Math.sin(tRad) : Math.sin(tRad)
    const ty = side > 0 ? Math.cos(tRad) : -Math.cos(tRad)
    const hl = r * 0.34
    const tip = { x: e.x + tx * hl * 0.6, y: e.y + ty * hl * 0.6 }
    const base = { x: e.x - tx * hl * 0.4, y: e.y - ty * hl * 0.4 }
    const nx = -ty
    const ny = tx
    arc = (
      <>
        <path d={`M${s.x},${s.y} A${ar},${ar} 0 1 ${sweep} ${e.x},${e.y}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        <path
          d={`M${tip.x},${tip.y} L${base.x + nx * hl * 0.55},${base.y + ny * hl * 0.55} L${base.x - nx * hl * 0.55},${base.y - ny * hl * 0.55} Z`}
          fill={color}
        />
      </>
    )
  }

  let vertical: ReactNode = null
  if (vert !== 0) {
    const len = side !== 0 ? r * 0.55 : r * 0.9
    const y1 = -vert * len * 0.5
    const y2 = vert * len * 0.5
    const h = Math.max(2.5, len * 0.35)
    vertical = (
      <>
        <line x1={0} y1={y1} x2={0} y2={y2 - vert * h * 0.5} stroke={color} strokeWidth={sw} strokeLinecap="round" />
        <path d={`M0,${y2} L${-h * 0.6},${y2 - vert * h} L${h * 0.6},${y2 - vert * h} Z`} fill={color} />
      </>
    )
  }

  const body = (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={r} fill="#fff" stroke={color} strokeWidth={sw * 0.8} />
      {arc}
      {vertical}
      {side === 0 && vert === 0 && <circle r={r * 0.2} fill={color} />}
    </g>
  )
  if (asGroup) return body
  return (
    <svg width={size} height={size} viewBox={`${-r - 1} ${-r - 1} ${size + 2} ${size + 2}`} aria-label={SPIN_LABEL[spin]}>
      {body}
    </svg>
  )
}

interface PickerProps {
  value?: Spin
  onChange: (s: Spin | undefined) => void
  leftHanded?: boolean
}

export function SpinPicker({ value, onChange, leftHanded }: PickerProps) {
  return (
    <div className="spin-picker" role="group" aria-label="回転">
      <span className="spin-axis top">上回転</span>
      <span className="spin-axis left">逆横</span>
      <span className="spin-axis right">順横</span>
      <span className="spin-axis bottom">下回転</span>
      <div className="spin-grid">
        {SPIN_GRID.flat().map((s) => (
          <button
            key={s}
            type="button"
            className={`spin-cell ${value === s ? 'on' : ''}`}
            onClick={() => onChange(value === s ? undefined : s)}
            aria-pressed={value === s}
          >
            <SpinGlyph spin={s} size={28} color={value === s ? '#1d5fa8' : '#4a5568'} leftHanded={leftHanded} />
            <span>{SPIN_LABEL[s]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
