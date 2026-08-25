// ruleEngine.test.ts — verify the rule engine produces correct status/source
// for representative device scenarios. Run with: npx vitest run

import { describe, it, expect } from 'vitest'
import { TIER, STATUS, SAFE_PROFILES } from '../electron/classifier.js'
import { runRules } from '../electron/ruleEngine.js'

function makeDevice(overrides: Partial<any> = {}) {
    return {
        instanceId: 'dev-1',
        name: 'Generic Device',
        type: 'USBDevice',
        isInternal: false,
        viaHub: false,
        speedMbps: null,
        bcdUsb: null,
        profileKey: 'unknown',
        profileLabel: 'USB Device',
        tier: TIER.MEDIUM,
        status: null,
        statusMessage: '',
        parentId: null,
        ...overrides,
    }
}

describe('ruleEngine', () => {
    it('safe-profile audio device on USB 2.0 port is ADEQUATE (never flagged)', () => {
        const devices = [makeDevice({
            name: 'USB Audio Device',
            profileKey: 'audio',
            tier: TIER.LOW,
            speedMbps: 480,
            bcdUsb: 2.0,
        })]
        const issues = runRules([], devices)
        expect(issues).toHaveLength(0)
        expect(devices[0].status).toBe(STATUS.ADEQUATE)
    })

    it('HIGH-tier device sharing a hub is flagged HUB_LIMITATION', () => {
        const devices = [makeDevice({
            name: 'Samsung T7 SSD',
            profileKey: 'storage',
            profileLabel: 'Storage',
            tier: TIER.HIGH,
            viaHub: true,
            speedMbps: 5000,
        })]
        const issues = runRules([], devices)
        expect(issues).toHaveLength(1)
        expect(issues[0].source).toBe('HUB_LIMITATION')
        expect(devices[0].status).toBe(STATUS.LIMITED)
    })

    it('HIGH-tier SSD on USB 2.0 port claiming USB 3 in name is DEVICE_LIMITATION', () => {
        const devices = [makeDevice({
            name: 'Acme USB 3.0 Portable SSD',
            profileKey: 'storage',
            profileLabel: 'Storage',
            tier: TIER.HIGH,
            speedMbps: 480,
            bcdUsb: 2.0,
        })]
        const issues = runRules([], devices)
        expect(issues).toHaveLength(1)
        expect(issues[0].source).toBe('DEVICE_LIMITATION')
        expect(issues[0].title).toMatch(/USB 2.0/)
    })

    it('HIGH-tier SSD on USB 3.0 port is ADEQUATE', () => {
        const devices = [makeDevice({
            name: 'Acme USB 3.0 Portable SSD',
            profileKey: 'storage',
            profileLabel: 'Storage',
            tier: TIER.HIGH,
            speedMbps: 5000,
            bcdUsb: 3.0,
        })]
        const issues = runRules([], devices)
        expect(issues).toHaveLength(0)
        expect(devices[0].status).toBe(STATUS.ADEQUATE)
    })

    it('internal (built-in) device is never flagged even if speed looks low', () => {
        const devices = [makeDevice({
            name: 'Built-in Webcam',
            isInternal: true,
            speedMbps: 480,
        })]
        const issues = runRules([], devices)
        expect(issues).toHaveLength(0)
        expect(devices[0].status).toBe(STATUS.ADEQUATE)
    })

    it('mouse at USB 1.1 is ADEQUATE (safe-profile + low bandwidth by design)', () => {
        const devices = [makeDevice({
            name: 'Logitech Mouse',
            profileKey: 'mouse',
            profileLabel: 'Mouse',
            tier: TIER.LOW,
            speedMbps: 12,
            bcdUsb: 1.1,
        })]
        const issues = runRules([], devices)
        expect(issues).toHaveLength(0)
        expect(devices[0].status).toBe(STATUS.ADEQUATE)
    })

    it('LOW-tier (mouse) device via hub is NOT flagged (only HIGH-tier gets flagged for hub sharing)', () => {
        const devices = [makeDevice({
            name: 'Logitech Mouse',
            profileKey: 'mouse',
            profileLabel: 'Mouse',
            tier: TIER.LOW,
            viaHub: true,
            speedMbps: 12,
        })]
        const issues = runRules([], devices)
        expect(issues).toHaveLength(0)
        expect(devices[0].status).toBe(STATUS.ADEQUATE)
    })

    it('warning includes portCapability equal to device.portCapabilityMbps', () => {
        const devices = [makeDevice({
            name: 'Acme USB 3.0 SSD',
            profileKey: 'storage',
            profileLabel: 'Storage',
            tier: TIER.HIGH,
            speedMbps: 480,
            bcdUsb: 2.0,
            portCapabilityMbps: 480,
        })]
        const issues = runRules([], devices)
        expect(issues).toHaveLength(1)
        expect(issues[0].portCapability).toBe(480)
        expect(issues[0].deviceCapability).toBe(480)
    })

    it('SAFE_PROFILES includes the full set of safe-by-default keys', () => {
        for (const key of ['audio', 'keyboard', 'mouse', 'gamepad', 'bluetooth', 'smartcard', 'hid', 'coolingpad', 'accessory', 'generic']) {
            expect(SAFE_PROFILES.has(key), `SAFE_PROFILES missing ${key}`).toBe(true)
        }
    })
})
