import { invoke } from '@tauri-apps/api/core'
import type { DeviceAuthDto, Entry, EntryImage } from './types'

const DEV_API_BASE: string | undefined = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE as string | undefined)
  : undefined

export const DEVICE_AUTH_CHANGED_EVENT = 'device-auth:changed'

type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } }

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()
let cachedAuth: Promise<DeviceAuthDto | null> | null = null

export function onUnauthorized(fn: UnauthorizedListener): () => void {
  unauthorizedListeners.add(fn)
  return () => {
    unauthorizedListeners.delete(fn)
  }
}

function emitUnauthorized(): void {
  for (const fn of unauthorizedListeners) {
    try {
      fn()
    } catch {
      /* listener errors should not interrupt the request path */
    }
  }
}

export function clearCachedDeviceAuth(): void {
  cachedAuth = null
}

export function loadDeviceAuth(): Promise<DeviceAuthDto | null> {
  cachedAuth ??= invoke<DeviceAuthDto | null>('get_device_auth').catch(() => null)
  return cachedAuth
}

async function clearDeviceAuth(): Promise<void> {
  clearCachedDeviceAuth()
  await invoke('clear_device_auth').catch(() => undefined)
  emitUnauthorized()
}

function baseUrl(auth: DeviceAuthDto): string {
  return (DEV_API_BASE ?? auth.api_base).replace(/\/+$/, '')
}

async function requireDeviceAuth(): Promise<DeviceAuthDto> {
  const auth = await loadDeviceAuth()
  if (!auth) {
    throw new ApiError(
      'unpaired',
      'Open the web-app and re-download to sign in.',
      0,
    )
  }
  return auth
}

async function parseEnvelope<T>(
  res: Response,
  path: string,
): Promise<Envelope<T>> {
  const raw = await res.text()
  try {
    const body = raw ? (JSON.parse(raw) as Envelope<T>) : null
    if (!body) {
      throw new ApiError('empty_response', `No body from ${path}`, res.status)
    }
    return body
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('invalid_response', `Bad JSON from ${path}`, res.status)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = await requireDeviceAuth()
  const res = await fetch(`${baseUrl(auth)}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${auth.token}`,
      'X-Client': 'tauri',
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init.headers,
    },
  })

  if (res.status === 204) return undefined as T

  const body = await parseEnvelope<T>(res, path)
  if (body.ok) return body.data

  if (res.status === 401) {
    await clearDeviceAuth()
  }

  throw new ApiError(body.error.code, body.error.message, res.status, body.error.details)
}

export async function uploadImage(
  blob: Blob,
  filename = 'screenshot.png',
): Promise<EntryImage> {
  const form = new FormData()
  form.append('file', blob, filename)
  return request<EntryImage>('/images.php', {
    method: 'POST',
    body: form,
  })
}

export function createEntry(input: {
  content: string
  created_at?: string
  imageIds?: number[]
}): Promise<{ entry: Entry }> {
  return request<{ entry: Entry }>('/entries.php', {
    method: 'POST',
    body: JSON.stringify({
      content: input.content,
      source: 'tauri',
      created_at: input.created_at ?? new Date().toISOString(),
      imageIds: input.imageIds ?? [],
    }),
  })
}

export async function listRecentEntries(limit = 5): Promise<Entry[]> {
  const data = await request<{ entries: Entry[] }>(
    `/entries.php?limit=${encodeURIComponent(limit)}`,
  )
  return data.entries
}
