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
          <span className="app-logo">⚡</span>
          <div>
            <h1 className="app-title">Hardware Topology &amp; Bottleneck Advisor</h1>
            <p className="app-subtitle">USB controller analysis · Device hierarchy · Performance warnings</p>
          </div>
        </div>
        <div className="app-header-right">
          {data?.isMock && (
            <div className="app-demo-notice" title="Running with simulated hardware data. Real data is read on Linux.">
              🧪 Demo Mode — Simulated Data
            </div>
          )}
          {!data?.isMock && data && (
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
            <p>Querying USB controllers, hubs, and devices.</p>
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
          <div className="app-dashboard">
            {/* Top row: system info */}
            <div className="dash-top">
              <SystemInfoCard info={data.systemInfo} isMock={data.isMock} />
              <div className="dash-stats">
                <StatTile icon="🔌" label="Controllers" value={data.tree.length} />
                <StatTile icon="📦" label="Devices" value={data.classifiedDevices.length} />
                <StatTile
                  icon="⚠️"
                  label="Issues"
                  value={data.warnings.length}
                  accent={data.warnings.length > 0 ? 'red' : 'green'}
                />
                <StatTile icon="💡" label="Actions" value={data.recommendations.length} />
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
