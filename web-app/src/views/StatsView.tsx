import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Icon from '../components/partials/Icon'
import { getHeatmap, getStats } from '../api/endpoints'
import type { HeatmapDay, Stats, StatsScopeBucket, StatsScopeWindow } from '../api/types'
import { dayKey, userTz, zonedWallTimeToUtcIso } from '../lib/dates'
import { displayTag, tagRoute } from '../lib/tagParser'
import styles from './StatsView.module.css'

const HEATMAP_WEEKS = 53
const HEATMAP_DAYS = 7

type HeatMode = 'monthly' | 'yearly'

function bucket(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count < 3) return 1
  if (count < 8) return 2
  if (count < 16) return 3
  return 4
}

function sumRange(days: HeatmapDay[], start: number, end: number): number {
  let s = 0
  for (let i = start; i < end; i++) s += days[i]?.count ?? 0
  return s
}

function lastFourWeekVolumes(days: HeatmapDay[]): number[] {
  const n = days.length
  if (n === 0) return [0, 0, 0, 0]
  const vols: number[] = []
  for (let weekIdx = 0; weekIdx < 4; weekIdx++) {
    const start = Math.max(0, n - (4 - weekIdx) * 7)
    const end = Math.max(0, n - (3 - weekIdx) * 7)
    vols.push(sumRange(days, start, end))
  }
  return vols
}

function formatHour12(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}

function peakLabelToClock(label: string | null): { time: string; period: string } | null {
  if (!label) return null
  const start = label.split(/[–-]/)[0]?.trim() ?? ''
  const h = parseInt(start, 10)
  if (Number.isNaN(h) || h < 0 || h > 23) return { time: label, period: '' }
  if (h === 0) return { time: '12:00', period: 'AM' }
  if (h < 12) return { time: `${h}:00`, period: 'AM' }
  if (h === 12) return { time: '12:00', period: 'PM' }
  return { time: `${h - 12}:00`, period: 'PM' }
}

function zonedWeekdayMon0(ymd: string, tz: string): number {
  const iso = zonedWallTimeToUtcIso(ymd, 12, 0, 0, tz)
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
  }).format(new Date(iso))
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }
  return map[short] ?? 0
}

function daysInZonedMonth(ym: string, tz: string): number {
  const [y, mo] = ym.split('-').map(Number)
  const nm = mo === 12 ? 1 : mo + 1
  const ny = mo === 12 ? y + 1 : y
  const s = `${y}-${String(mo).padStart(2, '0')}-01`
  const e = `${ny}-${String(nm).padStart(2, '0')}-01`
  const ms = Date.parse(zonedWallTimeToUtcIso(s, 0, 0, 0, tz))
  const me = Date.parse(zonedWallTimeToUtcIso(e, 0, 0, 0, tz))
  return Math.round((me - ms) / 86400000)
}

/** Month / month+day ticks along the yearly heatmap (week columns), Stitch-style. */
function buildYearHeatAxisLabels(days: HeatmapDay[], tz: string): string[] {
  if (days.length === 0) return []
  const labels: string[] = []
  let prevYm: string | null = null
  const nWeeks = Math.ceil(days.length / HEATMAP_DAYS)
  for (let w = 0; w < nWeeks; w++) {
    const d0 = days[w * HEATMAP_DAYS]
    if (!d0) break
    const ym = d0.dayKey.slice(0, 7)
    if (ym === prevYm) continue
    prevYm = ym
    const [, mo, da] = d0.dayKey.split('-').map(Number)
    const noonMs = Date.parse(zonedWallTimeToUtcIso(d0.dayKey, 12, 0, 0, tz))
    const d = new Date(noonMs)
    const shortM = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short' }).format(d)
    if (da !== 1) {
      labels.push(`${shortM} ${da}`)
    } else if (mo === 1) {
      const yy = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: '2-digit' }).format(d)
      labels.push(`${shortM} ${yy}`)
    } else {
      labels.push(shortM)
    }
  }
  return labels
}

function weekOverWeekDeltaPct(days: HeatmapDay[]): { pct: number; label: string } | null {
  const n = days.length
  if (n < 14) return null
  const prev = sumRange(days, n - 14, n - 7)
  const curr = sumRange(days, n - 7, n)
  if (prev === 0) return curr > 0 ? { pct: 100, label: '+100%' } : null
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (pct === 0) return { pct: 0, label: '0%' }
  return { pct, label: `${pct > 0 ? '+' : ''}${pct}%` }
}

function insightCopy(
  s: {
    total: number
    currentStreak: number
    longestStreak: number
    thisWeek: number
    dailyAverage: number
    mostActiveHour: string | null
  },
  tz: string,
): string {
  const chunks: string[] = []
  if (s.currentStreak >= 3) {
    chunks.push(
      `You're on a ${s.currentStreak}-day streak${s.currentStreak === s.longestStreak ? ' — matching your best run.' : '.'}`,
    )
  } else if (s.total > 0) {
    chunks.push(`You've logged ${s.total.toLocaleString()} punch${s.total === 1 ? '' : 'es'} so far.`)
  }
  if (s.mostActiveHour) {
    chunks.push(`The busiest hour block is ${s.mostActiveHour} (${tz}).`)
  }
  if (s.thisWeek > 0 && s.dailyAverage > 0) {
    const pace = s.thisWeek / (7 * s.dailyAverage)
    if (pace > 1.12) chunks.push('This week is pacing above your usual daily average.')
    else if (pace < 0.88) chunks.push('This week is a bit lighter than your typical rhythm.')
  }
  return chunks.join(' ') || 'Add punches across a few days to unlock richer insights here.'
}

type StatsPayload = NonNullable<Awaited<ReturnType<typeof getStats>>>

function scopesOrFallback(s: Stats): Record<StatsScopeWindow, StatsScopeBucket> {
  const sc = s.scopes
  if (sc?.week && sc?.month && sc?.year) {
    return sc
  }
  return {
    week: {
      volume: s.thisWeek,
      activeDays: 0,
      dailyAverage: 0,
      peakHourLabel: s.mostActiveHour,
    },
    month: {
      volume: s.total,
      activeDays: 0,
      dailyAverage: s.dailyAverage,
      peakHourLabel: s.mostActiveHour,
    },
    year: {
      volume: s.total,
      activeDays: 0,
      dailyAverage: s.dailyAverage,
      peakHourLabel: s.mostActiveHour,
    },
  }
}

function scopePeriodHint(scope: StatsScopeWindow): string {
  switch (scope) {
    case 'week':
      return 'Last 7 days'
    case 'month':
      return 'Month to date'
    case 'year':
      return 'Year to date'
  }
}

function buildSummaryClipboard(s: StatsPayload, tz: string): string {
  const lines = [
    'Interstitial Journal — stats summary',
    `Timezone: ${tz}`,
    `Total punches: ${s.total}`,
    `Today: ${s.today} · This week: ${s.thisWeek}`,
    `Daily average (active days): ${s.dailyAverage}`,
    `Streak: ${s.currentStreak} (longest ${s.longestStreak})`,
    `Most active hour: ${s.mostActiveHour ?? '—'}`,
    `Distinct tags: ${s.distinctTags}`,
  ]
  if (s.topTags.length) {
    lines.push('Top tags:')
    for (const t of s.topTags) lines.push(`  /${t.tag}: ${t.count}`)
  }
  return lines.join('\n')
}

export default function StatsView() {
  const tz = userTz()
  const [scope, setScope] = useState<StatsScopeWindow>('month')
  const [heatMode, setHeatMode] = useState<HeatMode>('monthly')
  const [heatHover, setHeatHover] = useState<{ day: string; count: number } | null>(null)
  const [copyDone, setCopyDone] = useState(false)

  const { to, from } = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - (HEATMAP_WEEKS * HEATMAP_DAYS - 1))
    return {
      from: start.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    }
  }, [])

  const statsQuery = useQuery({
    queryKey: ['stats', tz],
    queryFn: () => getStats(tz),
  })

  const heatmapQuery = useQuery({
    queryKey: ['heatmap', { from, to, tz }],
    queryFn: () => getHeatmap({ from, to, tz }),
  })

  const loading = statsQuery.isLoading || heatmapQuery.isLoading
  const err =
    (statsQuery.error as Error | undefined)?.message ??
    (heatmapQuery.error as Error | undefined)?.message

  const ymCurrent = useMemo(() => dayKey(new Date(), tz).slice(0, 7), [tz])

  const monthGrid = useMemo(() => {
    const dim = daysInZonedMonth(ymCurrent, tz)
    const pad = zonedWeekdayMon0(`${ymCurrent}-01`, tz)
    const byDay: Record<number, number> = {}
    for (const d of heatmapQuery.data?.days ?? []) {
      if (!d.dayKey.startsWith(ymCurrent)) continue
      const dom = parseInt(d.dayKey.slice(8, 10), 10)
      if (!Number.isNaN(dom)) byDay[dom] = d.count
    }
    return { dim, pad, byDay }
  }, [heatmapQuery.data?.days, ymCurrent, tz])

  const monthTitle = useMemo(() => {
    const [y, m] = ymCurrent.split('-').map(Number)
    const mid = zonedWallTimeToUtcIso(`${y}-${String(m).padStart(2, '0')}-15`, 12, 0, 0, tz)
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      month: 'long',
      year: 'numeric',
    }).format(new Date(mid))
  }, [ymCurrent, tz])

  if (loading) {
    return (
      <section className={styles.view}>
        <header className={styles.pageHeader}>
          <span className={styles.pageKicker}>Analytics Dashboard</span>
          <h1 className={styles.pageTitle}>Flow Performance</h1>
        </header>
        <div className={styles.loading}>Loading…</div>
      </section>
    )
  }

  const statsData = statsQuery.data
  const days = heatmapQuery.data?.days ?? []

  if (!statsData) {
    return (
      <section className={styles.view}>
        <header className={styles.pageHeader}>
          <span className={styles.pageKicker}>Analytics Dashboard</span>
          <h1 className={styles.pageTitle}>Flow Performance</h1>
        </header>
        <div className={styles.error}>Couldn't load: {err ?? 'unknown'}</div>
      </section>
    )
  }

  const hourly =
    Array.isArray(statsData.punchesByHour) && statsData.punchesByHour.length === 24
      ? statsData.punchesByHour
      : Array.from({ length: 24 }, () => 0)
  const maxHour = Math.max(1, ...hourly)
  const peakHourIdx = hourly.indexOf(Math.max(...hourly))
  const weekVolumes = lastFourWeekVolumes(days)
  const maxWeekVol = Math.max(1, ...weekVolumes)
  const heatTotal = days.reduce((acc, d) => acc + d.count, 0)
  const yearAxisLabels = buildYearHeatAxisLabels(days, tz)
  const maxTag = Math.max(1, ...statsData.topTags.map((t) => t.count))
  const scopeBuckets = scopesOrFallback(statsData)
  const sc = scopeBuckets[scope]
  const wow = weekOverWeekDeltaPct(days)
  const activeClock = peakLabelToClock(sc.peakHourLabel)

  const insight = insightCopy(
    {
      total: statsData.total,
      currentStreak: statsData.currentStreak,
      longestStreak: statsData.longestStreak,
      thisWeek: statsData.thisWeek,
      dailyAverage: statsData.dailyAverage,
      mostActiveHour: statsData.mostActiveHour,
    },
    tz,
  )

  let linePathD = 'M0,80 L100,80'
  if (!weekVolumes.every((v) => v === 0)) {
    const pts = weekVolumes.map((v, i) => {
      const x = (i / 3) * 100
      const y = 80 - (v / maxWeekVol) * 55
      return `${x},${y}`
    })
    linePathD = `M${pts.join(' L')}`
  }

  async function copySummary() {
    const snap = statsQuery.data
    if (!snap) return
    try {
      await navigator.clipboard.writeText(buildSummaryClipboard(snap, tz))
      setCopyDone(true)
      window.setTimeout(() => setCopyDone(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const totalBadge =
    scope === 'week' && wow && wow.pct !== 0 ? (
      <span
        className={wow.pct > 0 ? styles.heroBadgePositive : styles.heroBadgeOutline}
      >
        {wow.label}
      </span>
    ) : null

  return (
    <section className={styles.view}>
      <div className={styles.stack}>
        <header className={styles.pageHeader}>
          <span className={styles.pageKicker}>Analytics Dashboard</span>
          <h1 className={styles.pageTitle}>Flow Performance</h1>
        </header>

        <div className={styles.topGrid}>
          <div className={styles.topColMain}>
            <div className={styles.quickStatsRow}>
              <h3 className={styles.kickerHeading}>Quick Stats</h3>
              <div className={styles.scopeTrack} role="tablist" aria-label="Stats time range">
                {(
                  [
                    ['week', 'Week'],
                    ['month', 'Month'],
                    ['year', 'Year'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={scope === key}
                    className={`${styles.scopeSeg} ${scope === key ? styles.scopeSegActive : ''}`}
                    onClick={() => setScope(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.heroGrid2x2}>
              <div className={`${styles.honestGlass} ${styles.glassInnerGlow} ${styles.heroCard}`}>
                <div className={styles.heroCardTop}>
                  <span className={styles.heroCardIcon}>
                    <Icon name="edit_note" size={24} weight={400} />
                  </span>
                  {totalBadge}
                </div>
                <div className={styles.heroValueBlock}>
                  <div className={styles.heroValueXL}>{sc.volume.toLocaleString()}</div>
                  <div className={styles.heroCaption}>Total Punches</div>
                </div>
              </div>

              <div className={`${styles.honestGlass} ${styles.glassInnerGlow} ${styles.heroCard}`}>
                <div className={styles.heroCardTop}>
                  <span className={styles.heroCardIcon}>
                    <Icon name="avg_time" size={24} weight={400} />
                  </span>
                </div>
                <div className={styles.heroValueBlock}>
                  <div className={styles.heroValueXL}>{sc.dailyAverage}</div>
                  <div className={styles.heroCaption}>Daily Average</div>
                </div>
              </div>

              <div className={`${styles.honestGlass} ${styles.glassInnerGlow} ${styles.heroCard}`}>
                <div className={styles.heroCardTop}>
                  <span className={styles.heroCardIcon}>
                    <Icon name="local_fire_department" size={24} weight={400} filled />
                  </span>
                  <span className={styles.heroBadgeOutline}>
                    Best: {statsData.longestStreak}
                  </span>
                </div>
                <div className={styles.heroValueBlock}>
                  <div className={styles.heroValueXL}>
                    {statsData.currentStreak}{' '}
                    <span className={styles.heroValueSuffix}>days</span>
                  </div>
                  <div className={styles.heroCaption}>Current Streak</div>
                </div>
              </div>

              <div className={`${styles.honestGlass} ${styles.glassInnerGlow} ${styles.heroCard}`}>
                <div className={styles.heroCardTop}>
                  <span className={styles.heroCardIcon}>
                    <Icon name="schedule" size={24} weight={400} />
                  </span>
                </div>
                <div className={styles.heroValueBlock}>
                  {activeClock ? (
                    <div className={styles.heroValueXL}>
                      {activeClock.time}{' '}
                      <span className={styles.heroValueSuffix}>{activeClock.period}</span>
                    </div>
                  ) : (
                    <div className={styles.heroValueXL}>—</div>
                  )}
                  <div className={styles.heroCaption}>Active Hour</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.topColAside}>
            <h3 className={styles.kickerHeading}>Performance Insight</h3>
            <aside className={`${styles.honestGlass} ${styles.glassInnerGlow} ${styles.insightPanel}`}>
              <div className={styles.insightOrb} aria-hidden />
              <div className={styles.insightInner}>
                <div className={styles.insightIconCircle}>
                  <Icon name="auto_awesome" size={24} weight={400} />
                </div>
                <h4 className={styles.insightHeadline}>Deep Work Efficiency</h4>
                <p className={styles.insightProse}>{insight}</p>
              </div>
              <button type="button" className={styles.exportBtn} onClick={copySummary}>
                {copyDone ? 'Copied' : 'Export Analysis'}
              </button>
            </aside>
          </div>
        </div>

        <section
          id="entry-density"
          className={`${styles.honestGlass} ${styles.glassInnerGlow} ${styles.densitySection}`}
        >
          <div className={styles.densityHead}>
            <h2 className={styles.densityTitle}>Entry Density</h2>
            <div className={styles.densityTools}>
              <div className={styles.densityToggle} role="tablist" aria-label="Heatmap range">
                <button
                  type="button"
                  role="tab"
                  aria-selected={heatMode === 'monthly'}
                  className={`${styles.densityToggleBtn} ${heatMode === 'monthly' ? styles.densityToggleActive : ''}`}
                  onClick={() => setHeatMode('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={heatMode === 'yearly'}
                  className={`${styles.densityToggleBtn} ${heatMode === 'yearly' ? styles.densityToggleActive : ''}`}
                  onClick={() => setHeatMode('yearly')}
                >
                  Yearly
                </button>
              </div>
              <div className={styles.legendStitch}>
                <span>Less</span>
                <div className={styles.legendDots}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={styles.legendDot} data-step={i} />
                  ))}
                </div>
                <span>More</span>
              </div>
            </div>
          </div>

          {heatMode === 'monthly' ? (
            <div className={styles.monthlyWrap}>
              <div className={styles.monthlyInner}>
                <div className={styles.weekdayRow}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d} className={styles.weekdayCell}>
                      {d}
                    </div>
                  ))}
                </div>
                <div className={styles.monthCellGrid}>
                  {Array.from({ length: monthGrid.pad }).map((_, i) => (
                    <div key={`pad-${i}`} className={styles.monthCellPad} />
                  ))}
                  {Array.from({ length: monthGrid.dim }, (_, i) => i + 1).map((dom) => {
                    const c = monthGrid.byDay[dom] ?? 0
                    const lvl = bucket(c)
                    return (
                      <div
                        key={dom}
                        className={styles.monthCell}
                        data-level={lvl}
                        title={`${ymCurrent}-${String(dom).padStart(2, '0')}: ${c}`}
                      >
                        <span className={styles.monthCellNum}>{dom}</span>
                      </div>
                    )
                  })}
                </div>
                <div className={styles.monthNav}>
                  <span className={styles.monthNavCurrent}>{monthTitle}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.yearlyWrap} id="yearly-grid">
              <div className={`${styles.yearScroll} ${styles.customScrollbar}`}>
                <div className={styles.yearMatrix}>
                  {days.map((d) => (
                    <div
                      key={d.dayKey}
                      className={styles.cellYear}
                      data-level={bucket(d.count)}
                      title={`${d.dayKey}: ${d.count}`}
                      onMouseEnter={() => setHeatHover({ day: d.dayKey, count: d.count })}
                      onMouseLeave={() => setHeatHover(null)}
                    />
                  ))}
                  {days.length === 0 &&
                    Array.from({ length: HEATMAP_WEEKS * HEATMAP_DAYS }, (_, i) => (
                      <div key={`sk-${i}`} className={styles.cellYear} data-level={0} />
                    ))}
                </div>
                {heatHover && (
                  <div className={styles.tooltip}>
                    <strong>{heatHover.day}</strong>
                    <span>
                      {heatHover.count} punch{heatHover.count === 1 ? '' : 'es'}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.yearAxis}>
                {yearAxisLabels.map((text, i) => (
                  <span key={`${text}-${i}`}>{text}</span>
                ))}
              </div>
              <p className={styles.yearlyFoot}>
                {days.length
                  ? `${heatTotal.toLocaleString()} punches · last ${HEATMAP_WEEKS} weeks`
                  : '—'}
              </p>
            </div>
          )}
        </section>

        <section className={styles.trendsSection}>
          <div className={styles.trendsHeader}>
            <span className={styles.pageKicker}>Visual Analytics</span>
            <h2 className={styles.trendsTitle}>Activity Trends</h2>
          </div>
          <div className={styles.trendsGrid}>
            <div className={`${styles.honestGlass} ${styles.glassInnerGlow} ${styles.trendCard}`}>
              <div className={styles.trendCardHead}>
                <h3 className={styles.trendCardLabel}>Entry Volume Trend</h3>
                <span className={styles.trendCardMeta}>
                  {scopePeriodHint(scope).toUpperCase()}
                </span>
              </div>
              <div className={styles.lineChart}>
                <svg
                  className={styles.lineChartSvg}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="statsVolGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="white" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${linePathD} L100,100 L0,100 Z`}
                    fill="url(#statsVolGrad)"
                    opacity={0.05}
                  />
                  <path
                    d={linePathD}
                    fill="none"
                    stroke="white"
                    strokeOpacity={0.6}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className={styles.lineChartAxis}>
                  <span>W1</span>
                  <span>W2</span>
                  <span>W3</span>
                  <span>W4</span>
                </div>
              </div>
            </div>

            <div className={`${styles.honestGlass} ${styles.glassInnerGlow} ${styles.trendCard}`}>
              <div className={styles.trendCardHead}>
                <h3 className={styles.trendCardLabel}>Punches by Hour</h3>
                <span className={styles.trendCardMeta}>Daily Average</span>
              </div>
              <div className={styles.hourChartStitch}>
                {hourly.map((c, h) => {
                  const isPeakBand = h >= peakHourIdx - 1 && h <= peakHourIdx + 1 && c > 0
                  return (
                    <div key={h} className={styles.hourCol}>
                      <div
                        className={`${styles.hourBarStitch} ${isPeakBand ? styles.hourBarPeak : ''}`}
                        style={{ height: `${(c / maxHour) * 100}%` }}
                        title={`${formatHour12(h)}: ${c}`}
                      />
                    </div>
                  )
                })}
              </div>
              <div className={styles.hourTicksStitch}>
                <span>12 AM</span>
                <span>12 PM</span>
                <span>11 PM</span>
              </div>
            </div>

            <div
              className={`${styles.honestGlass} ${styles.glassInnerGlow} ${styles.trendCard} ${styles.trendCardWide}`}
            >
              <div className={styles.categoryHead}>
                <div>
                  <h3 className={styles.categoryTitle}>Category Breakdown</h3>
                  <p className={styles.categorySub}>
                    Distribution of entries across your primary journaling tags
                  </p>
                </div>
                <Icon name="more_horiz" size={22} weight={400} className={styles.categoryMore} />
              </div>
              {statsData.topTags.length === 0 ? (
                <p className={styles.muted}>
                  No tags yet — use <code>/tag</code> in a punch.
                </p>
              ) : (
                <div className={styles.tagGridStitch}>
                  {statsData.topTags.map((t, idx) => (
                    <div key={t.tag} className={styles.tagBlock}>
                      <div className={styles.tagBlockHead}>
                        <Link to={tagRoute(t.tag)} className={styles.tagLinkStitch}>
                          #{displayTag(t.tag)}
                        </Link>
                        <span className={styles.tagEntries}>
                          {t.count} {t.count === 1 ? 'ENTRY' : 'ENTRIES'}
                        </span>
                      </div>
                      <div className={styles.tagBarTrack}>
                        <div
                          className={`${styles.tagBarFill} ${idx === 0 ? styles.tagBarFillLead : ''}`}
                          style={{ width: `${(t.count / maxTag) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
