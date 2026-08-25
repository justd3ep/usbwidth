// classifier.test.ts — verify the profile inference produces the right
// tier/profileKey for common device name patterns.

import { describe, it, expect } from 'vitest'
import { classifyDevice, inferProfileKey, TIER, PROFILES } from '../electron/classifier.js'

describe('classifier', () => {
    it('"Samsung T7 SSD" is detected as storage / HIGH tier', () => {
        const d: any = { name: 'Samsung T7 SSD', type: 'DiskDrive' }
        classifyDevice(d)
        expect(d.profileKey).toBe('storage')
        expect(d.tier).toBe(TIER.HIGH)
    })

    it('"Logitech MX Master 3" is detected as mouse / LOW tier', () => {
        const d: any = { name: 'Logitech MX Master 3', type: 'HIDClass' }
        classifyDevice(d)
        expect(d.profileKey).toBe('mouse')
        expect(d.tier).toBe(TIER.LOW)
    })

    it('"Cooler Master Notepal" is detected as coolingpad / LOW tier', () => {
        const d: any = { name: 'Cooler Master Notepal', type: 'HIDClass' }
        classifyDevice(d)
        expect(d.profileKey).toBe('coolingpad')
        expect(d.tier).toBe(TIER.LOW)
    })

    it('"TopMate Cooling Pad" matches via name pattern', () => {
        const d: any = { name: 'TopMate K5 Notebook Cooler', type: 'HIDClass' }
        classifyDevice(d)
        expect(d.profileKey).toBe('coolingpad')
    })

    it('"Logitech HD Webcam C920" matches the webcam pattern (MEDIUM tier)', () => {
        const d: any = { name: 'Logitech HD Webcam C920', type: 'Camera' }
        classifyDevice(d)
        expect(d.profileKey).toBe('webcam')
        expect(d.tier).toBe(TIER.MEDIUM)
    })

    it('"USB Audio Device" falls through to class-based audio', () => {
        const d: any = { name: 'USB Audio Device', type: 'AudioEndpoint' }
        classifyDevice(d)
        expect(d.profileKey).toBe('audio')
        expect(d.tier).toBe(TIER.LOW)
    })

    it('"USB Input Device" with no class falls back to accessory', () => {
        const d: any = { name: 'USB Input Device', type: 'HIDClass' }
        classifyDevice(d)
        expect(d.profileKey).toBe('accessory')
        expect(d.tier).toBe(TIER.LOW)
    })

    it('completely unknown device falls back to unknown profile (MEDIUM)', () => {
        const d: any = { name: 'XYZ Professional Widget', type: 'USBDevice' }
        classifyDevice(d)
        expect(d.profileKey).toBe('unknown')
        expect(d.tier).toBe(TIER.MEDIUM)
    })

    it('PROFILES has all expected keys (regression guard)', () => {
        const keys = ['hid', 'keyboard', 'mouse', 'gamepad', 'storage', 'webcam', 'printer',
            'audio', 'midi', 'bluetooth', 'smartcard', 'dock', 'capture',
            'coolingpad', 'accessory', 'generic', 'unknown'] as const
        for (const k of keys) {
            expect((PROFILES as any)[k], `PROFILES missing ${k}`).toBeTruthy()
        }
    })

    it('inferProfileKey handles missing name gracefully', () => {
        const d = { name: '', type: 'HIDClass' }
        const key = inferProfileKey(d as any)
        expect(typeof key).toBe('string')
        expect(PROFILES[key as keyof typeof PROFILES]).toBeTruthy()
    })
})
