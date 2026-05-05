import { useEffect, useMemo, useState } from 'react'
import { pairDesktop } from '../api/endpoints'
import { ApiError } from '../api/client'
import styles from './DownloadView.module.css'

const REPO = 'n9ntjes/interstitial-journal'
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`

// ── Types ──────────────────────────────────────────────────────────────────

type Platform = 'macos' | 'windows' | 'linux' | 'unknown'

type Build = {
  platformId: string
  label: string
  hint: string
  /** Matches a release asset filename to this build. */
  match: (name: string) => boolean
}

type ReleaseAsset = { name: string; browser_download_url: string; size: number }
type Release = { tag_name: string; assets: ReleaseAsset[] }
type ReleaseState =
  | { status: 'loading' }
  | { status: 'ok'; release: Release }
  | { status: 'error' }

type ConnectState = 'idle' | 'loading' | 'launched' | 'error'

// ── Platform detection ─────────────────────────────────────────────────────

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

// Asset filename patterns produced by tauri-action, e.g.:
//   Interstitial Journal_0.1.0_aarch64.dmg
//   Interstitial Journal_0.1.0_x64.dmg
//   Interstitial Journal_0.1.0_x64-setup.exe
//   Interstitial Journal_0.1.0_amd64.AppImage
//   interstitial-journal_0.1.0_amd64.deb
const BUILDS: Record<Platform, Build[]> = {
  macos: [
    {
      platformId: 'macos-arm64',
      label: 'macOS (Apple silicon)',
      hint:  'macOS 12+ · M-series',
      match: (n) => /aarch64\.dmg$/i.test(n),
    },
    {
      platformId: 'macos-x64',
      label: 'macOS (Intel)',
      hint:  'macOS 12+ · Intel',
      match: (n) => /x64\.dmg$/i.test(n),
    },
  ],
  windows: [
    {
      platformId: 'windows-x64',
      label: 'Windows',
      hint:  'Windows 10+',
      match: (n) => /\.(msi|exe)$/i.test(n),
    },
  ],
  linux: [
    {
      platformId: 'linux-x86_64',
      label: 'Linux AppImage',
      hint:  'glibc ≥ 2.31',
      match: (n) => /\.AppImage$/i.test(n),
    },
    {
      platformId: 'linux-amd64',
      label: 'Linux .deb',
      hint:  'Debian / Ubuntu',
      match: (n) => /\.deb$/i.test(n),
    },
  ],
  unknown: [],
}

function findAssetUrl(assets: ReleaseAsset[], build: Build): string | null {
  return assets.find((a) => build.match(a.name))?.browser_download_url ?? null
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DownloadView() {
  const platform   = useMemo(detectPlatform, [])
  const platformId = PLATFORM_IDS[platform]
  const primary    = BUILDS[platform]
  const others     = (['macos', 'windows', 'linux'] as Platform[])
    .filter((p) => p !== platform)
    .flatMap((p) => BUILDS[p])

  const [releaseState, setReleaseState] = useState<ReleaseState>({ status: 'loading' })
  const [connectState, setConnectState] = useState<ConnectState>('idle')
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Release) => {
        if (!cancelled) setReleaseState({ status: 'ok', release: data })
      })
      .catch(() => {
        if (!cancelled) setReleaseState({ status: 'error' })
      })
    return () => { cancelled = true }
  }, [])

  async function handleConnect() {
    setConnectState('loading')
    setErrorMsg(null)
    try {
      const { pair_url } = await pairDesktop(platformId)
      window.location.href = pair_url
      setTimeout(() => setConnectState('launched'), 800)
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : String(err))
      setConnectState('error')
    }
  }

  const assets = releaseState.status === 'ok' ? releaseState.release.assets : []
  const version = releaseState.status === 'ok' ? releaseState.release.tag_name : null

  return (
    <section className={styles.view}>
      <header className={styles.header}>
        <h1 className={styles.title}>Get the desktop app</h1>
        <p className={styles.sub}>
          Install the app, then connect your account in one click — no password screen in the app.
          {version && <span className={styles.version}>{version}</span>}
        </p>
      </header>

      {/* Step 1 — Install */}
      <div className={styles.step}>
        <div className={styles.stepNum}>1</div>
        <div className={styles.stepBody}>
          <h2 className={styles.stepTitle}>Download &amp; install</h2>

          {releaseState.status === 'loading' && (
            <p className={styles.stepSub}>Fetching latest release…</p>
          )}

          {releaseState.status === 'error' && (
            <p className={styles.stepSub}>
              Couldn't load release info.{' '}
              <a href={RELEASES_PAGE} target="_blank" rel="noopener noreferrer">
                Open GitHub Releases
              </a>
            </p>
          )}

          {releaseState.status === 'ok' && (
            <>
              {primary.length > 0 && (
                <div className={styles.buttons}>
                  {primary.map((b) => {
                    const url = findAssetUrl(assets, b)
                    const asset = assets.find((a) => b.match(a.name))
                    return (
                      <a
                        key={b.platformId}
                        className={`${styles.download} ${!url ? styles.downloadUnavailable : ''}`}
                        href={url ?? RELEASES_PAGE}
                        target={url ? '_self' : '_blank'}
                        rel="noopener noreferrer"
                        aria-disabled={!url}
                      >
                        <span className={styles.downloadLabel}>{b.label}</span>
                        <span className={styles.downloadHint}>
                          {url
                            ? `${b.hint} · ${asset ? formatBytes(asset.size) : ''}`
                            : `${b.hint} · not in this release`}
                        </span>
                      </a>
                    )
                  })}
                </div>
              )}

              {others.length > 0 && (
                <>
                  <p className={styles.otherTitle}>Other platforms</p>
                  <div className={styles.others}>
                    {others.map((b) => {
                      const url = findAssetUrl(assets, b)
                      return (
                        <a
                          key={b.platformId}
                          className={styles.other}
                          href={url ?? RELEASES_PAGE}
                          target={url ? '_self' : '_blank'}
                          rel="noopener noreferrer"
                        >
                          <span className={styles.otherLabel}>{b.label}</span>
                          <span className={styles.otherHint}>{b.hint}</span>
                        </a>
                      )
                    })}
                  </div>
                </>
              )}

              {platform === 'unknown' && (
                <a className={styles.download} href={RELEASES_PAGE} target="_blank" rel="noopener noreferrer">
                  <span className={styles.downloadLabel}>All platforms</span>
                  <span className={styles.downloadHint}>Pick your build</span>
                </a>
              )}
            </>
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
            Once the app is open, click below — it signs in automatically.
          </p>

          {connectState === 'launched' ? (
            <div className={styles.launched}>
              <span className={styles.launchedIcon}>✓</span>
              Switch to Interstitial Journal to finish.
              <button type="button" className={styles.retryBtn} onClick={() => setConnectState('idle')}>
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
        Each computer gets its own token. Revoke any of them from Settings at any time.
      </p>
    </section>
  )
}
