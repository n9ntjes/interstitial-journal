export function userTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function dayKey(d: Date, tz: string = userTz()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(d)
}

/**
 * UTC instant (ISO Z) for a wall-clock time in `tz` on calendar date `ymd` (YYYY-MM-DD).
 * Used so API string compares match entries stored as UTC ISO from the clients.
 */
export function zonedWallTimeToUtcIso(
  ymd: string,
  hour: number,
  minute: number,
  second: number,
  tz: string,
): string {
  const pad2 = (n: number) => String(Math.trunc(n)).padStart(2, '0')
  const want = `${ymd}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}`

  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const zonedLabel = (utcMs: number): string => {
    const parts = dtf.formatToParts(new Date(utcMs))
    const o: Record<string, string> = {}
    for (const p of parts) {
      if (p.type !== 'literal') o[p.type] = p.value
    }
    return `${o.year}-${o.month}-${o.day}T${o.hour}:${o.minute}:${o.second}`
  }

  const noonUtcMs = Date.parse(`${ymd}T12:00:00Z`)
  let lo = noonUtcMs - 2 * 86400000
  let hi = noonUtcMs + 2 * 86400000

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (zonedLabel(mid) < want) lo = mid + 1
    else hi = mid
  }

  return new Date(lo).toISOString()
}

function zonedNextDayStartUtcIso(d: Date, tz: string): string {
  const ymd = dayKey(d, tz)
  const noonUtc = Date.parse(zonedWallTimeToUtcIso(ymd, 12, 0, 0, tz))
  let t = noonUtc + 12 * 3600000
  for (let i = 0; i < 200 && dayKey(new Date(t), tz) === ymd; i++) {
    t += 15 * 60000
  }
  const nextYmd = dayKey(new Date(t), tz)
  return zonedWallTimeToUtcIso(nextYmd, 0, 0, 0, tz)
}

/** First instant of the user's local calendar day containing `d`, as UTC ISO. */
export function startOfZonedDayUtcIso(d: Date, tz: string = userTz()): string {
  return zonedWallTimeToUtcIso(dayKey(d, tz), 0, 0, 0, tz)
}

/** Last instant (ms resolution) of the user's local calendar day containing `d`, as UTC ISO. */
export function endOfZonedDayUtcIso(d: Date, tz: string = userTz()): string {
  const nextStart = zonedNextDayStartUtcIso(d, tz)
  return new Date(Date.parse(nextStart) - 1).toISOString()
}

export function startOfDayISO(d: Date, tz: string = userTz()): string {
  return startOfZonedDayUtcIso(d, tz)
}

export function endOfDayISO(d: Date, tz: string = userTz()): string {
  return endOfZonedDayUtcIso(d, tz)
}

export function shiftDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function formatDayLabel(day: string): string {
  const today = dayKey(new Date())
  const yesterday = dayKey(shiftDays(new Date(), -1))
  if (day === today) return 'Today'
  if (day === yesterday) return 'Yesterday'
  const d = new Date(`${day}T12:00:00Z`)
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.round((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
