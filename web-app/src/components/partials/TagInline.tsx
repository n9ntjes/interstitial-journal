import { Link } from 'react-router-dom'
import { displayTag, normalizeTag, tagRoute, tagVariant } from '../../lib/tagParser'
import styles from './TagInline.module.css'

type Props = {
  tag: string
  /** When true, renders as a `<Link>` to the tag route (default). */
  asLink?: boolean
}

/**
 * Inline tag highlight (what the mock shows as `<span class="text-blue-400">#tag</span>`).
 * Always renders with `#` prefix regardless of input form, enforcing the
 * `/tag` → `#tag` display normalization rule from SPEC §7.1.
 */
export default function TagInline({ tag, asLink = true }: Props) {
  const normalized = normalizeTag(tag)
  const variant = tagVariant(normalized)
  const label = displayTag(normalized)
  if (!normalized) return <span>{tag}</span>
  const className = `${styles.tag} ${styles[variant]}`
  if (!asLink) return <span className={className}>{label}</span>
  return (
    <Link to={tagRoute(normalized)} className={className}>
      {label}
    </Link>
  )
}
