import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import partial from '../../styles/partials.module.css'
import Icon from './Icon'
import styles from './IconButton.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: string
  filled?: boolean
  label: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'primary'
  children?: ReactNode
}

/**
 * Circular icon-only button used in the top app bar, detail panel header,
 * entry actions, etc. The `label` is always required so screen readers
 * have something to announce.
 */
const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, filled, label, size = 'md', variant = 'ghost', className, children, ...rest },
  ref,
) {
  const sizePx = size === 'sm' ? 16 : size === 'lg' ? 24 : 20
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`${partial.iconButton} ${styles.root} ${styles[variant]} ${styles[size]} ${className ?? ''}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={sizePx} filled={filled} /> : children}
    </button>
  )
})

export default IconButton
