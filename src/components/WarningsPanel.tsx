import { useState } from 'react'
import './WarningsPanel.css'

const SEVERITY_META: Record<string, { label: string; icon: string; cls: string }> = {
  critical: { label: 'WARNING', icon: '❌', cls: 'sev-critical' },
  warning:  { label: 'LIMITED', icon: '⚠️', cls: 'sev-warning' },
}

interface Warning {
  id: string
  severity: 'critical' | 'warning'
  status: string
  title: string
  detail: string
  affectedIds: string[]
  deviceName: string
  source?: string
  portCapability?: number
  deviceCapability?: number
  connectionPath?: string
  verdict?: string
}

interface Props {
  warnings: Warning[]
}

function WarningCard({ warning }: { warning: Warning }) {
  const [open, setOpen] = useState(false)
  const meta = SEVERITY_META[warning.severity] || SEVERITY_META.warning

  return (
    <div className={`wc-card ${meta.cls}`}>
      <div className="wc-header" onClick={() => setOpen(o => !o)}>
        <span className="wc-sev-icon">{meta.icon}</span>
        <div className="wc-main">
          <span className="wc-deviceName">{warning.deviceName}</span>
          <span className="wc-title">→ {warning.title}</span>
        </div>
        <span className="wc-chevron">{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div className="wc-body">
          <p className="wc-detail-text">{warning.detail}</p>
          
          <div className="wc-metrics-grid">
            <div className="wc-metric">
              <span className="wc-metric-label">Port Capability</span>
              <span className="wc-metric-value">{warning.portCapability ? (warning.portCapability >= 5000 ? `USB 3.x (${warning.portCapability / 1000} Gbps)` : `USB 2.0 (${warning.portCapability} Mbps)`) : 'Unknown'}</span>
            </div>
            <div className="wc-metric">
              <span className="wc-metric-label">Device Capability</span>
              <span className="wc-metric-value">{warning.deviceCapability ? (warning.deviceCapability >= 5000 ? `USB 3.x (${warning.deviceCapability / 1000} Gbps)` : `USB 2.0 (${warning.deviceCapability} Mbps)`) : 'Unknown'}</span>
            </div>
            <div className="wc-metric">
              <span className="wc-metric-label">Connection Path</span>
              <span className="wc-metric-value">{warning.connectionPath || 'Direct'}</span>
            </div>
          </div>
          
          <div className="wc-verdict">
            <span>{warning.verdict || 'Bottleneck Source: UNKNOWN'}</span>
          </div>

          <div className="wc-affected">
            <span className="wc-aff-label">Sysfs ID:</span>
            {warning.affectedIds.map(id => (
              <code key={id} className="wc-aff-id" title={`Sysfs Path: ${id}`}>
                {id.split('\\').pop()}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WarningsPanel({ warnings }: Props) {
  const critCount = warnings.filter(w => w.severity === 'critical').length
  const warnCount = warnings.filter(w => w.severity === 'warning').length

  return (
    <div className="wp-container">
      <div className="wp-header">
        <h2 className="wp-title"><span>⚠️</span> Bottlenecks & Limitations</h2>
        <div className="wp-counts">
          {critCount > 0 && <span className="wc-pill sev-critical">{critCount} warning</span>}
          {warnCount > 0 && <span className="wc-pill sev-warning">{warnCount} limited</span>}
          {warnings.length === 0 && <span className="wc-pill sev-ok">✓ All clear</span>}
        </div>
      </div>

      <div className="wp-list">
        {warnings.length === 0 ? (
          <div className="wp-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <span className="wp-empty-icon" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>✅</span>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Everything looks good</h3>
            <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>No performance issues detected. Your setup is optimal, and no changes are needed.</p>
          </div>
        ) : (
          warnings.map(w => <WarningCard key={w.id} warning={w} />)
        )}
      </div>
    </div>
  )
}
