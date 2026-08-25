// securityCheck.test.ts — verify the security scanner flags the right
// patterns and doesn't false-positive on known-good devices.

import { describe, it, expect } from 'vitest'
import { checkSecurity } from '../src/utils/securityCheck'

function makeDev(overrides: Partial<any> = {}) {
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

describe('securityCheck', () => {
    it('flags HID device with unknown vendor (potential BadUSB)', () => {
        const findings = checkSecurity([makeDev({
            name: 'USB Input Device',
            idVendor: '9999',
        })])
        expect(findings.length).toBeGreaterThanOrEqual(1)
        const f = findings.find((x: any) => x.severity === 'warning')
        expect(f, 'expected at least one warning-level finding').toBeTruthy()
        expect(f!.reason).toMatch(/unknown vendor/i)
    })

    it('does NOT flag a known Logitech HID device', () => {
        const findings = checkSecurity([makeDev({
            name: 'Logitech MX Master',
            idVendor: '046d',
        })])
        expect(findings).toHaveLength(0)
    })

    it('flags generic-named HID with unknown vendor as warning', () => {
        const findings = checkSecurity([makeDev({
            name: 'USB Input Device',
            idVendor: 'abcd',
        })])
        const warning = findings.find((f: any) => f.severity === 'warning')
        expect(warning).toBeTruthy()
        expect(warning!.reason).toMatch(/Generic HID/i)
    })

    it('does NOT flag a built-in device even with generic name', () => {
        const findings = checkSecurity([makeDev({
            name: 'USB Input Device',
            isInternal: true,
            idVendor: '8087',  // Intel
        })])
        expect(findings).toHaveLength(0)
    })

    it('flags hub from unknown vendor as info-level', () => {
        const findings = checkSecurity([makeDev({
            type: 'USBHub',
            _resolvedType: 'USBHub',
            name: 'USB Hub',
            idVendor: 'badd',
        })])
        const info = findings.find((f: any) => f.severity === 'info')
        expect(info, 'expected an info-level finding for unknown hub').toBeTruthy()
        expect(info!.reason).toMatch(/hub/i)
    })
})
