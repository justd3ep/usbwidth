// classifier.test.mjs — verify the profile inference produces the right
// tier/profileKey for common device name patterns.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyDevice, inferProfileKey, TIER, PROFILES } from '../electron/classifier.js'

test('"Samsung T7 SSD" is detected as storage / HIGH tier', () => {
    const d = { name: 'Samsung T7 SSD', type: 'DiskDrive' }
    classifyDevice(d)
    assert.equal(d.profileKey, 'storage')
    assert.equal(d.tier, TIER.HIGH)
})

test('"Logitech MX Master 3" is detected as mouse / LOW tier', () => {
    const d = { name: 'Logitech MX Master 3', type: 'HIDClass' }
    classifyDevice(d)
    assert.equal(d.profileKey, 'mouse')
    assert.equal(d.tier, TIER.LOW)
})

test('"Cooler Master cooling pad" is detected as coolingpad / LOW tier', () => {
    const d = { name: 'Cooler Master Notepal', type: 'HIDClass' }
    classifyDevice(d)
    assert.equal(d.profileKey, 'coolingpad')
    assert.equal(d.tier, TIER.LOW)
})

test('"TopMate Cooling Pad" matches via name pattern', () => {
    const d = { name: 'TopMate K5 Notebook Cooler', type: 'HIDClass' }
    classifyDevice(d)
    assert.equal(d.profileKey, 'coolingpad')
})

test('"Webcam HD" matches the webcam pattern (MEDIUM tier)', () => {
    const d = { name: 'Logitech HD Webcam C920', type: 'Camera' }
    classifyDevice(d)
    assert.equal(d.profileKey, 'webcam')
    assert.equal(d.tier, TIER.MEDIUM)
})

test('"USB Audio Device" falls through to class-based audio', () => {
    const d = { name: 'USB Audio Device', type: 'AudioEndpoint' }
    classifyDevice(d)
    assert.equal(d.profileKey, 'audio')
    assert.equal(d.tier, TIER.LOW)
})

test('"USB Input Device" with no class falls back to accessory', () => {
    const d = { name: 'USB Input Device', type: 'HIDClass' }
    classifyDevice(d)
    assert.equal(d.profileKey, 'accessory')
    assert.equal(d.tier, TIER.LOW)
})

test('completely unknown device falls back to unknown profile (MEDIUM)', () => {
    const d = { name: 'XYZ Professional Widget', type: 'USBDevice' }
    classifyDevice(d)
    assert.equal(d.profileKey, 'unknown')
    assert.equal(d.tier, TIER.MEDIUM)
})

test('PROFILES has all expected keys', () => {
    // Regression: if PROFILES is refactored, downstream may break.
    for (const k of ['hid', 'keyboard', 'mouse', 'gamepad', 'storage', 'webcam', 'printer',
        'audio', 'midi', 'bluetooth', 'smartcard', 'dock', 'capture',
        'coolingpad', 'accessory', 'generic', 'unknown']) {
        assert.ok(PROFILES[k], `PROFILES missing ${k}`)
    }
})

test('inferProfileKey handles missing name gracefully', () => {
    const d = { name: '', type: 'HIDClass' }
    // No exception, returns some valid profile key
    const key = inferProfileKey(d)
    assert.ok(typeof key === 'string')
    assert.ok(PROFILES[key])
})
