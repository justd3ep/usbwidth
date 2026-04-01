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
          <span className="wc-title">{warning.title}</span>
          <span className="wc-device">{warning.deviceName}</span>
        </div>
        <span className="wc-chevron">{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div className="wc-detail">
          <p>{warning.detail}</p>
          <div className="wc-affected">
            <span className="wc-aff-label">USB Port(s):</span>
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
          <div className="wp-empty">
            <span className="wp-empty-icon">✅</span>
            <p>No bottlenecks detected. Your USB topology looks healthy.</p>
          </div>
        ) : (
          warnings.map(w => <WarningCard key={w.id} warning={w} />)
        )}
      </div>
    </div>
  )
}
