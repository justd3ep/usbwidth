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
          <li>USB 3.0 (5 Gbps) — Fast transfers for drives and cameras</li>
          <li>USB 3.1 Gen 2 (10 Gbps) — High-speed for SSDs and capture cards</li>
          <li>USB 3.2 Gen 2x2 (20 Gbps) — Ultra-fast for demanding devices</li>
          <li>Thunderbolt / USB-C — For monitors, docks, and eGPUs</li>
        </ul>
        <p style={{ margin: '0.5rem 0 0 0', fontWeight: 500, color: 'var(--text-color)' }}>
          Multiple high-bandwidth devices can be used simultaneously.
        </p>
      </div>
    </div>
  )
}
