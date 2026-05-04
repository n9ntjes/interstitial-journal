import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  ApiError,
  DEVICE_AUTH_CHANGED_EVENT,
  clearCachedDeviceAuth,
  createEntry,
  loadDeviceAuth,
  onUnauthorized,
  uploadImage,
} from './api/client'
import type { DeviceAuthDto } from './api/types'
import { useTheme } from './useTheme'
import './App.css'

type Thumbnail = {
  key: string
  url: string
  blob: Blob
}

type AuthStatus = 'loading' | 'paired' | 'unpaired'

/** Bent return arrow — reads as “send / enter” on all platforms */
function IconReturnSend() {
  return (
    <svg
      className="hotkey-glyph-svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 6 6v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function base64ToBlob(b64: string, mime: string): Blob {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function focusTextareaAtEnd(el: HTMLTextAreaElement | null) {
  if (!el) return
  const len = el.value.length
  el.focus()
  // After focus, some engines reset selection to 0; snap caret to the end.
  requestAnimationFrame(() => {
    el.setSelectionRange(len, len)
  })
}

function App() {
  useTheme('popup_theme')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([])
  const [shellOpen, setShellOpen] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const thumbnailsRef = useRef<Thumbnail[]>([])
  const hideAfterTransitionRef = useRef(false)
  const exitFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const hidePromiseRef = useRef<{ resolve: () => void } | null>(null)

  useEffect(() => {
    thumbnailsRef.current = thumbnails
  }, [thumbnails])

  const runEnterAnimation = useCallback(() => {
    setShellOpen(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShellOpen(true))
    })
  }, [])

  const finalizeHide = useCallback(() => {
    if (!hideAfterTransitionRef.current) return
    hideAfterTransitionRef.current = false
    if (exitFallbackTimerRef.current) {
      clearTimeout(exitFallbackTimerRef.current)
      exitFallbackTimerRef.current = null
    }
    void invoke('hide_quick_punch').then(() => {
      hidePromiseRef.current?.resolve()
      hidePromiseRef.current = null
    })
  }, [])

  const hideWithAnimation = useCallback(() => {
    hideAfterTransitionRef.current = true
    setShellOpen(false)
    return new Promise<void>((resolve) => {
      hidePromiseRef.current = { resolve }
      if (exitFallbackTimerRef.current) {
        clearTimeout(exitFallbackTimerRef.current)
      }
      exitFallbackTimerRef.current = setTimeout(finalizeHide, 420)
    })
  }, [finalizeHide])

  useEffect(
    () => () => {
      if (exitFallbackTimerRef.current) {
        clearTimeout(exitFallbackTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    void loadDeviceAuth().then((auth) => {
      if (cancelled) return
      setAuthStatus(auth ? 'paired' : 'unpaired')
    })

    const offUnauthorized = onUnauthorized(() => {
      setAuthStatus('unpaired')
      setError('Your desktop app was signed out. Re-download it from the web-app.')
    })

    const offAuthChanged = listen<DeviceAuthDto | null>(DEVICE_AUTH_CHANGED_EVENT, (event) => {
      clearCachedDeviceAuth()
      if (event.payload) {
        setAuthStatus('paired')
        setError(null)
      } else {
        setAuthStatus('unpaired')
        setError('Your desktop app was signed out. Re-download it from the web-app.')
      }
    })

    return () => {
      cancelled = true
      offUnauthorized()
      offAuthChanged.then((fn) => fn())
    }
  }, [])

  function onShellTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return
    finalizeHide()
  }

  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = []

    unlisteners.push(
      listen('quick-punch:show', () => {
        // Keep draft, thumbnails, and error until a successful send — only
        // recover a stuck "sending" state when reopening.
        setSending(false)
        runEnterAnimation()
        requestAnimationFrame(() => focusTextareaAtEnd(inputRef.current))
      }),
    )

    unlisteners.push(
      listen<string>('screenshot:capture', (event) => {
        const blob = base64ToBlob(event.payload, 'image/png')
        const url = URL.createObjectURL(blob)
        setThumbnails((prev) => [
          ...prev,
          { key: crypto.randomUUID(), url, blob },
        ])
      }),
    )

    unlisteners.push(
      listen<string>('screenshot:error', (event) => {
        setError(event.payload || 'Screenshot failed')
      }),
    )

    focusTextareaAtEnd(inputRef.current)

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()))
      for (const t of thumbnailsRef.current) URL.revokeObjectURL(t.url)
    }
  }, [runEnterAnimation])

  function removeThumbnail(key: string) {
    setThumbnails((prev) => {
      const t = prev.find((x) => x.key === key)
      if (t) URL.revokeObjectURL(t.url)
      return prev.filter((x) => x.key !== key)
    })
  }

  async function uploadThumbnails(): Promise<number[]> {
    const ids: number[] = []
    for (const t of thumbnails) {
      const image = await uploadImage(t.blob, 'screenshot.png')
      ids.push(image.id)
    }
    return ids
  }

  async function submit() {
    const content = draft.trim()
    if ((!content && thumbnails.length === 0) || sending) return
    if (authStatus !== 'paired') {
      setError('Open the web-app and re-download to sign in.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const imageIds = await uploadThumbnails()
      await createEntry({
        content,
        created_at: new Date().toISOString(),
        imageIds,
      })
      setDraft('')
      for (const t of thumbnails) URL.revokeObjectURL(t.url)
      setThumbnails([])
      await hideWithAnimation()
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.code === 'unpaired')) {
        setAuthStatus('unpaired')
      }
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      void submit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      void hideWithAnimation()
    }
  }

  const isMac =
    typeof navigator !== 'undefined' &&
    (/Mac|iPhone|iPod/.test(navigator.platform) ||
      navigator.platform === 'MacIntel')
  const isInputDisabled = sending || authStatus !== 'paired'
  const authMessage =
    authStatus === 'unpaired'
      ? 'Open the web-app and re-download to sign in.'
      : null
  const stripError = error ?? authMessage

  return (
    <div
      className={`quick-punch-shell ${shellOpen ? 'quick-punch-shell--open' : ''}`}
      onTransitionEnd={onShellTransitionEnd}
    >
      <div className="quick-punch">
        <div
          className={`pill ${sending ? 'is-sending' : ''} ${
            authStatus === 'unpaired' ? 'is-unpaired' : ''
          }`}
        >
          <textarea
            ref={inputRef}
            className="pill-input"
            placeholder={
              authStatus === 'loading'
                ? 'Checking desktop sign-in...'
                : authStatus === 'unpaired'
                  ? 'Open the web-app and re-download to sign in'
                  : 'What did you just do?'
            }
            value={draft}
            disabled={isInputDisabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            spellCheck={false}
            autoFocus
          />
        </div>

        {thumbnails.length > 0 && (
          <div className="thumbnails-ribbon" aria-live="polite">
            <div className="thumbnails">
              {thumbnails.map((t, i) => (
                <div
                  key={t.key}
                  className="thumbnail"
                  style={{ '--thumb-i': i } as React.CSSProperties}
                >
                  <img src={t.url} alt="screenshot preview" />
                  <button
                    type="button"
                    className="thumbnail-remove"
                    onClick={() => removeThumbnail(t.key)}
                    aria-label="Remove screenshot"
                    disabled={sending}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="hotkey-strip" role="group" aria-label="Keyboard shortcuts">
          <div className="hotkey-chip">
            <span className="hotkey-seq">
              <kbd className="keycap">
                <IconReturnSend />
              </kbd>
            </span>
            <span className="hotkey-caption">Send</span>
          </div>
          <span className="hotkey-dot" aria-hidden>
            ·
          </span>
          <div className="hotkey-chip">
            <span className="hotkey-seq">
              <kbd className="keycap keycap--glyph-font">⇧</kbd>
              <kbd className="keycap keycap--glyph-font">
                <span className="keycap-wide">↵</span>
              </kbd>
            </span>
            <span className="hotkey-caption">New line</span>
          </div>
          <span className="hotkey-dot" aria-hidden>
            ·
          </span>
          <div className="hotkey-chip">
            <span className="hotkey-seq">
              {isMac ? (
                <>
                  <kbd className="keycap keycap--glyph-font">⌘</kbd>
                  <kbd className="keycap keycap--glyph-font">⇧</kbd>
                  <kbd className="keycap keycap--glyph-font keycap--letter">
                    S
                  </kbd>
                </>
              ) : (
                <>
                  <kbd className="keycap keycap--ctrl">Ctrl</kbd>
                  <kbd className="keycap keycap--glyph-font">⇧</kbd>
                  <kbd className="keycap keycap--glyph-font keycap--letter">
                    S
                  </kbd>
                </>
              )}
            </span>
            <span className="hotkey-caption">Capture</span>
          </div>
          <span className="hotkey-dot" aria-hidden>
            ·
          </span>
          <div className="hotkey-chip">
            <span className="hotkey-seq">
              <kbd className="keycap keycap--esc">esc</kbd>
            </span>
            <span className="hotkey-caption">Dismiss</span>
          </div>
          {stripError && (
            <span className="hotkey-error" title={stripError}>
              {stripError}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
