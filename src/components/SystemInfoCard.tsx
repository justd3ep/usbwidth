import React from 'react'
import './SystemInfoCard.css'

interface Props {
  info: Record<string, string>
  isMock: boolean
}

const LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  model: 'Model',
  cpu: 'CPU',
  os: 'OS',
  totalRam: 'RAM',
  biosVersion: 'BIOS',
}

export default function SystemInfoCard({ info, isMock }: Props) {
  return (
    <div className="sic-card">
      <div className="sic-header">
        <span className="sic-icon">💻</span>
        <h2 className="sic-title">System Info</h2>
        {isMock && (
          <span className="sic-mock-badge" title="Running with simulated data — real sysfs data available on Linux">
            DEMO DATA
          </span>
        )}
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
    </div>
  )
}
