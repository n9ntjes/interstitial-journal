export type EntrySource = 'web' | 'tauri' | 'api'

/** Screenshot or attachment; `url` is API-relative (join with `API_BASE`). */
export type EntryImage = {
  id: number
  mime: string
  width: number | null
  height: number | null
  url: string
}

/** Response body from `images.php` after a successful upload. */
export type UploadImageResult = EntryImage

export type Entry = {
  id: number
  created_at: string
  content: string
  source: EntrySource
  tags: string[]
  images: EntryImage[]
}

export type TagCount = { tag: string; count: number }

export type StatsScopeWindow = 'week' | 'month' | 'year'

export type StatsScopeBucket = {
  volume: number
  activeDays: number
  dailyAverage: number
  peakHourLabel: string | null
}

export type Stats = {
  total: number
  today: number
  thisWeek: number
  dailyAverage: number
  currentStreak: number
  longestStreak: number
  mostActiveHour: string | null
  /** Punch counts by local hour 0–23 in the requested timezone. */
  punchesByHour: number[]
  distinctTags: number
  topTags: TagCount[]
  /** Aggregates for quick-stats scope switcher (today / rolling week / month-to-date). */
  scopes?: Record<StatsScopeWindow, StatsScopeBucket>
}

export type HeatmapDay = { dayKey: string; count: number }

export type Health = {
  service: string
  version: string
  timestamp: string
  php: string
  db: { ok: boolean; latency_ms: number; error: string | null }
}

export type AuthUser = {
  id: number
  email: string
  display_name: string | null
  created_at: string
}

export type DeviceToken = {
  token_prefix: string
  label: string | null
  platform: string | null
  created_at: string
  last_seen: string | null
  revoked_at: string | null
}
