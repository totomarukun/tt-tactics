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
}

/**
 * ボールの上に回転方向の矢印を描く。
 * 上向き=上回転、下向き=下回転、左=順横、右=逆横。ナックルは点。
 */
export function SpinGlyph({ spin, size = 22, color = '#1a202c', cx = 0, cy = 0, asGroup }: GlyphProps) {
  const r = size / 2
  const v = SPIN_VECTOR[spin]
  const len = Math.hypot(v.x, v.y)
  const ux = len ? v.x / len : 0
  const uy = len ? v.y / len : 0
  const a = r * 0.55
  const x1 = -ux * a
  const y1 = -uy * a
  const x2 = ux * a
  const y2 = uy * a
  // 矢じり
  const hx = -ux * r * 0.35
  const hy = -uy * r * 0.35
  const px = -uy
  const py = ux
  const head =
    len === 0
      ? null
      : `M${x2},${y2} L${x2 + hx + px * r * 0.28},${y2 + hy + py * r * 0.28} L${x2 + hx - px * r * 0.28},${y2 + hy - py * r * 0.28} Z`

  const body = (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={r} fill="#fff" stroke={color} strokeWidth={1.5} />
      {len === 0 ? (
        <circle r={r * 0.22} fill={color} />
      ) : (
        <>
          <line x1={x1} y1={y1} x2={x2 + hx * 0.6} y2={y2 + hy * 0.6} stroke={color} strokeWidth={2} strokeLinecap="round" />
          <path d={head!} fill={color} />
        </>
      )}
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
}

export function SpinPicker({ value, onChange }: PickerProps) {
  return (
    <div className="spin-picker" role="group" aria-label="回転">
      <span className="spin-axis top">上回転</span>
      <span className="spin-axis left">順横</span>
      <span className="spin-axis right">逆横</span>
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
            <SpinGlyph spin={s} size={26} color={value === s ? '#1d5fa8' : '#4a5568'} />
            <span>{SPIN_LABEL[s]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
