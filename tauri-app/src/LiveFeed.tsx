import { useCallback, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import {
  ApiError,
  DEVICE_AUTH_CHANGED_EVENT,
  clearCachedDeviceAuth,
  listRecentEntries,
  onUnauthorized,
} from './api/client'
import type { Entry } from './api/types'
import { useTheme } from './useTheme'
import './LiveFeed.css'

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function LiveFeed() {
  useTheme('live_feed_theme')
  const [entries, setEntries] = useState<Entry[]>([])
  const [isUnpaired, setIsUnpaired] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('live-feed-window')
    document.body.classList.add('live-feed-window')
    return () => {
      document.documentElement.classList.remove('live-feed-window')
      document.body.classList.remove('live-feed-window')
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      setEntries(await listRecentEntries(5))
      setIsUnpaired(false)
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.code === 'unpaired')
      ) {
        setEntries([])
        setIsUnpaired(true)
      }
      /* offline / API down — keep last snapshot */
    }
  }, [])

  useEffect(() => {
    const offUnauthorized = onUnauthorized(() => {
      setEntries([])
      setIsUnpaired(true)
    })
    const offAuthChanged = listen<import('./api/types').DeviceAuthDto | null>(DEVICE_AUTH_CHANGED_EVENT, (event) => {
      clearCachedDeviceAuth()
      if (event.payload) {
        setIsUnpaired(false)
        void refresh()
      } else {
        setEntries([])
        setIsUnpaired(true)
      }
    })

    return () => {
      offUnauthorized()
      offAuthChanged.then((fn) => fn())
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 30_000)
    return () => window.clearInterval(id)
  }, [refresh])

  const rows = entries.slice(0, 5)

  return (
    <div className="live-feed-shell">
      {/*
        Native window drag via Tauri-injected drag.js (mousedown → start_dragging).
        Same code path as the OS titlebar — works across monitors.
      */}
      <div
        className="live-feed-drag-handle"
        data-tauri-drag-region
        role="separator"
        aria-label="Drag to move the live feed"
      />

      <div className="live-feed-list" role="list">
        {rows.length === 0 ? (
          <div className="live-feed-empty">
            {isUnpaired
              ? 'Re-download from the web-app to sign in.'
              : 'No entries yet.'}
          </div>
        ) : (
          rows.map((entry) => (
            <article key={entry.id} className="live-feed-row" role="listitem">
              <span className="live-feed-time">{formatTime(entry.created_at)}</span>
              <span className="live-feed-sep" aria-hidden>
                ·
              </span>
              <span className="live-feed-text">
                {entry.content.trim() || '(image)'}
              </span>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
