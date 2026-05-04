/*
 * Icon — thin wrapper over Material Symbols Outlined so every partial
 * renders glyphs the exact same way. The font is loaded in index.html.
 */
import type { CSSProperties } from 'react'

type Props = {
  name: string
  size?: number
  filled?: boolean
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  className?: string
  style?: CSSProperties
  'aria-hidden'?: boolean
}

export default function Icon({
  name,
  size = 20,
  filled = false,
  weight = 300,
  className,
  style,
  'aria-hidden': ariaHidden = true,
}: Props) {
  return (
    <span
      aria-hidden={ariaHidden}
      className={`material-symbols-outlined ${className ?? ''}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  )
}
