import React from 'react'
import './SystemInfoCard.css'

interface Props {
  info: Record<string, string>
}

const LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  model: 'Model',
  cpu: 'CPU',
  os: 'OS',
  totalRam: 'RAM',
  biosVersion: 'BIOS',
}

export default function SystemInfoCard({ info }: Props) {
  return (
    <div className="sic-card">
      <div className="sic-header">
        <span className="sic-icon">💻</span>
        <h2 className="sic-title">System Info</h2>
      </div>
      <div className="sic-grid">
        {Object.entries(LABELS).map(([key, label]) =>
          info[key] ? (
            <React.Fragment key={key}>
              <span className="sic-label">{label}</span>
              <span className="sic-value">{info[key]}</span>
            </React.Fragment>
          ) : null
        )}
      </div>
      <div className="sic-capabilities" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--text-color)' }}>System Capabilities</h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-muted)' }}>
          <li>Supports high-speed USB 3.x connections</li>
          <li>Thunderbolt / USB-C architecture enabled</li>
        </ul>
        <p style={{ margin: '0.5rem 0 0 0', fontWeight: 500, color: 'var(--text-color)' }}>
          💡 Multiple high-bandwidth devices can be used simultaneously.
        </p>
      </div>
    </div>
  )
}
