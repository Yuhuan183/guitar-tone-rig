import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { DevicePage } from './pages/DevicePage'
import { LibraryPage } from './pages/LibraryPage'
import { PresetsPage } from './pages/PresetsPage'
import { SignalChainPage } from './pages/SignalChainPage'

/**
 * Two ways in to the same device pages: the chain (board → voice → controls)
 * and the library (browse by position, category or manufacturer, or search the
 * control index).
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="presets" element={<PresetsPage />} />
        <Route path="signal-chain" element={<SignalChainPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="devices/:deviceId" element={<DevicePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
