// securityCheck.test.mjs — verify the security scanner flags the right
// patterns and doesn't false-positive on known-good devices.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkSecurity } from '../src/utils/securityCheck.js'

function makeDev(overrides = {}) {
    return {
        instanceId: 'dev-1',
        name: 'Generic',
        type: 'HIDClass',
        _resolvedType: 'HIDClass',
        isInternal: false,
        idVendor: '1234',
        idProduct: '5678',
        ...overrides,
    }
}

test('flags HID device with unknown vendor (potential BadUSB)', () => {
    const findings = checkSecurity([makeDev({
        name: 'USB Input Device',
        idVendor: '9999',
    })])
    assert.ok(findings.length >= 1)
    const f = findings.find(x => x.severity === 'warning')
    assert.ok(f, 'expected at least one warning-level finding')
    assert.match(f.reason, /unknown vendor/i)
})

test('does NOT flag a known Logitech HID device', () => {
    const findings = checkSecurity([makeDev({
        name: 'Logitech MX Master',
        idVendor: '046d',
    })])
    assert.equal(findings.length, 0)
})

test('flags generic-named HID with unknown vendor as warning', () => {
    const findings = checkSecurity([makeDev({
        name: 'USB Input Device',
        idVendor: 'abcd',
    })])
    const warning = findings.find(f => f.severity === 'warning')
    assert.ok(warning)
    assert.match(warning.reason, /Generic HID/i)
})

test('does NOT flag a built-in device even with generic name', () => {
    const findings = checkSecurity([makeDev({
        name: 'USB Input Device',
        isInternal: true,
        idVendor: '8087',  // Intel
    })])
    assert.equal(findings.length, 0)
})

test('flags hub from unknown vendor as info-level', () => {
    const findings = checkSecurity([makeDev({
        type: 'USBHub',
        _resolvedType: 'USBHub',
        name: 'USB Hub',
        idVendor: 'badd',
    })])
    const info = findings.find(f => f.severity === 'info')
    assert.ok(info, 'expected an info-level finding for unknown hub')
    assert.match(info.reason, /hub/i)
})
