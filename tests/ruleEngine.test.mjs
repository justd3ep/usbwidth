// ruleEngine.test.mjs — verify the rule engine produces correct status/source
// for representative device scenarios. Run with: node --test tests/

import { test } from 'node:test'
import assert from 'node:assert/strict'

// Stub the TIER/STATUS/SAFE_PROFILES values that classifier.js exports.
// We import the real ones to keep the test in sync with the actual constants.
import { TIER, STATUS, SAFE_PROFILES } from '../electron/classifier.js'
import { runRules } from '../electron/ruleEngine.js'

// Minimal device factory for the fields the rule engine inspects.
function makeDevice(overrides = {}) {
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

test('safe-profile audio device on USB 2.0 port is ADEQUATE (never flagged)', () => {
    const devices = [makeDevice({
        name: 'USB Audio Device',
        profileKey: 'audio',
        tier: TIER.LOW,
        speedMbps: 480,
        bcdUsb: 2.0,
    })]
    const issues = runRules([], devices)
    assert.equal(issues.length, 0)
    assert.equal(devices[0].status, STATUS.ADEQUATE)
})

test('HIGH-tier device sharing a hub is flagged HUB_LIMITATION', () => {
    const devices = [makeDevice({
        name: 'Samsung T7 SSD',
        profileKey: 'storage',
        profileLabel: 'Storage',
        tier: TIER.HIGH,
        viaHub: true,
        speedMbps: 5000,
    })]
    const issues = runRules([], devices)
    assert.equal(issues.length, 1)
    assert.equal(issues[0].source, 'HUB_LIMITATION')
    assert.equal(devices[0].status, STATUS.LIMITED)
})

test('HIGH-tier SSD on USB 2.0 port claiming USB 3 in name is DEVICE_LIMITATION', () => {
    const devices = [makeDevice({
        name: 'Acme USB 3.0 Portable SSD',
        profileKey: 'storage',
        profileLabel: 'Storage',
        tier: TIER.HIGH,
        speedMbps: 480,
        bcdUsb: 2.0,
    })]
    const issues = runRules([], devices)
    assert.equal(issues.length, 1)
    assert.equal(issues[0].source, 'DEVICE_LIMITATION')
    assert.match(issues[0].title, /USB 2.0/)
})

test('HIGH-tier SSD on USB 3.0 port is ADEQUATE', () => {
    const devices = [makeDevice({
        name: 'Acme USB 3.0 Portable SSD',
        profileKey: 'storage',
        profileLabel: 'Storage',
        tier: TIER.HIGH,
        speedMbps: 5000,
        bcdUsb: 3.0,
    })]
    const issues = runRules([], devices)
    assert.equal(issues.length, 0)
    assert.equal(devices[0].status, STATUS.ADEQUATE)
})

test('internal (built-in) device is never flagged even if speed looks low', () => {
    const devices = [makeDevice({
        name: 'Built-in Webcam',
        isInternal: true,
        speedMbps: 480,
    })]
    const issues = runRules([], devices)
    assert.equal(issues.length, 0)
    assert.equal(devices[0].status, STATUS.ADEQUATE)
})

test('mouse at USB 1.1 is ADEQUATE (safe-profile + low bandwidth by design)', () => {
    const devices = [makeDevice({
        name: 'Logitech Mouse',
        profileKey: 'mouse',
        profileLabel: 'Mouse',
        tier: TIER.LOW,
        speedMbps: 12,
        bcdUsb: 1.1,
    })]
    const issues = runRules([], devices)
    assert.equal(issues.length, 0)
    assert.equal(devices[0].status, STATUS.ADEQUATE)
})

test('LOW-tier (mouse) device via hub is NOT flagged (only HIGH-tier gets flagged for hub sharing)', () => {
    const devices = [makeDevice({
        name: 'Logitech Mouse',
        profileKey: 'mouse',
        profileLabel: 'Mouse',
        tier: TIER.LOW,
        viaHub: true,
        speedMbps: 12,
    })]
    const issues = runRules([], devices)
    assert.equal(issues.length, 0)
    assert.equal(devices[0].status, STATUS.ADEQUATE)
})

test('warning includes portCapability equal to device.portCapabilityMbps', () => {
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
    assert.equal(issues.length, 1)
    assert.equal(issues[0].portCapability, 480)
    assert.equal(issues[0].deviceCapability, 480)
})

test('SAFE_PROFILES includes audio, keyboard, mouse, gamepad, bluetooth, smartcard, hid, coolingpad, accessory, generic', () => {
    // Regression: if SAFE_PROFILES is changed, the rule engine may start
    // flagging these devices.
    for (const key of ['audio', 'keyboard', 'mouse', 'gamepad', 'bluetooth', 'smartcard', 'hid', 'coolingpad', 'accessory', 'generic']) {
        assert.ok(SAFE_PROFILES.has(key), `SAFE_PROFILES missing ${key}`)
    }
})
