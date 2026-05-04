import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTags } from '../../api/endpoints'
import { displayTag, tagRoute, tagVariant, type TagVariant } from '../../lib/tagParser'
import { useAuth } from '../../state/auth'
import brandIcon from '../../assets/white-petals-icon.png'
import Icon from './Icon'
import styles from './SideNavBar.module.css'

type NavEntry = {
  to: string
  label: string
  icon: string
}

const JOURNAL_LINKS: NavEntry[] = [
  { to: '/today', label: 'Today', icon: 'calendar_today' },
  { to: '/yesterday', label: 'Yesterday', icon: 'history' },
  { to: '/last-7', label: 'Last 7 days', icon: 'date_range' },
  { to: '/all', label: 'All entries', icon: 'inbox' },
]

const INSIGHT_LINKS: NavEntry[] = [
  { to: '/stats', label: 'Stats', icon: 'query_stats' },
]

const FOOTER_LINKS: NavEntry[] = [
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/download', label: 'Get desktop app', icon: 'download' },
]

const VARIANT_DOT: Record<TagVariant, string> = {
  blue: 'var(--ij-tag-blue)',
  amber: 'var(--ij-tag-amber)',
  emerald: 'var(--ij-tag-emerald)',
  purple: 'var(--ij-tag-purple)',
  rose: 'var(--ij-tag-rose)',
  cyan: 'var(--ij-tag-cyan)',
  slate: 'var(--ij-tag-slate)',
}

/**
 * Left-hand navigation rail rendered into the AppShell.
 * Reads tag counts from the API so the "Tags" section mirrors the feed.
 */
export default function SideNavBar() {
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })
  const tags = tagsQuery.data?.tags ?? []
  const { user, logout } = useAuth()

  return (
    <aside className={styles.rail}>
      <div className={styles.brandBlock}>
        <img
          src={brandIcon}
          alt=""
          className={styles.brandIcon}
          width={32}
          height={32}
        />
        <div className={styles.brandText}>
          <h2 className={styles.brand}>
            <span className={styles.brandWord}>Interstitial</span>
            <span className={styles.brandWord}>Journal</span>
          </h2>
        </div>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.group}>
          {JOURNAL_LINKS.map((link) => (
            <NavItem key={link.to} {...link} />
          ))}
        </ul>

        <div className={styles.groupTitle}>Insights</div>
        <ul className={styles.group}>
          {INSIGHT_LINKS.map((link) => (
            <NavItem key={link.to} {...link} />
          ))}
        </ul>

        <div className={styles.groupTitle}>
          Tags{tags.length ? <span className={styles.groupCount}>{tags.length}</span> : null}
        </div>
        <ul className={styles.tagList}>
          {tags.length === 0 && !tagsQuery.isLoading && (
            <li className={styles.empty}>No tags yet</li>
          )}
          {tags.slice(0, 40).map((t) => {
            const variant = tagVariant(t.tag)
            return (
              <li key={t.tag}>
                <NavLink
                  to={tagRoute(t.tag)}
                  className={({ isActive }) =>
                    `${styles.tagLink} ${isActive ? styles.tagLinkActive : ''}`
                  }
                >
                  <span
                    className={styles.tagDot}
                    style={{ background: VARIANT_DOT[variant] }}
                  />
                  <span className={styles.tagLabel}>{displayTag(t.tag)}</span>
                  <span className={styles.tagCount}>{t.count}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <ul className={styles.footer}>
        {FOOTER_LINKS.map((link) => (
          <NavItem key={link.to} {...link} />
        ))}
      </ul>

      {user && (
        <div className={styles.account}>
          <div className={styles.accountText}>
            <span className={styles.accountName}>
              {user.display_name || user.email.split('@')[0]}
            </span>
            <span className={styles.accountEmail}>{user.email}</span>
          </div>
          <button
            type="button"
            className={styles.logout}
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  )
}

function NavItem({ to, label, icon }: NavEntry) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
      >
        <Icon name={icon} size={20} />
        <span>{label}</span>
      </NavLink>
    </li>
  )
}
