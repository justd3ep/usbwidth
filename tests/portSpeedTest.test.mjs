// portSpeedTest.test.mjs — verify the port speed estimator produces
// sensible bottleneck classifications and realistic MB/s figures.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimatePortSpeed } from '../src/utils/portSpeedTest.js'

test('matched port + device (USB 3.0, 5 Gbps) reports no bottleneck', () => {
    const r = estimatePortSpeed({ speedMbps: 5000, portCapabilityMbps: 5000 })
    assert.equal(r.bottleneck, 'none')
    assert.equal(r.efficiency, 1)
    assert.ok(r.actualMBps > 0)
})

test('port-caps-device bottleneck is reported', () => {
    const r = estimatePortSpeed({ speedMbps: 480, portCapabilityMbps: 5000 })
    assert.equal(r.bottleneck, 'port')
    assert.ok(r.efficiency < 0.2)
})

test('device-bottleneck is reported (running below port cap)', () => {
    const r = estimatePortSpeed({ speedMbps: 5000, portCapabilityMbps: 40000 })
    assert.equal(r.bottleneck, 'device')
})

test('realistic MB/s is 80% of nominal speed / 8', () => {
    const r = estimatePortSpeed({ speedMbps: 5000, portCapabilityMbps: 5000 })
    // 5000 * 0.8 / 8 = 500
    assert.equal(r.actualMBps, 500)
})

test('no speed data at all returns null-safe values', () => {
    const r = estimatePortSpeed({})
    assert.equal(r.portCapMbps, null)
    assert.equal(r.deviceActualMbps, null)
    assert.equal(r.bottleneck, 'none')
    assert.equal(r.efficiency, 0)
})

test('portCap only: produces a sensible summary', () => {
    const r = estimatePortSpeed({ portCapabilityMbps: 5000 })
    assert.match(r.summary, /5000 Mbps/)
    assert.equal(r.bottleneck, 'none')
})
