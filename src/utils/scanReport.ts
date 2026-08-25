import type { SystemInfo, UsbNode, UsbWarning, UsbRecommendation, TopologyData } from '../types/usb'

type ScanReportInput = Pick<TopologyData, 'tree' | 'classifiedDevices' | 'warnings' | 'recommendations' | 'platform'> & {
    systemInfo: SystemInfo
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

function renderTree(nodes: UsbNode[], depth = 0): string[] {
    const lines: string[] = []
    for (const n of nodes) {
        const indent = '  '.repeat(depth)
        const tag = n.isInternal ? '[built-in]' : '[external]'
        const speed = n.speedMbps != null ? ` @ ${fmtSpeed(n.speedMbps)}` : ''
        const vid = n.idVendor ? ` (${n.idVendor}:${n.idProduct})` : ''
        lines.push(`${indent}${n.type}${vid} — ${n.name || 'Unknown'}${speed} ${tag}`)
        if (n.children?.length) {
            lines.push(...renderTree(n.children, depth + 1))
        }
    }
    return lines
}

export function buildTextReport(scan: ScanReportInput): string {
    const ts = new Date().toISOString()
    const lines: string[] = []
    lines.push('usbWidth scan report')
    lines.push('Generated: ' + ts)
    lines.push('Platform:  ' + scan.platform)
    lines.push('')

    lines.push('── System ──────────────────────────────────────────')
    for (const [k, v] of Object.entries(scan.systemInfo || {})) {
        if (v) lines.push(`  ${k.padEnd(14)}: ${v}`)
    }
    if (scan.systemInfo?.usbCapabilities?.length) {
        lines.push('  USB caps    :')
        for (const c of scan.systemInfo.usbCapabilities) lines.push('    - ' + c)
    }
    lines.push('')

    lines.push('── USB Topology ────────────────────────────────────')
    if (!scan.tree.length) {
        lines.push('  (no devices)')
    } else {
        lines.push(...renderTree(scan.tree))
    }
    lines.push('')

    lines.push('── Devices (' + scan.classifiedDevices.length + ') ─────────────────────')
    for (const d of scan.classifiedDevices) {
        const speed = d.speedMbps != null ? fmtSpeed(d.speedMbps) : 'unknown'
        const port = d.portCapabilityMbps != null ? fmtSpeed(d.portCapabilityMbps) : '—'
        lines.push(`  ${d.name || 'Unknown'}`)
        lines.push(`    type=${d.type || '?'}  tier=${d.tier || '?'}  status=${d.status || '?'}`)
        lines.push(`    speed=${speed}  port-cap=${port}  via-hub=${d.viaHub ? 'yes' : 'no'}`)
        if (d.statusMessage) lines.push(`    note: ${d.statusMessage}`)
    }
    lines.push('')

    lines.push('── Warnings (' + scan.warnings.length + ') ──────────────────────')
    if (scan.warnings.length === 0) {
        lines.push('  (none)')
    } else {
        for (const w of scan.warnings) {
            lines.push(`  [${w.severity}] ${w.deviceName}: ${w.title}`)
            if (w.detail) lines.push('    ' + w.detail)
        }
    }
    lines.push('')

    lines.push('── Recommendations (' + scan.recommendations.length + ') ──────────')
    if (scan.recommendations.length === 0) {
        lines.push('  (none)')
    } else {
        for (const r of scan.recommendations) {
            lines.push(`  [${r.priorityTag}] ${r.title}`)
            for (const s of r.steps) lines.push('    - ' + s)
        }
    }
    lines.push('')

    return lines.join('\n')
}

export function buildJsonReport(scan: ScanReportInput): string {
    return JSON.stringify(
        {
            ...scan,
            generatedAt: new Date().toISOString(),
            appVersion: '1.0.5',
        },
        null,
        2
    )
}
