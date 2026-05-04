import partial from '../../styles/partials.module.css'
import styles from './DateGroupHeader.module.css'

type Props = {
  label: string
  count?: number
}

/**
 * Sticky group label in the feed (Tuesday, Oct 24 · 3).
 * Rendered with the label-caps type style from Honest Glass.
 */
export default function DateGroupHeader({ label, count }: Props) {
  return (
    <div className={styles.wrap}>
      <span className={`${partial.labelCapsWidest} ${styles.label}`}>{label}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </div>
  )
}
