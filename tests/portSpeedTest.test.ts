// portSpeedTest.test.ts — verify the port speed estimator produces
// sensible bottleneck classifications and realistic MB/s figures.

import { describe, it, expect } from 'vitest'
import { estimatePortSpeed } from '../src/utils/portSpeedTest'

describe('estimatePortSpeed', () => {
    it('matched port + device (USB 3.0, 5 Gbps) reports no bottleneck', () => {
        const r = estimatePortSpeed({ speedMbps: 5000, portCapabilityMbps: 5000 })
        expect(r.bottleneck).toBe('none')
        expect(r.efficiency).toBe(1)
        expect(r.actualMBps).toBeGreaterThan(0)
    })

    it('port-caps-device bottleneck is reported', () => {
        const r = estimatePortSpeed({ speedMbps: 480, portCapabilityMbps: 5000 })
        expect(r.bottleneck).toBe('port')
        expect(r.efficiency).toBeLessThan(0.2)
    })

    it('device-bottleneck is reported (running below port cap)', () => {
        const r = estimatePortSpeed({ speedMbps: 5000, portCapabilityMbps: 40000 })
        expect(r.bottleneck).toBe('device')
    })

    it('realistic MB/s is 80% of nominal speed / 8', () => {
        const r = estimatePortSpeed({ speedMbps: 5000, portCapabilityMbps: 5000 })
        // 5000 * 0.8 / 8 = 500
        expect(r.actualMBps).toBe(500)
    })

    it('no speed data at all returns null-safe values', () => {
        const r = estimatePortSpeed({})
        expect(r.portCapMbps).toBeNull()
        expect(r.deviceActualMbps).toBeNull()
        expect(r.bottleneck).toBe('none')
        expect(r.efficiency).toBe(0)
    })

    it('portCap only produces a sensible summary', () => {
        const r = estimatePortSpeed({ portCapabilityMbps: 5000 })
        expect(r.summary).toMatch(/5000 Mbps/)
        expect(r.bottleneck).toBe('none')
    })
})
