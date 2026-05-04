import { API_BASE, ApiError, request } from './client'
import type {
  AuthUser,
  DeviceToken,
  Entry,
  HeatmapDay,
  Health,
  Stats,
  TagCount,
  UploadImageResult,
} from './types'

export function whoami() {
  return request<{ user: AuthUser | null; via?: string }>('/session.php')
}

export function login(email: string, password: string) {
  return request<{ user: AuthUser; expires_at: string }>('/session.php', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function signup(input: {
  email: string
  password: string
  display_name?: string
}) {
  return request<{ user: AuthUser; expires_at: string }>('/signup.php', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function logout() {
  return request<void>('/session.php', { method: 'DELETE' })
}

export function listDeviceTokens() {
  return request<{ device_tokens: DeviceToken[] }>('/device_tokens.php')
}

export function revokeDeviceToken(prefix: string) {
  return request<void>(`/device_tokens.php?prefix=${encodeURIComponent(prefix)}`, {
    method: 'DELETE',
  })
}

/** Mint a device token and return the ij://pair deep-link URL. */
export function pairDesktop(platform: string | null): Promise<{ pair_url: string }> {
  const qs = platform ? `?platform=${encodeURIComponent(platform)}` : ''
  return request<{ pair_url: string }>(`/download.php${qs}`)
}

export type EntryFilters = {
  from?: string
  to?: string
  tag?: string
  q?: string
  limit?: number
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue
    p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function getHealth() {
  return request<Health>('/health.php')
}

export function getEntries(filters: EntryFilters = {}) {
  return request<{ entries: Entry[] }>(`/entries.php${qs(filters)}`)
}

export function createEntry(input: {
  content: string
  created_at?: string
  source?: 'web' | 'tauri' | 'api'
  imageIds?: number[]
}) {
  return request<{ entry: Entry }>(`/entries.php`, {
    method: 'POST',
    body: JSON.stringify({
      created_at: input.created_at ?? new Date().toISOString(),
      source: input.source ?? 'web',
      content: input.content,
      imageIds: input.imageIds ?? [],
    }),
  })
}

/**
 * Multipart upload (PNG) — returns a row id to pass as `imageIds` when creating an entry.
 */
export async function uploadImage(file: File): Promise<UploadImageResult> {
  const form = new FormData()
  form.append('file', file, file.name || 'upload.png')
  const res = await fetch(`${API_BASE}/images.php`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Client': 'web',
    },
  })
  const raw = await res.text()
  type Envelope =
    | { ok: true; data: UploadImageResult }
    | { ok: false; error: { code: string; message: string; details?: unknown } }
  let body: Envelope | null = null
  try {
    body = raw ? (JSON.parse(raw) as Envelope) : null
  } catch {
    throw new ApiError('invalid_response', `Bad JSON from /images.php`, res.status)
  }
  if (!body) {
    throw new ApiError('empty_response', 'No body from /images.php', res.status)
  }
  if (!body.ok) {
    throw new ApiError(body.error.code, body.error.message, res.status, body.error.details)
  }
  return body.data
}

export function getEntry(id: number) {
  return request<{ entry: Entry }>(`/entries_show.php?id=${id}`)
}

export function updateEntry(id: number, content: string) {
  return request<{ entry: Entry }>(`/entries_update.php?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

export function deleteEntry(id: number) {
  return request<void>(`/entries_delete.php?id=${id}`, { method: 'DELETE' })
}

export function getTags() {
  return request<{ tags: TagCount[] }>(`/tags.php`)
}

export function getStats(tz: string) {
  return request<Stats>(`/stats.php${qs({ tz })}`)
}

export function getHeatmap(params: { from?: string; to?: string; tz: string }) {
  return request<{ days: HeatmapDay[] }>(`/heatmap.php${qs(params)}`)
}
