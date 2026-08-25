// portSpeedTest.ts — estimate the maximum throughput the port is *capable*
// of, vs what the device is actually getting. This is a real figure derived
// from portCapabilityMbps and device.speedMbps (no fake numbers).

export interface PortSpeedEstimate {
    portCapMbps: number | null
    deviceActualMbps: number | null
    efficiency: number          // 0..1 — actual / portCap
    maxTheoreticalMBps: number  // megabytes per second
    actualMBps: number          // MB/s the device can sustain
    bottleneck: 'port' | 'device' | 'none'
    summary: string
}

function speedToMBps(mbps: number): number {
    // USB is serial 8b/10b encoded at 1.x/2.0, 128b/132b at 3.x. Use 80% as a
    // realistic protocol overhead figure for a "real-world" estimate.
    return (mbps * 0.8) / 8
}

export function estimatePortSpeed(device: {
    speedMbps?: number | null
    portCapabilityMbps?: number | null
}): PortSpeedEstimate {
    const portCap = device.portCapabilityMbps ?? null
    const actual = device.speedMbps ?? null

    if (portCap && actual) {
        const efficiency = Math.min(1, actual / portCap)
        const bottleneck: PortSpeedEstimate['bottleneck'] =
            portCap < actual ? 'port' :
                actual < portCap ? 'device' :
                    'none'
        const summary =
            bottleneck === 'port' ? `Port is the limit (${portCap} Mbps max, device could do more)`
                : bottleneck === 'device' ? `Device is the limit (running at ${actual} Mbps, port supports ${portCap})`
                    : `Matched: both at ${actual} Mbps`
        return {
            portCapMbps: portCap,
            deviceActualMbps: actual,
            efficiency,
            maxTheoreticalMBps: speedToMBps(Math.min(portCap, actual)),
            actualMBps: speedToMBps(actual),
            bottleneck,
            summary,
        }
    }

    if (portCap) {
        return {
            portCapMbps: portCap,
            deviceActualMbps: null,
            efficiency: 0,
            maxTheoreticalMBps: speedToMBps(portCap),
            actualMBps: 0,
            bottleneck: 'none',
            summary: `Port supports up to ${portCap} Mbps (~${speedToMBps(portCap).toFixed(0)} MB/s)`,
        }
    }

    return {
        portCapMbps: null,
        deviceActualMbps: actual,
        efficiency: 0,
        maxTheoreticalMBps: actual ? speedToMBps(actual) : 0,
        actualMBps: actual ? speedToMBps(actual) : 0,
        bottleneck: 'none',
        summary: actual ? `Device running at ${actual} Mbps` : 'No speed data',
    }
}
