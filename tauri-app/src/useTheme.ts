import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export type ThemeScope = 'popup_theme' | 'live_feed_theme'

type DesktopPrefs = {
  live_feed_enabled: boolean
  popup_theme: string
  live_feed_theme: string
}

const FALLBACK_THEME = 'glass-dark'
const CACHE_KEY_PREFIX = 'ij-theme:'

function applyTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme || FALLBACK_THEME)
}

/**
 * Mirrors the user's selected theme from desktop prefs onto `<html data-theme>`.
 *
 * A localStorage cache is read synchronously on mount so the first paint matches the
 * previously-selected theme even before the Rust IPC call resolves — avoids a flash
 * on cold-start. The cache is refreshed from the Rust-authoritative prefs (which live
 * in `desktop_prefs.json` under AppConfig) as soon as IPC returns, and again on any
 * `desktop-prefs:changed` event from the tray menu.
 */
export function useTheme(scope: ThemeScope): void {
  useEffect(() => {
    const cacheKey = `${CACHE_KEY_PREFIX}${scope}`
    const cached =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(cacheKey)
        : null
    applyTheme(cached ?? FALLBACK_THEME)

    let cancelled = false

    void invoke<DesktopPrefs>('get_desktop_prefs')
      .then((prefs) => {
        if (cancelled) return
        const theme = prefs[scope] ?? FALLBACK_THEME
        applyTheme(theme)
        window.localStorage.setItem(cacheKey, theme)
      })
      .catch(() => {
        /* pre-IPC paint already applied the cached/fallback value */
      })

    const unlisten = listen<DesktopPrefs>('desktop-prefs:changed', (event) => {
      const theme = event.payload[scope] ?? FALLBACK_THEME
      applyTheme(theme)
      window.localStorage.setItem(cacheKey, theme)
    })

    return () => {
      cancelled = true
      void unlisten.then((fn) => fn())
    }
  }, [scope])
}
