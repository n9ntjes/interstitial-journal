import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import partial from '../styles/partials.module.css'
import {
  DateGroupHeader,
  EntryCard,
  EntryDetailPanel,
  QuickPunchPill,
  SearchBar,
} from '../components/partials'
import { getEntries, type EntryFilters } from '../api/endpoints'
import type { Entry } from '../api/types'
import {
  dayKey,
  endOfZonedDayUtcIso,
  formatDayLabel,
  shiftDays,
  startOfZonedDayUtcIso,
  userTz,
} from '../lib/dates'
import { displayTag } from '../lib/tagParser'
import { useUiStore } from '../state/store'
import styles from './BrowserView.module.css'

export type FilterKey = 'today' | 'yesterday' | 'last7' | 'all' | 'tag'

type Props = { filterKey: FilterKey }

function buildFilters(kind: FilterKey, tag?: string): EntryFilters {
  const tz = userTz()
  const now = new Date()
  switch (kind) {
    case 'today':
      return {
        from: startOfZonedDayUtcIso(now, tz),
        to: endOfZonedDayUtcIso(now, tz),
        limit: 200,
      }
    case 'yesterday': {
      const y = shiftDays(now, -1)
      return {
        from: startOfZonedDayUtcIso(y, tz),
        to: endOfZonedDayUtcIso(y, tz),
        limit: 200,
      }
    }
    case 'last7':
      return {
        from: startOfZonedDayUtcIso(shiftDays(now, -6), tz),
        to: endOfZonedDayUtcIso(now, tz),
        limit: 200,
      }
    case 'tag':
      return { tag, limit: 200 }
    case 'all':
    default:
      return { limit: 200 }
  }
}

function viewTitle(kind: FilterKey, tag?: string, q?: string): string {
  if (q) return `Search: "${q}"`
  switch (kind) {
    case 'today':
      return 'Today'
    case 'yesterday':
      return 'Yesterday'
    case 'last7':
      return 'Last 7 days'
    case 'tag':
      return displayTag(tag ?? '') || 'Tag'
    case 'all':
      return 'All entries'
  }
}

/**
 * Journal browser — the "Final Browser View" composition from Stitch.
 * The AppShell wraps this view and also receives the detail panel via
 * the `rightPanel` slot that we return on the route level.
 */
export default function BrowserView({ filterKey }: Props) {
  const { tag } = useParams<{ tag?: string }>()
  const [q, setQ] = useState('')
  const selectedId = useUiStore((s) => s.selectedEntryId)
  const setSelected = useUiStore((s) => s.setSelectedEntryId)

  const filters = useMemo(() => {
    const base = buildFilters(filterKey, tag)
    return q.trim() ? { ...base, q: q.trim() } : base
  }, [filterKey, tag, q])

  const query = useQuery({
    queryKey: ['entries', filters],
    queryFn: () => getEntries(filters),
    placeholderData: (prev) => prev,
  })

  const entries = useMemo(() => query.data?.entries ?? [], [query.data?.entries])
  const grouped = useMemo(() => groupByDay(entries), [entries])
  const title = viewTitle(filterKey, tag, q.trim())

  return (
    <div className={styles.view}>
      <div className={`${partial.scrollbarHide} ${styles.scroll}`}>
        <div className={styles.column}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>{title}</h1>
              <span className={`${partial.labelCapsWidest} ${styles.count}`}>
                {query.isLoading
                  ? 'Loading…'
                  : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
              </span>
            </div>
          </header>

          <SearchBar value={q} onChange={setQ} />

          <div className={styles.feed}>
            <div className={`${partial.timeLine} ${styles.rail}`} aria-hidden />
            {query.error && (
              <div className={styles.error}>
                Couldn’t load entries: {(query.error as Error).message}
              </div>
            )}
            {!query.isLoading && entries.length === 0 && !query.error && (
              <div className={styles.empty}>
                <h3>No entries yet</h3>
                <p>Punches you create from this pill or the desktop app will appear here.</p>
              </div>
            )}
            {grouped.map(([day, items]) => (
              <section key={day} className={styles.group}>
                <DateGroupHeader label={formatDayLabel(day)} count={items.length} />
                <div className={styles.items}>
                  {items.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      selected={entry.id === selectedId}
                      onSelect={() =>
                        setSelected(entry.id === selectedId ? null : entry.id)
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
            <div className={styles.spacer} />
          </div>
        </div>
      </div>

      <QuickPunchPill />
    </div>
  )
}

/**
 * Right-column partial for this view. Exported separately so `App` can
 * plug it into `AppShell`'s `rightPanel` slot without coupling routing
 * to the BrowserView internals.
 */
export function BrowserDetailPanel() {
  const selectedId = useUiStore((s) => s.selectedEntryId)
  const setSelected = useUiStore((s) => s.setSelectedEntryId)
  return (
    <EntryDetailPanel
      entryId={selectedId}
      onClose={() => setSelected(null)}
      onDeleted={(id) => {
        if (id === selectedId) setSelected(null)
      }}
    />
  )
}

function groupByDay(entries: Entry[]): [string, Entry[]][] {
  const tz = userTz()
  const map = new Map<string, Entry[]>()
  for (const e of entries) {
    const key = dayKey(new Date(e.created_at), tz)
    const arr = map.get(key) ?? []
    arr.push(e)
    map.set(key, arr)
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
}
