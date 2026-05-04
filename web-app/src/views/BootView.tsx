import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, ApiError, request } from '../api/client'
import styles from './BootView.module.css'

type BootToken = { token: string; expires_at: string }

type Phase =
  | { status: 'requesting' }
  | { status: 'launching'; token: BootToken; url: string }
  | { status: 'fallback'; token: BootToken; url: string }
  | { status: 'error'; code: string; message: string }

function buildBootUrl(token: string): string {
  const api = encodeURIComponent(API_BASE)
  return `ij://boot?token=${encodeURIComponent(token)}&api=${api}`
}

export default function BootView() {
  const [phase, setPhase] = useState<Phase>({ status: 'requesting' })
  const fallbackTimer = useRef<number | undefined>(undefined)

  const requestToken = useCallback(async () => {
    setPhase({ status: 'requesting' })
    try {
      const data = await request<BootToken>('/session.php?boot=1', {
        method: 'POST',
      })
      const url = buildBootUrl(data.token)
      setPhase({ status: 'launching', token: data, url })
      window.location.href = url
      window.clearTimeout(fallbackTimer.current)
      fallbackTimer.current = window.setTimeout(() => {
        setPhase({ status: 'fallback', token: data, url })
      }, 3000)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'network_error'
      const message =
        err instanceof Error
          ? err.message
          : 'Could not reach the API. Check your connection and try again.'
      setPhase({ status: 'error', code, message })
    }
  }, [])

  useEffect(() => {
    void requestToken()
    return () => window.clearTimeout(fallbackTimer.current)
  }, [requestToken])

  return (
    <section className={styles.view}>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden>
          <Pulse active={phase.status !== 'error'} />
        </div>

        {phase.status === 'requesting' && (
          <>
            <h1 className={styles.title}>Preparing handoff…</h1>
            <p className={styles.sub}>
              Minting a one-shot token and asking your OS to launch the desktop app.
            </p>
            <div className={styles.steps}>
              <Step active>Request token</Step>
              <Step>Hand off to OS</Step>
              <Step>App goes resident</Step>
            </div>
          </>
        )}

        {phase.status === 'launching' && (
          <>
            <h1 className={styles.title}>Launching Interstitial Journal…</h1>
            <p className={styles.sub}>
              Your browser should be asking permission to open the desktop app.
              Accept the prompt and the pill will go resident in your tray.
            </p>
            <div className={styles.steps}>
              <Step done>Request token</Step>
              <Step active>Hand off to OS</Step>
              <Step>App goes resident</Step>
            </div>
            <div className={styles.actions}>
              <a className={styles.primary} href={phase.url}>
                Retry launch
              </a>
              <code className={styles.code}>{redact(phase.url)}</code>
            </div>
          </>
        )}

        {phase.status === 'fallback' && (
          <>
            <h1 className={styles.title}>Nothing happened?</h1>
            <p className={styles.sub}>
              We asked the OS to open <code className={styles.inline}>ij://boot</code>
              {' '}but didn't hear back. Either the desktop app isn't installed yet, or
              your browser blocked the prompt. You can retry the handoff or grab the
              installer first.
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href={phase.url}>
                Try launching again
              </a>
              <Link to="/download" className={styles.secondary}>
                Download the desktop app
              </Link>
            </div>
            <p className={styles.tip}>
              The token expires{' '}
              <code className={styles.code}>{formatExpires(phase.token.expires_at)}</code>
              {' '}— after that, reload this page to mint a fresh one.
            </p>
          </>
        )}

        {phase.status === 'error' && (
          <>
            <h1 className={styles.title}>Couldn't mint a token</h1>
            <p className={styles.sub}>
              {phase.code === 'unauthorized'
                ? 'You need to be logged in before the desktop app can be booted. Once auth lands, come back to this page.'
                : phase.message}
            </p>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={() => void requestToken()}>
                Try again
              </button>
              <Link to="/download" className={styles.secondary}>
                Download the desktop app
              </Link>
            </div>
            <p className={styles.tip}>
              Error code: <code className={styles.code}>{phase.code}</code>
            </p>
          </>
        )}
      </div>

      <aside className={styles.explain}>
        <h2 className={styles.explainTitle}>How booting works</h2>
        <ol className={styles.explainList}>
          <li>
            Web-app asks the API for a <strong>one-shot token</strong> bound to
            <code className={styles.inline}> source=tauri</code>, TTL 60 s, single
            use.
          </li>
          <li>
            Browser navigates to{' '}
            <code className={styles.inline}>ij://boot?token=…&amp;api=…</code>,
            which the installed desktop app is registered to handle.
          </li>
          <li>
            Desktop app exchanges the one-shot token for a long-lived session
            token, stores it in the OS keychain, registers hotkeys, and parks
            itself in the tray.
          </li>
          <li>
            From then on, you can close this tab. The desktop app runs
            independently.
          </li>
        </ol>
      </aside>
    </section>
  )
}

function Step({
  children,
  active,
  done,
}: {
  children: React.ReactNode
  active?: boolean
  done?: boolean
}) {
  const cls = [styles.step]
  if (active) cls.push(styles.stepActive)
  if (done) cls.push(styles.stepDone)
  return (
    <div className={cls.join(' ')}>
      <span className={styles.stepDot} aria-hidden />
      <span>{children}</span>
    </div>
  )
}

function Pulse({ active }: { active: boolean }) {
  return (
    <span className={`${styles.pulse} ${active ? styles.pulseActive : styles.pulseIdle}`}>
      <span className={styles.pulseDot} />
    </span>
  )
}

function redact(url: string): string {
  return url.replace(/token=[^&]+/, 'token=••••••')
}

function formatExpires(iso: string): string {
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diff = Math.max(0, Math.round((d.getTime() - now) / 1000))
    if (diff <= 0) return 'now'
    if (diff < 60) return `in ${diff}s`
    return `at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
  } catch {
    return iso
  }
}
