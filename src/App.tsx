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
            <p className="app-subtitle">USB system analysis · Device hierarchy · Performance optimization</p>
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
            {loadState === 'loading' ? 'Scanning…' : 'Refresh Scan'}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="app-main">
        {loadState === 'idle' && (
          <div className="app-state-screen">
            <span className="app-state-icon">🔌</span>
            <h2>Ready to scan</h2>
            <p>Click <strong>Refresh Scan</strong> to analyse your USB topology.</p>
          </div>
        )}

        {loadState === 'loading' && (
          <div className="app-state-screen">
            <div className="app-spinner" />
            <h2>Scanning hardware…</h2>
            <p>Querying USB systems, hubs, and devices.</p>
          </div>
        )}

        {loadState === 'error' && (
          <div className="app-state-screen app-state-err">
            <span className="app-state-icon">❌</span>
            <h2>Scan failed</h2>
            <p>{errorMsg}</p>
            <button className="app-refresh-btn" onClick={fetchTopology}>Retry</button>
          </div>
        )}

        {loadState === 'success' && data && (
          (() => {
            let systemHealth = 'optimal';
            let statusTitle = 'System Operating Normally';
            let statusSubtext = 'All connected devices are functionally optimized for the currently available bandwidth.';
            let statusIcon = '🟢';

            const hasSystem = data.warnings.some((w: any) => w.source === 'SYSTEM_LIMITATION');
            const hasHub = data.warnings.some((w: any) => w.source === 'HUB_LIMITATION');
            const hasDevice = data.warnings.some((w: any) => w.source === 'DEVICE_LIMITATION');

            if (hasSystem) {
              systemHealth = 'bottleneck';
              statusTitle = 'System-Level Bottleneck Detected';
              statusSubtext = 'System controller bandwidth is saturated. Significant performance impacts expected.';
              statusIcon = '🔴';
            } else if (hasHub || hasDevice) {
              systemHealth = 'limited';
              statusTitle = 'Performance Limited by Connected Devices';
              statusSubtext = hasHub
                ? 'Bandwidth is shared across multiple devices via a hub.'
                : 'Some connected devices are operating below the port\'s maximum capability.';
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
                        <span style={{ color: 'var(--text-muted)' }}>Fully Optimized:</span>
                        <span style={{ fontWeight: 600, color: '#4ade80' }}>
                          {data.classifiedDevices.filter(d => d.status === 'NORMAL' && !d.isInternal).length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Limited by Device:</span>
                        <span style={{ fontWeight: 600, color: '#fbbf24' }}>
                          {data.warnings.filter(w => w.source === 'DEVICE_LIMITATION').length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Limited by Hub:</span>
                        <span style={{ fontWeight: 600, color: '#fbbf24' }}>
                          {data.warnings.filter(w => w.source === 'HUB_LIMITATION').length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>System Bottlenecks:</span>
                        <span style={{ fontWeight: 600, color: data.warnings.some(w => w.source === 'SYSTEM_LIMITATION') ? '#f87171' : 'var(--text-primary)' }}>
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
