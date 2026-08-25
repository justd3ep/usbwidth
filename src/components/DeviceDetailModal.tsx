import { useEffect } from 'react'
import type { UsbNode } from '../types/usb'
import './DeviceDetailModal.css'

interface Props {
    device: UsbNode | null
    onClose: () => void
}

function fmtSpeed(mbps: number | null | undefined) {
    if (!mbps && mbps !== 0) return 'unknown'
    if (mbps === 1.5) return 'USB 1.0'
    if (mbps === 12) return 'USB 1.1'
    if (mbps === 480) return 'USB 2.0'
    if (mbps === 5000) return 'USB 3.0 (5 Gbps)'
    if (mbps === 10000) return 'USB 3.1 (10 Gbps)'
    if (mbps === 20000) return 'USB 3.2 (20 Gbps)'
    if (mbps === 40000) return 'USB4 / Thunderbolt (40 Gbps)'
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(0)} Gbps`
    return `${mbps} Mbps`
}

function vidLookupUrl(vid: string) {
    return `https://www.the-sz.com/products/usbid/index.php?v=${vid}`
}

export default function DeviceDetailModal({ device, onClose }: Props) {
    useEffect(() => {
        if (!device) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [device, onClose])

    if (!device) return null

    const portCap = device.portCapabilityMbps ?? null
    const bottleneck = portCap && device.speedMbps && portCap >= 5000 && device.speedMbps <= 480

    return (
        <div className="ddm-overlay" onClick={onClose}>
            <div className="ddm-modal" onClick={e => e.stopPropagation()}>
                <div className="ddm-header">
                    <div>
                        <h2 className="ddm-title">{device.name || 'Unknown Device'}</h2>
                        <p className="ddm-subtitle">{device.type}{device.class ? ` · ${device.class}` : ''}</p>
                    </div>
                    <button className="ddm-close" onClick={onClose} aria-label="Close">×</button>
                </div>

                <div className="ddm-body">
                    <section className="ddm-section">
                        <h3>Identity</h3>
                        <div className="ddm-grid">
                            <div className="ddm-row">
                                <span className="ddm-key">VID:PID</span>
                                <span className="ddm-val mono">
                                    {device.idVendor ? `${device.idVendor}:${device.idProduct}` : '—'}
                                </span>
                                {device.idVendor && (
                                    <button
                                        className="ddm-link"
                                        onClick={() => window.api?.openExternal(vidLookupUrl(device.idVendor!))}
                                    >
                                        Lookup
                                    </button>
                                )}
                            </div>
                            <div className="ddm-row">
                                <span className="ddm-key">Instance</span>
                                <span className="ddm-val mono">{device.instanceId}</span>
                            </div>
                            <div className="ddm-row">
                                <span className="ddm-key">Location</span>
                                <span className="ddm-val mono">{device.locationPath || '—'}</span>
                            </div>
                            <div className="ddm-row">
                                <span className="ddm-key">Origin</span>
                                <span className="ddm-val">{device.isInternal ? 'Built-in' : 'External (you plugged this in)'}</span>
                            </div>
                        </div>
                    </section>

                    <section className="ddm-section">
                        <h3>Performance</h3>
                        <div className="ddm-grid">
                            <div className="ddm-row">
                                <span className="ddm-key">Tier</span>
                                <span className={`ddm-badge tier-${(device.tier || 'unknown').toLowerCase()}`}>{device.tier || '—'}</span>
                            </div>
                            <div className="ddm-row">
                                <span className="ddm-key">Status</span>
                                <span className={`ddm-badge status-${(device.status || 'unknown').toLowerCase()}`}>{device.status || '—'}</span>
                            </div>
                            <div className="ddm-row">
                                <span className="ddm-key">Actual speed</span>
                                <span className="ddm-val">{fmtSpeed(device.speedMbps)}</span>
                            </div>
                            <div className="ddm-row">
                                <span className="ddm-key">Port capability</span>
                                <span className={`ddm-val ${bottleneck ? 'ddm-val-warn' : ''}`}>
                                    {fmtSpeed(portCap)}
                                    {bottleneck && ' ⚠ bottleneck'}
                                </span>
                            </div>
                            <div className="ddm-row">
                                <span className="ddm-key">bcdUSB</span>
                                <span className="ddm-val mono">{device.bcdUsb ? device.bcdUsb.toFixed(2) : '—'}</span>
                            </div>
                            <div className="ddm-row">
                                <span className="ddm-key">Path</span>
                                <span className="ddm-val">{device.viaHub ? 'Via hub' : 'Direct to controller'}</span>
                            </div>
                        </div>
                        {device.statusMessage && (
                            <p className="ddm-note">{device.statusMessage}</p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    )
}
