import { useState } from 'react'
import type { UsbWarning } from '../types/usb'
import './WarningsPanel.css'

const SEVERITY_META: Record<string, { label: string; cls: string }> = {
  critical: { label: 'Issue', cls: 'sev-critical' },
  warning: { label: 'Note', cls: 'sev-warning' },
}

interface Props {
  warnings: UsbWarning[]
  insight?: string | null
}

function WarningCard({ warning }: { warning: UsbWarning }) {
  const [open, setOpen] = useState(false)
  const meta = SEVERITY_META[warning.severity] || SEVERITY_META.warning

  return (
    <div className={`wc-card ${meta.cls}`}>
      <div className="wc-header" onClick={() => setOpen(o => !o)}>
        <span className={`wc-sev-tag ${meta.cls}`}>{meta.label}</span>
        <div className="wc-main">
          <span className="wc-deviceName">{warning.deviceName}</span>
          <span className="wc-title">{warning.title}</span>
        </div>
        <span className="wc-chevron">{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div className="wc-body">
          <p className="wc-detail-text">{warning.detail}</p>

          <div className="wc-metrics-grid">
            <div className="wc-metric">
              <span className="wc-metric-label" title="The maximum speed your port can support">Port Max</span>
              <span className="wc-metric-value">{warning.portCapability ? (warning.portCapability >= 5000 ? `USB 3.x — ${warning.portCapability / 1000} Gbps` : `USB 2.0`) : '—'}</span>
            </div>
            <div className="wc-metric">
              <span className="wc-metric-label" title="The maximum speed this device is capable of">Device Max</span>
              <span className="wc-metric-value">{warning.deviceCapability ? (warning.deviceCapability >= 5000 ? `USB 3.x — ${warning.deviceCapability / 1000} Gbps` : `USB 2.0`) : '—'}</span>
            </div>
            <div className="wc-metric">
              <span className="wc-metric-label">Connection</span>
              <span className="wc-metric-value">{warning.connectionPath === 'Via Hub' ? 'Through hub' : 'Direct'}</span>
            </div>
          </div>

          <div className="wc-verdict">
            <span>{warning.source === 'DEVICE_LIMITATION'
              ? 'Expected behavior. The device operates at USB 2.0 speed by design — your computer is not a factor.'
              : warning.source === 'HUB_LIMITATION'
                ? 'Normal. Sharing a hub works fine for most everyday devices.'
                : 'May indicate a real performance issue with the USB controller. Consider reducing active high-speed devices.'}
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
        <h2 className="wp-title">Connection Notes</h2>
        <div className="wp-counts">
          {critCount > 0 && <span className="wc-pill sev-critical">{critCount}</span>}
          {warnCount > 0 && <span className="wc-pill sev-warning">{warnCount}</span>}
          {warnings.length === 0 && <span className="wc-pill sev-ok">OK</span>}
        </div>
      </div>

      <div className="wp-list">
        {warnings.length === 0 ? (
          <div className="wp-empty">
            <h3>All good</h3>
            <p>All devices are running at their best available speed for their type.</p>
            {insight && <p className="wp-insight">{insight}</p>}
          </div>
        ) : (
          warnings.map(w => <WarningCard key={w.id} warning={w} />)
        )}
      </div>
    </div>
  )
}
