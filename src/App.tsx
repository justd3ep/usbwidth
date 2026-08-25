import { useEffect, useMemo, useState } from 'react'
import type { UsbNode } from './types/usb'
import { useHardwareData } from './hooks/useHardwareData'
import { ErrorBoundary } from './components/ErrorBoundary'
import SystemInfoCard from './components/SystemInfoCard'
import TopologyTree from './components/TopologyTree'
import WarningsPanel from './components/WarningsPanel'
import RecommendationsPanel from './components/RecommendationsPanel'
import AppMenu, { type MenuGroup } from './components/AppMenu'
import AboutModal from './components/AboutModal'
import DeviceDetailModal from './components/DeviceDetailModal'
import DiagnosticsModal from './components/DiagnosticsModal'
import { buildTextReport, buildJsonReport } from './utils/scanReport'
import { checkSecurity } from './utils/securityCheck'
import './App.css'

export default function App() {
  const { data, loadState, errorMsg, fetchTopology } = useHardwareData()
  const [aboutOpen, setAboutOpen] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<UsbNode | null>(null)
  const [lastScanAt, setLastScanAt] = useState<number | null>(null)
  const [history, setHistory] = useState<{ at: number; count: number }[]>([])
  const [toast, setToast] = useState<string | null>(null)

  // Auto-fetch on mount
  useEffect(() => { fetchTopology() }, [fetchTopology])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  // Track scan history when data arrives
  useEffect(() => {
    if (loadState !== 'success' || !data) return
    const now = Date.now()
    setLastScanAt(now)
    setHistory(prev => {
      const last = prev[0]
      // Don't double-log if same scan within 2s (e.g. hotplug event)
      if (last && now - last.at < 2000) return prev
      const entry = { at: now, count: data.classifiedDevices?.length || 0 }
      return [entry, ...prev].slice(0, 5)
    })
  }, [data, loadState])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setToast('Copied to clipboard')
    } catch {
      setToast('Copy failed')
    }
  }

  const menuGroups: MenuGroup[] = useMemo(() => {
    const hasData = loadState === 'success' && data
    const lastScanLabel = lastScanAt
      ? `Last scan: ${new Date(lastScanAt).toLocaleTimeString()} (${history[0]?.count ?? 0} devices)`
      : 'No scans yet'
    const securityCount = hasData ? checkSecurity(data.classifiedDevices).filter(f => f.severity !== 'info').length : 0
    return [
      {
        id: 'scan',
        label: 'Scan',
        items: [
          {
            id: 'rescan',
            label: 'Re-scan now',
            hint: 'Re-enumerate all USB devices',
            shortcut: 'F5',
            onClick: () => fetchTopology(),
            disabled: loadState === 'loading',
          },
          {
            id: 'history',
            label: 'Scan history',
            hint: lastScanLabel,
            disabled: true,  // display-only; full history view is a future feature
            onClick: () => { },
          },
        ],
      },
      {
        id: 'tools',
        label: 'Tools',
        items: [
          {
            id: 'diagnostics',
            label: 'Diagnostics',
            hint: securityCount > 0
              ? `${securityCount} potential issue${securityCount === 1 ? '' : 's'}`
              : 'Security + port speed check',
            disabled: !hasData,
            onClick: () => setDiagnosticsOpen(true),
          },
        ],
      },
      {
        id: 'export',
        label: 'Export',
        items: [
          {
            id: 'copy-text',
            label: 'Copy report as text',
            hint: 'For support tickets / forums',
            disabled: !hasData,
            onClick: () => hasData && copyToClipboard(buildTextReport(data)),
          },
          {
            id: 'copy-json',
            label: 'Copy report as JSON',
            hint: 'For debugging / bug reports',
            disabled: !hasData,
            onClick: () => hasData && copyToClipboard(buildJsonReport(data)),
          },
          {
            id: 'save-file',
            label: 'Save report to file…',
            hint: 'Choose .json or .txt on disk',
            disabled: !hasData,
            onClick: async () => {
              if (!hasData) return
              const json = buildJsonReport(data)
              const res = await window.api.saveScan({ contents: json })
              if (res.success) setToast('Saved')
              else if (res.error !== 'Cancelled') setToast('Save failed: ' + res.error)
            },
          },
        ],
      },
      {
        id: 'help',
        label: 'Help',
        items: [
          {
            id: 'about',
            label: 'About usbWidth',
            onClick: () => setAboutOpen(true),
          },
        ],
      },
    ]
  }, [data, loadState, fetchTopology, lastScanAt, history])

  return (
    <div className="app-shell">
      {/* ── App menu bar (under the title bar, above the dashboard) ── */}
      <AppMenu groups={menuGroups} />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">U</div>
          <div>
            <h1 className="app-title">usbWidth</h1>
            <p className="app-subtitle">See what's connected, how fast it runs, and what (if anything) is slowing it down</p>
          </div>
        </div>
        <div className="app-header-right">
          {data && (
            <div className="app-platform-notice">
              {data.platform === 'win32' ? 'Windows' : data.platform === 'linux' ? 'Linux' : 'Live Data'}
            </div>
          )}
          {data?.error && (
            <div className="app-error-notice" title={data.error}>
              Sysfs Partial Error
            </div>
          )}
          <button
            className="app-refresh-btn"
            onClick={fetchTopology}
            disabled={loadState === 'loading'}
            aria-label="Refresh hardware scan"
          >
            <span className={`refresh-icon ${loadState === 'loading' ? 'spinning' : ''}`}>↻</span>
            {loadState === 'loading' ? 'Scanning' : 'Scan Again'}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="app-main">
        {loadState === 'idle' && (
          <div className="app-state-screen">
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
            <h2>Couldn't read your USB setup</h2>
            <p>{errorMsg}</p>
            <button className="app-refresh-btn" onClick={fetchTopology}>Try Again</button>
          </div>
        )}

        {loadState === 'success' && data && (
          (() => {
            let systemHealth: 'optimal' | 'limited' | 'bottleneck' = 'optimal';
            let statusTitle = 'All Devices Operating Normally';
            let statusSubtext = 'All connected devices are performing as expected for their type.';

            const hasSystem = data.warnings.some((w) => w.source === 'SYSTEM_LIMITATION');
            const hasHub = data.warnings.some((w) => w.source === 'HUB_LIMITATION');
            const hasDevice = data.warnings.some((w) => w.source === 'DEVICE_LIMITATION');

            const healthyCount = data.classifiedDevices.filter(
              (d) => !d.isInternal &&
                (d.status === 'OPTIMAL' || d.status === 'ADEQUATE' || d.status === 'NORMAL')
            ).length
            const limitedCount = data.warnings.filter((w) => w.source === 'DEVICE_LIMITATION').length
            const hubCount = data.warnings.filter((w) => w.source === 'HUB_LIMITATION').length
            const systemCount = data.warnings.filter((w) => w.source === 'SYSTEM_LIMITATION').length
            const totalExternal = data.classifiedDevices.filter((d) => !d.isInternal).length
            const totalInternal = data.classifiedDevices.filter((d) => d.isInternal).length

            const externalDevices = data.classifiedDevices.filter((d) => !d.isInternal)
            const allLowTier = externalDevices.length > 0 && externalDevices.every((d) => d.tier === 'LOW')
            const hasHighTier = externalDevices.some((d) => d.tier === 'HIGH')
            const insight: string | null = data.warnings.length === 0
              ? allLowTier
                ? 'Your connected devices are all low-bandwidth by design. They work correctly on any USB port.'
                : hasHighTier
                  ? 'Your high-bandwidth devices are connected correctly and running at their available speed.'
                  : 'All devices are operating at expected performance for their type.'
              : null

            if (hasSystem) {
              systemHealth = 'bottleneck';
              statusTitle = 'Controller Load Is High';
              statusSubtext = 'Your USB controller is handling significant traffic. Consider disconnecting unused devices.';
            } else if (hasHub || hasDevice) {
              systemHealth = 'limited';
              statusTitle = 'One or More Devices Are Speed-Limited';
              statusSubtext = hasHub
                ? 'A high-bandwidth device is sharing its connection via a hub. Connecting it directly may improve speeds.'
                : 'A storage or capture device is running at USB 2.0 speed and would benefit from a USB 3.x port.';
            }

            return (
              <div className="app-dashboard">
                <div className={`dash-status-strip status-${systemHealth}`}>
                  <span className={`dash-status-dot status-${systemHealth}`} />
                  <span className="dash-status-title">{statusTitle}</span>
                  <span className="dash-status-subtext">{statusSubtext}</span>
                  <div className="dash-status-stats">
                    <div className="dash-stat">
                      <span className="dash-stat-value">{totalExternal}</span>
                      <span className="dash-stat-label">External</span>
                    </div>
                    <div className="dash-stat">
                      <span className="dash-stat-value">{totalInternal}</span>
                      <span className="dash-stat-label">Built-in</span>
                    </div>
                    <div className="dash-stat">
                      <span className="dash-stat-value val-green">{healthyCount}</span>
                      <span className="dash-stat-label">Healthy</span>
                    </div>
                    <div className="dash-stat">
                      <span className={`dash-stat-value ${limitedCount > 0 ? 'val-amber' : 'val-green'}`}>{limitedCount}</span>
                      <span className="dash-stat-label">Limited</span>
                    </div>
                    <div className="dash-stat">
                      <span className={`dash-stat-value ${hubCount > 0 ? 'val-amber' : 'val-green'}`}>{hubCount}</span>
                      <span className="dash-stat-label">Hub</span>
                    </div>
                    <div className="dash-stat">
                      <span className={`dash-stat-value ${systemCount > 0 ? 'val-red' : 'val-green'}`}>{systemCount}</span>
                      <span className="dash-stat-label">Controller</span>
                    </div>
                  </div>
                </div>

                <div className="dash-3col">
                  <aside className="dash-col-left">
                    <ErrorBoundary><SystemInfoCard info={data.systemInfo} /></ErrorBoundary>
                  </aside>

                  <section className="dash-col-center">
                    <ErrorBoundary><TopologyTree tree={data.tree} warnings={data.warnings} onSelectDevice={setSelectedDevice} /></ErrorBoundary>
                  </section>

                  <aside className="dash-col-right">
                    <ErrorBoundary><WarningsPanel warnings={data.warnings} insight={insight} /></ErrorBoundary>
                    <ErrorBoundary><RecommendationsPanel recommendations={data.recommendations} /></ErrorBoundary>
                  </aside>
                </div>
              </div>
            )
          })()
        )}
      </main>

      {/* ── Toast ── */}
      {toast && <div className="app-toast">{toast}</div>}

      {/* ── About modal ── */}
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* ── Device detail modal (click a row) ── */}
      <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />

      {/* ── Diagnostics modal ── */}
      <DiagnosticsModal
        open={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        devices={data?.classifiedDevices || []}
      />
    </div>
  )
}
