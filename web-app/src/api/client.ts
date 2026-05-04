const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

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

/**
 * Subscribe to 401 responses. The AuthProvider uses this to drop back to
 * 'anonymous' and let <RequireAuth> redirect to /login. Whoami uses a flag
 * to opt out — a logged-out user hitting session.php is the expected path,
 * not a session expiry.
 */
type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

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
      /* listener errors should not interrupt the caller */
    }
  }
}

type RequestOptions = RequestInit & { suppressUnauthorized?: boolean }

export async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const { suppressUnauthorized, ...fetchInit } = init ?? {}
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...fetchInit,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Client': 'web',
      ...(fetchInit.body ? { 'Content-Type': 'application/json' } : {}),
      ...fetchInit.headers,
    },
  })

  if (res.status === 204) return undefined as T

  const raw = await res.text()
  let body: Envelope<T> | null = null
  try {
    body = raw ? (JSON.parse(raw) as Envelope<T>) : null
  } catch {
    throw new ApiError('invalid_response', `Bad JSON from ${path}`, res.status)
  }

  if (!body) throw new ApiError('empty_response', `No body from ${path}`, res.status)

  if (body.ok) return body.data

  if (res.status === 401 && !suppressUnauthorized) {
    emitUnauthorized()
  }

  throw new ApiError(body.error.code, body.error.message, res.status, body.error.details)
}

export { API_BASE }
