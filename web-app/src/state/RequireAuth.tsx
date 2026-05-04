import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth'

/**
 * Route guard. While the initial whoami is in flight we render a blank
 * screen (prevents flashing the login form to already-authed users on
 * cold reloads), then either let the children through or redirect to
 * /login carrying the intended path for post-login bounce-back.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <div style={{ height: '100vh' }} />
  }

  if (status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  return <>{children}</>
}
