import { useMemo, useState } from 'react'
import { pairDesktop } from '../api/endpoints'
import { ApiError } from '../api/client'
import styles from './DownloadView.module.css'

const GITHUB_RELEASES = 'https://github.com/n9ntjes/interstitial-journal/releases/latest'

type Platform = 'macos' | 'windows' | 'linux' | 'unknown'

type Build = {
  platformId: string
  label: string
  hint: string
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos'
  if (ua.includes('windows')) return 'windows'
  if (ua.includes('linux')) return 'linux'
  return 'unknown'
}

const PLATFORM_IDS: Record<Platform, string | null> = {
  macos:   'macos-arm64',
  windows: 'windows-x64',
  linux:   'linux-x86_64',
  unknown: null,
}

const BUILDS: Record<Platform, Build[]> = {
  macos: [
    { platformId: 'macos-arm64', label: 'macOS (Apple silicon)', hint: 'macOS 12+, M-series' },
    { platformId: 'macos-x64',   label: 'macOS (Intel)',         hint: 'macOS 12+, Intel' },
  ],
  windows: [
    { platformId: 'windows-x64', label: 'Windows',               hint: 'Windows 10+' },
  ],
  linux: [
    { platformId: 'linux-x86_64', label: 'Linux AppImage',       hint: 'glibc ≥ 2.31' },
    { platformId: 'linux-amd64',  label: 'Linux .deb',           hint: 'Debian / Ubuntu' },
  ],
  unknown: [],
}

type ConnectState = 'idle' | 'loading' | 'launched' | 'error'

export default function DownloadView() {
  const platform = useMemo(detectPlatform, [])
  const platformId = PLATFORM_IDS[platform]
  const primaryBuilds = BUILDS[platform]
  const otherBuilds = (['macos', 'windows', 'linux'] as Platform[])
    .filter((p) => p !== platform)
    .flatMap((p) => BUILDS[p])

  const [connectState, setConnectState] = useState<ConnectState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleConnect() {
    setConnectState('loading')
    setErrorMsg(null)
    try {
      const { pair_url } = await pairDesktop(platformId)
      window.location.href = pair_url
      // Give the OS a moment to hand off to the app, then show the "switch to app" message.
      setTimeout(() => setConnectState('launched'), 800)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err)
      setErrorMsg(msg)
      setConnectState('error')
    }
  }

  return (
    <section className={styles.view}>
      <header className={styles.header}>
        <h1 className={styles.title}>Get the desktop app</h1>
        <p className={styles.sub}>
          Install once from GitHub, then connect your account in one click — no password screen in the app.
        </p>
      </header>

      {/* Step 1 — Install */}
      <div className={styles.step}>
        <div className={styles.stepNum}>1</div>
        <div className={styles.stepBody}>
          <h2 className={styles.stepTitle}>Install the app</h2>
          <p className={styles.stepSub}>Download the installer for your platform from GitHub Releases.</p>

          {primaryBuilds.length > 0 && (
            <div className={styles.buttons}>
              {primaryBuilds.map((b) => (
                <a
                  key={b.platformId}
                  className={styles.download}
                  href={GITHUB_RELEASES}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.downloadLabel}>{b.label}</span>
                  <span className={styles.downloadHint}>{b.hint} · GitHub Releases</span>
                </a>
              ))}
            </div>
          )}

          {otherBuilds.length > 0 && (
            <>
              <p className={styles.otherTitle}>Other platforms</p>
              <div className={styles.others}>
                {otherBuilds.map((b) => (
                  <a
                    key={b.platformId}
                    className={styles.other}
                    href={GITHUB_RELEASES}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.otherLabel}>{b.label}</span>
                    <span className={styles.otherHint}>{b.hint}</span>
                  </a>
                ))}
              </div>
            </>
          )}

          {platform === 'unknown' && (
            <a
              className={styles.download}
              href={GITHUB_RELEASES}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.downloadLabel}>All platforms</span>
              <span className={styles.downloadHint}>GitHub Releases</span>
            </a>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Step 2 — Connect */}
      <div className={styles.step}>
        <div className={styles.stepNum}>2</div>
        <div className={styles.stepBody}>
          <h2 className={styles.stepTitle}>Connect your account</h2>
          <p className={styles.stepSub}>
            Once the app is installed and running, click below. The app opens and signs in automatically.
          </p>

          {connectState === 'launched' ? (
            <div className={styles.launched}>
              <span className={styles.launchedIcon}>✓</span>
              Switch to Interstitial Journal to finish.
              <button
                type="button"
                className={styles.retryBtn}
                onClick={() => setConnectState('idle')}
              >
                Try again
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.connect}
              onClick={() => void handleConnect()}
              disabled={connectState === 'loading'}
            >
              {connectState === 'loading' ? 'Opening…' : 'Connect this computer'}
            </button>
          )}

          {connectState === 'error' && errorMsg && (
            <p className={styles.connectError}>{errorMsg}</p>
          )}
        </div>
      </div>

      <p className={styles.note}>
        Each computer gets its own token. You can revoke any of them from Settings at any time.
      </p>
    </section>
  )
}
