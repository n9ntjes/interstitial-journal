import { Link, useLocation } from 'react-router-dom'
import styles from './NotFoundView.module.css'

const QUICK_LINKS: { to: string; label: string; hint: string }[] = [
  { to: '/today', label: 'Today', hint: 'Your recent punches' },
  { to: '/stats', label: 'Stats', hint: 'Heatmap, trends, streaks, tags' },
  { to: '/settings', label: 'Settings', hint: 'Overlay, hotkeys, export' },
]

export default function NotFoundView() {
  const location = useLocation()
  return (
    <section className={styles.view}>
      <div className={styles.card}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>This page never punched in.</h1>
        <p className={styles.sub}>
          There's nothing at{' '}
          <code className={styles.path}>{location.pathname}</code>. It may have
          moved, or the link you followed was mistyped.
        </p>

        <div className={styles.actions}>
          <Link to="/today" className={styles.primary}>
            Back to Today
          </Link>
          <Link to="/all" className={styles.secondary}>
            See all entries
          </Link>
        </div>

        <div className={styles.divider}>
          <span>or jump to</span>
        </div>

        <ul className={styles.quick}>
          {QUICK_LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={styles.quickLink}>
                <span className={styles.quickLabel}>{l.label}</span>
                <span className={styles.quickHint}>{l.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
