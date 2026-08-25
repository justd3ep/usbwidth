import { useEffect, useMemo } from 'react'
import type { UsbNode } from '../types/usb'
import { checkSecurity, type SecurityFinding } from '../utils/securityCheck'
import { estimatePortSpeed, type PortSpeedEstimate } from '../utils/portSpeedTest'
import './DiagnosticsModal.css'

interface Props {
    open: boolean
    onClose: () => void
    devices: UsbNode[]
}

function fmtSpeed(mbps: number | null | undefined) {
    if (!mbps && mbps !== 0) return '—'
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(0)} Gbps`
    return `${mbps} Mbps`
}

export default function DiagnosticsModal({ open, onClose, devices }: Props) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    const findings: SecurityFinding[] = useMemo(
        () => open ? checkSecurity(devices) : [],
        [open, devices]
    )

    // Port speed for the top HIGH-tier external device (or first device with a port cap)
    const featuredSpeed: { device: UsbNode; estimate: PortSpeedEstimate } | null = useMemo(() => {
        if (!open) return null
        const candidate =
            devices.find((d) => !d.isInternal && d.tier === 'HIGH' && d.speedMbps) ||
            devices.find((d) => !d.isInternal && d.speedMbps) ||
            null
        if (!candidate) return null
        return { device: candidate, estimate: estimatePortSpeed(candidate) }
    }, [open, devices])

    if (!open) return null

    return (
        <div className="dm-overlay" onClick={onClose}>
            <div className="dm-modal" onClick={e => e.stopPropagation()}>
                <div className="dm-header">
                    <div>
                        <h2 className="dm-title">Diagnostics</h2>
                        <p className="dm-sub">Security check + port speed estimate</p>
                    </div>
                    <button className="dm-close" onClick={onClose} aria-label="Close">×</button>
                </div>

                <div className="dm-body">
                    {/* ── Security findings ── */}
                    <section className="dm-section">
                        <h3>Security findings <span className="dm-count">{findings.length}</span></h3>
                        {findings.length === 0 ? (
                            <div className="dm-ok">
                                No suspicious devices detected. Every connected device has a known vendor or is built into your computer.
                            </div>
                        ) : (
                            <ul className="dm-findings">
                                {findings.map(f => (
                                    <li key={f.instanceId} className={`dm-finding dm-finding-${f.severity}`}>
                                        <div className="dm-finding-head">
                                            <span className={`dm-sev sev-${f.severity}`}>{f.severity.toUpperCase()}</span>
                                            <span className="dm-finding-name">{f.name}</span>
                                        </div>
                                        <p className="dm-finding-reason">{f.reason}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* ── Port speed test ── */}
                    <section className="dm-section">
                        <h3>Port speed estimate</h3>
                        {!featuredSpeed ? (
                            <div className="dm-ok">No external devices with speed data yet.</div>
                        ) : (
                            <div className="dm-speed">
                                <div className="dm-speed-head">
                                    <span className="dm-speed-name">{featuredSpeed.device.name}</span>
                                </div>
                                <div className="dm-speed-grid">
                                    <div className="dm-speed-row">
                                        <span className="dm-speed-key">Port max</span>
                                        <span className="dm-speed-val">{fmtSpeed(featuredSpeed.estimate.portCapMbps)}</span>
                                    </div>
                                    <div className="dm-speed-row">
                                        <span className="dm-speed-key">Device actual</span>
                                        <span className="dm-speed-val">{fmtSpeed(featuredSpeed.estimate.deviceActualMbps)}</span>
                                    </div>
                                    <div className="dm-speed-row">
                                        <span className="dm-speed-key">Realistic throughput</span>
                                        <span className="dm-speed-val">~{featuredSpeed.estimate.actualMBps.toFixed(1)} MB/s</span>
                                    </div>
                                    <div className="dm-speed-row">
                                        <span className="dm-speed-key">Bottleneck</span>
                                        <span className={`dm-speed-val dm-bn-${featuredSpeed.estimate.bottleneck}`}>
                                            {featuredSpeed.estimate.bottleneck === 'port' ? 'Port' :
                                                featuredSpeed.estimate.bottleneck === 'device' ? 'Device' : 'None'}
                                        </span>
                                    </div>
                                </div>
                                <p className="dm-speed-summary">{featuredSpeed.estimate.summary}</p>
                            </div>
                        )}
                        <p className="dm-foot">
                            These are theoretical estimates based on the negotiated link speed. A real bulk-transfer test would require driver-level access and is not safe to run from userspace.
                        </p>
                    </section>

                    {/* ── Placeholder for future ── */}
                    <section className="dm-section">
                        <h3>Live bandwidth monitor</h3>
                        <div className="dm-ok">Coming soon. Requires driver-level throughput counters (Windows ETW or Linux usbmon), which can't be safely invoked from the renderer.</div>
                    </section>
                </div>
            </div>
        </div>
    )
}
