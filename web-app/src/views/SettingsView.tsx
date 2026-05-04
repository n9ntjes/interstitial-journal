import { useEffect, useState } from 'react'
import { API_BASE } from '../api/client'
import { listDeviceTokens, revokeDeviceToken } from '../api/endpoints'
import type { DeviceToken } from '../api/types'
import styles from './SettingsView.module.css'

type SettingsBlob = {
  overlay: {
    showOnAllScreens: boolean
    alignment: 'leading' | 'center' | 'trailing'
    fontSize: number
    opacity: number
    theme: 'mono' | 'warm' | 'cool' | 'midnight' | 'sunset' | 'forest' | 'custom'
  }
  hotkeys: {
    quickPunch: string
    openJournal: string
    screenshot: string
  }
  export: { defaultFormat: 'markdown' | 'json' }
}

const DEFAULT: SettingsBlob = {
  overlay: {
    showOnAllScreens: true,
    alignment: 'leading',
    fontSize: 13,
    opacity: 1.0,
    theme: 'mono',
  },
  hotkeys: {
    quickPunch: 'Alt+Space',
    openJournal: 'Alt+Shift+Space',
    screenshot: 'Cmd+Shift+S',
  },
  export: { defaultFormat: 'markdown' },
}

const STORAGE_KEY = 'ij-settings-v0'

function load(): SettingsBlob {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<SettingsBlob>) }
  } catch {
    /* ignore */
  }
  return DEFAULT
}

export default function SettingsView() {
  const [settings, setSettings] = useState<SettingsBlob>(load)
  const [saved, setSaved] = useState(false)
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [revokingPrefix, setRevokingPrefix] = useState<string | null>(null)

  async function refreshDeviceTokens() {
    setDevicesLoading(true)
    setDevicesError(null)
    try {
      const { device_tokens } = await listDeviceTokens()
      setDeviceTokens(device_tokens)
    } catch (err) {
      setDevicesError(err instanceof Error ? err.message : String(err))
    } finally {
      setDevicesLoading(false)
    }
  }

  useEffect(() => {
    void refreshDeviceTokens()
  }, [])

  function update<K extends keyof SettingsBlob>(key: K, patch: Partial<SettingsBlob[K]>) {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
    setSaved(false)
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function exportData(fmt: 'markdown' | 'json') {
    const url = `${API_BASE}/export.php?format=${fmt === 'markdown' ? 'md' : 'json'}`
    window.open(url, '_blank')
  }

  async function revoke(prefix: string) {
    const ok = window.confirm(
      'Revoke this desktop device token? That desktop app will be signed out on its next request.',
    )
    if (!ok) return

    setRevokingPrefix(prefix)
    setDevicesError(null)
    try {
      await revokeDeviceToken(prefix)
      await refreshDeviceTokens()
    } catch (err) {
      setDevicesError(err instanceof Error ? err.message : String(err))
    } finally {
      setRevokingPrefix(null)
    }
  }

  return (
    <section className={styles.view}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.sub}>
          App preferences are stored locally for now. Desktop device tokens are server-backed.
        </p>
      </header>

      <Group title="Overlay">
        <Field label="Theme">
          <select
            value={settings.overlay.theme}
            onChange={(e) => update('overlay', { theme: e.target.value as SettingsBlob['overlay']['theme'] })}
            className={styles.select}
          >
            {(['mono', 'warm', 'cool', 'midnight', 'sunset', 'forest', 'custom'] as const).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Alignment">
          <select
            value={settings.overlay.alignment}
            onChange={(e) => update('overlay', { alignment: e.target.value as SettingsBlob['overlay']['alignment'] })}
            className={styles.select}
          >
            <option value="leading">Leading</option>
            <option value="center">Center</option>
            <option value="trailing">Trailing</option>
          </select>
        </Field>
        <Field label={`Font size · ${settings.overlay.fontSize}px`}>
          <input
            type="range"
            min={10}
            max={20}
            step={1}
            value={settings.overlay.fontSize}
            onChange={(e) => update('overlay', { fontSize: Number(e.target.value) })}
            className={styles.range}
          />
        </Field>
        <Field label={`Opacity · ${Math.round(settings.overlay.opacity * 100)}%`}>
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            value={settings.overlay.opacity}
            onChange={(e) => update('overlay', { opacity: Number(e.target.value) })}
            className={styles.range}
          />
        </Field>
        <Field label="Show on all screens" inline>
          <input
            type="checkbox"
            checked={settings.overlay.showOnAllScreens}
            onChange={(e) => update('overlay', { showOnAllScreens: e.target.checked })}
          />
        </Field>
      </Group>

      <Group title="Hotkeys">
        <Field label="Quick punch">
          <input
            type="text"
            value={settings.hotkeys.quickPunch}
            onChange={(e) => update('hotkeys', { quickPunch: e.target.value })}
            className={styles.input}
          />
        </Field>
        <Field label="Open journal">
          <input
            type="text"
            value={settings.hotkeys.openJournal}
            onChange={(e) => update('hotkeys', { openJournal: e.target.value })}
            className={styles.input}
          />
        </Field>
        <Field label="Screenshot">
          <input
            type="text"
            value={settings.hotkeys.screenshot}
            onChange={(e) => update('hotkeys', { screenshot: e.target.value })}
            className={styles.input}
          />
        </Field>
      </Group>

      <Group title="Export">
        <Field label="Default format">
          <select
            value={settings.export.defaultFormat}
            onChange={(e) => update('export', { defaultFormat: e.target.value as 'markdown' | 'json' })}
            className={styles.select}
          >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
          </select>
        </Field>
        <Field label="Download now">
          <div className={styles.btnRow}>
            <button className={styles.btn} onClick={() => exportData('markdown')}>
              Markdown
            </button>
            <button className={styles.btn} onClick={() => exportData('json')}>
              JSON
            </button>
          </div>
        </Field>
      </Group>

      <Group title="Desktop devices">
        <div className={styles.devicePanel}>
          <p className={styles.helper}>
            Each desktop download mints a device token. Revoke a token to sign that
            desktop app out on its next API request.
          </p>

          {devicesLoading ? (
            <div className={styles.status}>Loading devices...</div>
          ) : devicesError ? (
            <div className={styles.error}>{devicesError}</div>
          ) : deviceTokens.length === 0 ? (
            <div className={styles.status}>No desktop downloads yet.</div>
          ) : (
            <div className={styles.deviceList}>
              {deviceTokens.map((token) => {
                const active = token.revoked_at === null
                return (
                  <div key={token.token_prefix} className={styles.deviceRow}>
                    <div>
                      <div className={styles.deviceTitle}>
                        {token.label ?? 'Desktop app'}
                      </div>
                      <div className={styles.deviceMeta}>
                        <code className={styles.code}>{token.token_prefix}</code>
                        <span>{token.platform ?? 'unknown platform'}</span>
                        <span>created {formatWhen(token.created_at)}</span>
                        <span>
                          {token.last_seen
                            ? `last seen ${formatWhen(token.last_seen)}`
                            : 'never seen'}
                        </span>
                      </div>
                    </div>
                    {active ? (
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={() => void revoke(token.token_prefix)}
                        disabled={revokingPrefix !== null}
                      >
                        {revokingPrefix === token.token_prefix ? 'Revoking...' : 'Revoke'}
                      </button>
                    ) : (
                      <span className={styles.revoked}>
                        Revoked {token.revoked_at ? formatWhen(token.revoked_at) : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <button
            type="button"
            className={styles.btn}
            onClick={() => void refreshDeviceTokens()}
            disabled={devicesLoading || revokingPrefix !== null}
          >
            Refresh
          </button>
        </div>
      </Group>

      <Group title="About">
        <Field label="API base" inline>
          <code className={styles.code}>{API_BASE}</code>
        </Field>
        <Field label="Web-app version" inline>
          <code className={styles.code}>0.1.0</code>
        </Field>
      </Group>

      <footer className={styles.footer}>
        <button className={styles.save} onClick={save}>
          {saved ? 'Saved ✓' : 'Save settings'}
        </button>
      </footer>
    </section>
  )
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <div className={styles.groupBody}>{children}</div>
    </section>
  )
}

function Field({ label, children, inline = false }: { label: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <label className={`${styles.field} ${inline ? styles.inline : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}
