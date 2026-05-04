import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import partial from '../styles/partials.module.css'
import { ApiError } from '../api/client'
import { useAuth } from '../state/auth'
import brandIcon from '../assets/white-petals-icon.png'
import styles from './LoginView.module.css'

type Mode = 'login' | 'signup'

type LocationState = { from?: string } | null

export default function LoginView() {
  const auth = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // If the user lands on /login while already authed (e.g. opened the tab
  // twice), bounce straight to where they were heading.
  if (auth.status === 'authed') {
    const from = (location.state as LocationState)?.from ?? '/today'
    return <Navigate to={from} replace />
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await auth.login(email.trim(), password)
      } else {
        await auth.signup({
          email: email.trim(),
          password,
          display_name: displayName.trim() || undefined,
        })
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <section
        className={`${partial.honestGlass} ${partial.innerGlow} ${styles.card}`}
      >
        <header className={styles.header}>
          <img
            src={brandIcon}
            alt=""
            className={styles.brandIcon}
            width={40}
            height={40}
          />
          <h1 className={styles.title}>
            {mode === 'login' ? 'Welcome back' : 'Create your journal'}
          </h1>
          <p className={styles.sub}>
            {mode === 'login'
              ? 'Sign in to see your punches, stats, and devices.'
              : 'Your entries are private to your account from the first punch onwards.'}
          </p>
        </header>

        <form className={styles.form} onSubmit={submit}>
          {mode === 'signup' && (
            <label className={styles.field}>
              <span className={`${partial.labelCapsWidest} ${styles.label}`}>
                Display name (optional)
              </span>
              <input
                className={styles.input}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                maxLength={120}
              />
            </label>
          )}

          <label className={styles.field}>
            <span className={`${partial.labelCapsWidest} ${styles.label}`}>
              Email
            </span>
            <input
              className={styles.input}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete={mode === 'login' ? 'email' : 'email'}
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className={`${partial.labelCapsWidest} ${styles.label}`}>
              Password
            </span>
            <input
              className={styles.input}
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
            />
            {mode === 'signup' && (
              <span className={styles.hint}>At least 8 characters.</span>
            )}
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy
              ? 'Working…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>

          <button
            className={styles.toggle}
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
            }}
          >
            {mode === 'login'
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </button>
        </form>
      </section>
    </div>
  )
}
