import { useState } from 'react'
import './WarningsPanel.css'

const SEVERITY_META: Record<string, { label: string; icon: string; cls: string }> = {
  critical: { label: 'SYSTEM ISSUE', icon: '!', cls: 'sev-critical' },
  warning:  { label: 'NOTE',         icon: '›', cls: 'sev-warning' },
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
  insight?: string | null
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
              <span className="wc-metric-label" title="The maximum speed your port can support">Port Max Speed</span>
              <span className="wc-metric-value">{warning.portCapability ? (warning.portCapability >= 5000 ? `Fast (USB 3.x — ${warning.portCapability / 1000} Gbps)` : `Standard (USB 2.0)`) : '—'}</span>
            </div>
            <div className="wc-metric">
              <span className="wc-metric-label" title="The maximum speed this device is capable of">Device Max Speed</span>
              <span className="wc-metric-value">{warning.deviceCapability ? (warning.deviceCapability >= 5000 ? `Fast (USB 3.x — ${warning.deviceCapability / 1000} Gbps)` : `Standard (USB 2.0)`) : '—'}</span>
            </div>
            <div className="wc-metric">
              <span className="wc-metric-label">How It's Connected</span>
              <span className="wc-metric-value">{warning.connectionPath === 'Via Hub' ? 'Through a USB hub' : 'Direct to computer'}</span>
            </div>
          </div>

          <div className="wc-verdict">
            <span>{warning.source === 'DEVICE_LIMITATION'
              ? 'This is expected behavior. The device operates at USB 2.0 speed by design — your computer is not a factor.'
              : warning.source === 'HUB_LIMITATION'
              ? 'This is normal. Sharing a hub connection works fine for most everyday devices.'
              : 'This may indicate a real performance issue with the USB controller. Consider reducing the number of active high-speed devices.'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WarningsPanel({ warnings, insight }: Props) {
  const critCount = warnings.filter(w => w.severity === 'critical').length
  const warnCount = warnings.filter(w => w.severity === 'warning').length

  return (
    <div className="wp-container">
      <div className="wp-header">
        <h2 className="wp-title"><span>🔍</span> Connection Notes</h2>
        <div className="wp-counts">
          {critCount > 0 && <span className="wc-pill sev-critical">{critCount} issue{critCount !== 1 ? 's' : ''}</span>}
          {warnCount > 0 && <span className="wc-pill sev-warning">{warnCount} note{warnCount !== 1 ? 's' : ''}</span>}
          {warnings.length === 0 && <span className="wc-pill sev-ok">✓ All good</span>}
        </div>
      </div>

      <div className="wp-list">
        {warnings.length === 0 ? (
          <div className="wp-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Everything is working as expected</h3>
            <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-secondary)' }}>All devices are running at their best available speed for their type.</p>
            {insight && (
              <p style={{ margin: '0.85rem auto 0', maxWidth: '34rem', padding: '0.6rem 1rem', borderRadius: '6px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                {insight}
              </p>
            )}
          </div>
        ) : (
          warnings.map(w => <WarningCard key={w.id} warning={w} />)
        )}
      </div>
    </div>
  )
}
