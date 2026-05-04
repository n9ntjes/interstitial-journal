import { Link } from 'react-router-dom'
import { displayTag, normalizeTag, tagRoute, tagVariant } from '../lib/tagParser'
import styles from './TagChip.module.css'

type Props = {
  tag: string
  asLink?: boolean
  size?: 'sm' | 'md'
}

/**
 * Pill-shaped tag chip. Used in entry cards, the detail panel, and the
 * composer preview. Always renders the `#`-prefixed display form.
 */
export default function TagChip({ tag, asLink = true, size = 'sm' }: Props) {
  const normalized = normalizeTag(tag)
  const label = displayTag(normalized)
  const variant = tagVariant(normalized)
  const className = `${styles.chip} ${styles[variant]} ${styles[size]}`
  if (!normalized) return null
  if (!asLink) return <span className={className}>{label}</span>
  return (
    <Link to={tagRoute(normalized)} className={className}>
      {label}
    </Link>
  )
}
