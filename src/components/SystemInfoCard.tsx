import React from 'react'
import type { SystemInfo } from '../types/usb'
import './SystemInfoCard.css'

interface Props {
  info: SystemInfo
}

const LABELS: Record<keyof SystemInfo, string> = {
  manufacturer: 'Manufacturer',
  model: 'Model',
  cpu: 'CPU',
  os: 'OS',
  totalRam: 'RAM',
  biosVersion: 'BIOS',
  usbCapabilities: 'USB Capabilities',
}

type LabelKey = Exclude<keyof SystemInfo, 'usbCapabilities'>

export default function SystemInfoCard({ info }: Props) {
  const entries = (Object.entries(LABELS) as [LabelKey, string][])
    .filter(([k]) => info[k])
  const caps: string[] = info.usbCapabilities || []

  return (
    <div className="sic-card">
      <div className="sic-header">
        <h2 className="sic-title">System</h2>
      </div>
      <div className="sic-list">
        {entries.map(([key, label]) => {
          const value = info[key]
          const str = typeof value === 'string' ? value : String(value ?? '')
          return (
            <div className="sic-row" key={key}>
              <span className="sic-label">{label}</span>
              <span className="sic-value" title={str}>{str}</span>
            </div>
          )
        })}
      </div>

      {caps.length > 0 && (
        <div className="sic-caps">
          <span className="sic-caps-title">USB Capabilities</span>
          <ul className="sic-caps-list">
            {caps.map((cap, i) => (
              <li key={i}>{cap}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
