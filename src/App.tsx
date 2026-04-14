import { useEffect } from 'react'
import { useHardwareData } from './hooks/useHardwareData'
import SystemInfoCard from './components/SystemInfoCard'
import TopologyTree from './components/TopologyTree'
import WarningsPanel from './components/WarningsPanel'
import RecommendationsPanel from './components/RecommendationsPanel'
import './App.css'

export default function App() {
  const { data, loadState, errorMsg, fetchTopology } = useHardwareData()

  // Auto-fetch on mount
  useEffect(() => { fetchTopology() }, [fetchTopology])

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-logo"></span>
          <div>
            <h1 className="app-title">usbWidth</h1>
            <p className="app-subtitle">See what's connected, how fast it runs, and what (if anything) is slowing it down</p>
          </div>
        </div>
        <div className="app-header-right">
          {data && (
            <div className="app-platform-notice">
              {data.platform === 'win32' ? '🪟 Live Windows Data' : data.platform === 'linux' ? '🐧 Live Linux Data' : '💻 Live Data'}
            </div>
          )}
          {data?.error && (
            <div className="app-error-notice" title={data.error}>
              ⚠ Sysfs Partial Error
            </div>
          )}
          <button
            className="app-refresh-btn"
            onClick={fetchTopology}
            disabled={loadState === 'loading'}
            aria-label="Refresh hardware scan"
          >
            <span className={`refresh-icon ${loadState === 'loading' ? 'spinning' : ''}`}>↻</span>
            {loadState === 'loading' ? 'Scanning…' : 'Scan Again'}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="app-main">
        {loadState === 'idle' && (
          <div className="app-state-screen">
            <span className="app-state-icon">🔌</span>
            <h2>Ready when you are</h2>
            <p>Click <strong>Scan Again</strong> to detect your connected USB devices and check their performance.</p>
          </div>
        )}

        {loadState === 'loading' && (
          <div className="app-state-screen">
            <div className="app-spinner" />
            <h2>Scanning your setup…</h2>
            <p>Detecting USB controllers, hubs, and connected devices. This only takes a moment.</p>
          </div>
        )}

        {loadState === 'error' && (
          <div className="app-state-screen app-state-err">
            <span className="app-state-icon">⚠️</span>
            <h2>Couldn't read your USB setup</h2>
            <p>{errorMsg}</p>
            <button className="app-refresh-btn" onClick={fetchTopology}>Try Again</button>
          </div>
        )}

        {loadState === 'success' && data && (
          (() => {
            let systemHealth = 'optimal';
            let statusTitle = 'All Devices Operating Normally';
            let statusSubtext = 'All connected devices are performing as expected for their type. No issues detected.';
            let statusIcon = '🟢';

            const hasSystem = data.warnings.some((w: any) => w.source === 'SYSTEM_LIMITATION');
            const hasHub = data.warnings.some((w: any) => w.source === 'HUB_LIMITATION');
            const hasDevice = data.warnings.some((w: any) => w.source === 'DEVICE_LIMITATION');

            // Count healthy external devices (OPTIMAL, ADEQUATE, or legacy NORMAL)
            const healthyCount = data.classifiedDevices.filter(
              (d: any) => !d.isInternal &&
                (d.status === 'OPTIMAL' || d.status === 'ADEQUATE' || d.status === 'NORMAL')
            ).length
            const limitedCount = data.warnings.filter((w: any) => w.source === 'DEVICE_LIMITATION').length
            const hubCount = data.warnings.filter((w: any) => w.source === 'HUB_LIMITATION').length
            const systemCount = data.warnings.filter((w: any) => w.source === 'SYSTEM_LIMITATION').length
            const totalExternal = data.classifiedDevices.filter((d: any) => !d.isInternal).length
            const totalInternal = data.classifiedDevices.filter((d: any) => d.isInternal).length

            // Safe, factual insight for the Connection Notes empty state
            const externalDevices = data.classifiedDevices.filter((d: any) => !d.isInternal)
            const allLowTier = externalDevices.length > 0 && externalDevices.every((d: any) => d.tier === 'LOW')
            const hasHighTier = externalDevices.some((d: any) => d.tier === 'HIGH')
            const insight: string | null = data.warnings.length === 0
              ? allLowTier
                ? 'Your connected devices are all low-bandwidth by design. They work correctly on any USB port — no high-speed connection is required.'
                : hasHighTier
                  ? 'Your high-bandwidth devices are connected correctly and running at their available speed.'
                  : 'All devices are operating at expected performance for their type.'
              : null

            if (hasSystem) {
              systemHealth = 'bottleneck';
              statusTitle = 'Controller Load Is High';
              statusSubtext = 'Your USB controller is handling significant traffic. Consider disconnecting unused devices to improve performance.';
              statusIcon = '🔴';
            } else if (hasHub || hasDevice) {
              systemHealth = 'limited';
              statusTitle = 'One or More Devices Are Speed-Limited';
              statusSubtext = hasHub
                ? 'A high-bandwidth device is sharing its connection via a hub. Connecting it directly may improve transfer speeds.'
                : 'A storage or capture device is running at USB 2.0 speed and would benefit from a USB 3.x port.';
              statusIcon = '🟡';
            }

            return (
              <div className="app-dashboard">
                {/* Top Banner: System Status Summary */}
                <div className={`dash-status-banner status-${systemHealth}`}>
                  <span style={{ fontSize: '2rem' }}>{statusIcon}</span>
                  <div>
                    <h2 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {statusTitle}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.83rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                      {statusSubtext}
                    </p>
                  </div>
                </div>

                {/* Top row: system info & Performance Overview */}
                <div className="dash-top">
                  <SystemInfoCard info={data.systemInfo} />

                  <div className="dash-overview-card">
                    <h3 className="dash-overview-title">
                      <span>📊</span> Performance Overview
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div className="dash-overview-row">
                        <span className="dash-overview-label">External Devices</span>
                        <span className="dash-overview-value">{totalExternal}</span>
                      </div>
                      <div className="dash-overview-row">
                        <span className="dash-overview-label">Built-in Devices</span>
                        <span className="dash-overview-value val-muted">{totalInternal}</span>
                      </div>
                      <div className="dash-overview-row">
                        <span className="dash-overview-label">Working Normally</span>
                        <span className="dash-overview-value val-green">{healthyCount}</span>
                      </div>
                      <div className="dash-overview-row">
                        <span
                          className="dash-overview-label"
                          title="High-bandwidth devices running below their capable speed (e.g. storage on USB 2.0)"
                        >Speed Limited</span>
                        <span className={`dash-overview-value ${limitedCount > 0 ? 'val-muted' : 'val-green'}`}>
                          {limitedCount}
                        </span>
                      </div>
                      <div className="dash-overview-row">
                        <span className="dash-overview-label" title="High-bandwidth devices sharing a hub connection">Sharing via Hub</span>
                        <span className={`dash-overview-value ${hubCount > 0 ? 'val-muted' : 'val-green'}`}>
                          {hubCount}
                        </span>
                      </div>
                      <div className="dash-overview-row">
                        <span className="dash-overview-label">Controller Issues</span>
                        <span className={`dash-overview-value ${systemCount > 0 ? 'val-red' : 'val-green'}`}>
                          {systemCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main grid */}
                <div className="dash-grid">
                  <div className="dash-left">
                    <TopologyTree tree={data.tree} warnings={data.warnings} />
                  </div>
                  <div className="dash-right">
                    <WarningsPanel warnings={data.warnings} insight={insight} />
                    <RecommendationsPanel recommendations={data.recommendations} />
                  </div>
                </div>
              </div>
            )
          })()
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <span>usbWidth</span>
        <span className="app-footer-note">
        </span>
      </footer>
    </div>
  )
}

function StatTile({
  icon, label, value, accent,
}: {
  icon: string; label: string; value: number; accent?: 'red' | 'green'
}) {
  return (
    <div className={`stat-tile ${accent ? `stat-${accent}` : ''}`}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
