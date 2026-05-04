import { Navigate, Route, Routes, useLocation, useMatch } from 'react-router-dom'
import { AppShell } from './components/partials'
import RequireAuth from './state/RequireAuth'
import BrowserView, { BrowserDetailPanel } from './views/BrowserView'
import StatsView from './views/StatsView'
import SettingsView from './views/SettingsView'
import DownloadView from './views/DownloadView'
import BootView from './views/BootView'
import LoginView from './views/LoginView'
import NotFoundView from './views/NotFoundView'

/**
 * Routes that live inside the browser view and therefore opt-in to the
 * right-hand detail panel slot.
 */
const BROWSER_ROUTE_PATHS = ['/today', '/yesterday', '/last-7', '/all', '/tag']

function useIsBrowserRoute(): boolean {
  const location = useLocation()
  const tagMatch = useMatch('/tag/:tag')
  if (tagMatch) return true
  return BROWSER_ROUTE_PATHS.some((p) => location.pathname === p)
}

function ProtectedShell() {
  const showDetail = useIsBrowserRoute()
  return (
    <AppShell rightPanel={showDetail ? <BrowserDetailPanel /> : undefined}>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<BrowserView filterKey="today" />} />
        <Route path="/yesterday" element={<BrowserView filterKey="yesterday" />} />
        <Route path="/last-7" element={<BrowserView filterKey="last7" />} />
        <Route path="/all" element={<BrowserView filterKey="all" />} />
        <Route path="/tag/:tag" element={<BrowserView filterKey="tag" />} />
        <Route path="/heatmap" element={<Navigate to="/stats" replace />} />
        <Route path="/stats" element={<StatsView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/download" element={<DownloadView />} />
        <Route path="/boot" element={<BootView />} />
        <Route path="*" element={<NotFoundView />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route
        path="*"
        element={
          <RequireAuth>
            <ProtectedShell />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
