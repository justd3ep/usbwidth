import React from 'react'
import './SystemInfoCard.css'

interface Props {
  info: Record<string, any>
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
      <div className="sic-capabilities">
        <h3>Detected Hardware Capabilities</h3>
        <ul>
          {info.usbCapabilities ? (
            info.usbCapabilities.map((cap: string, i: number) => (
              <li key={i}>{cap}</li>
            ))
          ) : (
            <li>Analyzing system hardware...</li>
          )}
        </ul>
        <p>Multiple high-bandwidth devices can share these bounds simultaneously.</p>
      </div>
    </div>
  )
}
