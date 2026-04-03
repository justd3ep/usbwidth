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
              🐧 Live Linux Data
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
            let statusTitle = 'System Health: Excellent';
            let statusSubtext = 'All connected devices are running well. No performance issues detected.';
            let statusIcon = '🟢';

            const hasSystem = data.warnings.some((w: any) => w.source === 'SYSTEM_LIMITATION');
            const hasHub = data.warnings.some((w: any) => w.source === 'HUB_LIMITATION');
            const hasDevice = data.warnings.some((w: any) => w.source === 'DEVICE_LIMITATION');

            if (hasSystem) {
              systemHealth = 'bottleneck';
              statusTitle = 'Controller Load Is High';
              statusSubtext = 'Your USB controller is handling significant traffic. Consider disconnecting unused devices to improve performance.';
              statusIcon = '🔴';
            } else if (hasHub || hasDevice) {
              systemHealth = 'limited';
              statusTitle = 'System Working Normally';
              statusSubtext = hasHub
                ? 'Some devices share a connection through a hub. This is expected behavior and your laptop is performing normally.'
                : 'Some devices are using standard USB 2.0 speed, which is normal for their device type. Your laptop is not a factor.';
              statusIcon = '🟡';
            }

            return (
              <div className="app-dashboard">
                {/* Top Banner: System Status Summary */}
                <div className={`dash-status-banner status-${systemHealth}`} style={{ padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '2rem' }}>{statusIcon}</span>
                  <div>
                    <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                      {statusTitle}
                    </h2>
                    <p style={{ margin: 0, opacity: 0.8, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      {statusSubtext}
                    </p>
                  </div>
                </div>

                {/* Top row: system info & Performance Overview */}
                <div className="dash-top">
                  <SystemInfoCard info={data.systemInfo} />

                  <div className="dash-overview-card" style={{ flex: 1, minWidth: '280px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📊</span> Performance Overview
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Devices:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.classifiedDevices.filter(d => !d.isInternal).length || data.classifiedDevices.length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Working Normally:</span>
                        <span style={{ fontWeight: 600, color: '#4ade80' }}>
                          {data.classifiedDevices.filter(d => d.status === 'NORMAL' && !d.isInternal).length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <span style={{ color: 'var(--text-muted)' }} title="Standard USB 2.0 speed — expected for these device types">At Standard Speed:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {data.warnings.filter(w => w.source === 'DEVICE_LIMITATION').length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <span style={{ color: 'var(--text-muted)' }} title="Sharing a hub connection — normal for most devices">Sharing Connection:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {data.warnings.filter(w => w.source === 'HUB_LIMITATION').length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Controller Issues:</span>
                        <span style={{ fontWeight: 600, color: data.warnings.some(w => w.source === 'SYSTEM_LIMITATION') ? '#f87171' : 'var(--text-secondary)' }}>
                          {data.warnings.filter(w => w.source === 'SYSTEM_LIMITATION').length}
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
                    <WarningsPanel warnings={data.warnings} />
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
        <span>Hardware Topology &amp; Bottleneck Advisor · V1.0</span>
        <span className="app-footer-note">
          No fake bandwidth %  · Real topology-based heuristics · Linux/Sysfs
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
