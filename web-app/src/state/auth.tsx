import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  whoami,
} from '../api/endpoints'
import { ApiError, onUnauthorized } from '../api/client'
import type { AuthUser } from '../api/types'

type AuthStatus = 'loading' | 'anonymous' | 'authed'

type AuthContextShape = {
  status: AuthStatus
  user: AuthUser | null
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (input: {
    email: string
    password: string
    display_name?: string
  }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextShape | null>(null)

/**
 * Session-cookie-backed auth context. On mount we hit /session.php (always
 * a 200 — returns `user: null` when anonymous), which sets the initial
 * status. Queries cached in react-query get wiped on logout so the next
 * login doesn't briefly show the previous user's data.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const qc = useQueryClient()

  const refresh = useCallback(async () => {
    try {
      const { user: u } = await whoami()
      setUser(u)
      setStatus(u ? 'authed' : 'anonymous')
    } catch (err) {
      // Treat 401 / network errors as logged-out rather than wedging the UI.
      if (err instanceof ApiError && err.status === 401) {
        setUser(null)
        setStatus('anonymous')
        return
      }
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Any authed endpoint that comes back 401 means the session evaporated
  // (manual revoke, TTL, server restart). Drop to anonymous so <RequireAuth>
  // bounces the user to /login.
  useEffect(() => {
    return onUnauthorized(() => {
      qc.clear()
      setUser(null)
      setStatus('anonymous')
    })
  }, [qc])

  const login: AuthContextShape['login'] = useCallback(
    async (email, password) => {
      const { user: u } = await apiLogin(email, password)
      qc.clear()
      setUser(u)
      setStatus('authed')
    },
    [qc],
  )

  const signup: AuthContextShape['signup'] = useCallback(
    async (input) => {
      const { user: u } = await apiSignup(input)
      qc.clear()
      setUser(u)
      setStatus('authed')
    },
    [qc],
  )

  const logout: AuthContextShape['logout'] = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      qc.clear()
      setUser(null)
      setStatus('anonymous')
    }
  }, [qc])

  const value = useMemo<AuthContextShape>(
    () => ({ status, user, refresh, login, signup, logout }),
    [status, user, refresh, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextShape {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
