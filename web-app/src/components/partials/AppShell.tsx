import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import SideNavBar from './SideNavBar'
import styles from './AppShell.module.css'

type Props = {
  /**
   * Main content area — rendered between the side-nav and optional
   * right-hand panel. Scroll-owns itself, so views should typically render
   * a full-height flex column inside.
   */
  children: ReactNode
  /**
   * Optional right-hand column (entry detail, split-pane, etc.).
   * When present the shell reserves a 320 px track for it.
   */
  rightPanel?: ReactNode
}

const DETAIL_PANEL_STORAGE_KEY = 'ij-detail-panel-width-v1'
const DETAIL_PANEL_DEFAULT_WIDTH = 320
const DETAIL_PANEL_MIN_WIDTH = 260
const DETAIL_PANEL_MAX_WIDTH = 720
const DETAIL_PANEL_MIN_MAIN_WIDTH = 420
const SIDE_NAV_WIDTH = 256

function getMaxDetailWidth(): number {
  if (typeof window === 'undefined') return DETAIL_PANEL_MAX_WIDTH
  const maxByViewport = window.innerWidth - SIDE_NAV_WIDTH - DETAIL_PANEL_MIN_MAIN_WIDTH
  return Math.max(DETAIL_PANEL_MIN_WIDTH, Math.min(DETAIL_PANEL_MAX_WIDTH, maxByViewport))
}

function clampDetailWidth(width: number): number {
  const max = getMaxDetailWidth()
  return Math.min(max, Math.max(DETAIL_PANEL_MIN_WIDTH, Math.round(width)))
}

function loadDetailWidth(): number {
  if (typeof window === 'undefined') return DETAIL_PANEL_DEFAULT_WIDTH

  try {
    const raw = window.localStorage.getItem(DETAIL_PANEL_STORAGE_KEY)
    if (raw) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) return clampDetailWidth(parsed)
    }
  } catch {
    /* ignore */
  }

  return clampDetailWidth(DETAIL_PANEL_DEFAULT_WIDTH)
}

/**
 * App shell: side nav, main content, optional detail column.
 * Full-viewport; views own scrolling inside `main`.
 */
export default function AppShell({ children, rightPanel }: Props) {
  const [detailWidth, setDetailWidth] = useState(loadDetailWidth)
  const dragActiveRef = useRef(false)

  useEffect(() => {
    if (!rightPanel) return
    try {
      window.localStorage.setItem(DETAIL_PANEL_STORAGE_KEY, String(detailWidth))
    } catch {
      /* ignore */
    }
  }, [detailWidth, rightPanel])

  useEffect(() => {
    function stopDragging() {
      dragActiveRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    function handlePointerMove(event: PointerEvent) {
      if (!dragActiveRef.current) return
      setDetailWidth(clampDetailWidth(window.innerWidth - event.clientX))
    }

    function handleWindowResize() {
      setDetailWidth((prev) => clampDetailWidth(prev))
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
      window.removeEventListener('resize', handleWindowResize)
      stopDragging()
    }
  }, [])

  function startDragging(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    dragActiveRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function handleResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setDetailWidth((prev) => clampDetailWidth(prev + 24))
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setDetailWidth((prev) => clampDetailWidth(prev - 24))
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setDetailWidth(clampDetailWidth(DETAIL_PANEL_MIN_WIDTH))
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      setDetailWidth(getMaxDetailWidth())
    }
  }

  const shellStyle = rightPanel
    ? ({ '--ij-shell-detail-width': `${detailWidth}px` } as CSSProperties)
    : undefined
  const maxDetailWidth = getMaxDetailWidth()

  return (
    <div
      className={`${styles.shell} ${rightPanel ? styles.withDetail : ''}`}
      style={shellStyle}
    >
      <SideNavBar />
      <main className={styles.main}>{children}</main>
      {rightPanel ? (
        <div className={styles.detailColumn}>
          {rightPanel}
          <div
            className={styles.resizeHandle}
            role="separator"
            tabIndex={0}
            aria-label="Resize detail panel"
            aria-orientation="vertical"
            aria-valuemin={DETAIL_PANEL_MIN_WIDTH}
            aria-valuemax={maxDetailWidth}
            aria-valuenow={detailWidth}
            onPointerDown={startDragging}
            onKeyDown={handleResizeKeyDown}
          >
            <span className={styles.resizeHandleGrip} aria-hidden />
          </div>
        </div>
      ) : null}
    </div>
  )
}
