import type { ChangeEvent } from 'react'
import partial from '../../styles/partials.module.css'
import Icon from './Icon'
import styles from './SearchBar.module.css'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  name?: string
}

/**
 * Rounded search pill used above the feed (and anywhere else we need a
 * faint translucent search affordance). Leading icon + placeholder colour
 * pulled from the Stitch Final Browser View.
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search entries or #tags…',
  autoFocus = false,
  name = 'search',
}: Props) {
  return (
    <label className={`${partial.ghostPill} ${styles.bar}`}>
      <Icon name="search" size={18} className={styles.icon} />
      <input
        type="search"
        name={name}
        value={value}
        autoFocus={autoFocus}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}
