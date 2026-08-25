// securityCheck.ts — flag suspicious devices that may warrant attention
// (e.g. unknown VIDs, hub-class devices that hide as HID, etc.)

// Subset of VID_MANUFACTURER from windowsDetector. We don't have access to
// that map from the renderer (it's defined in an ES module main process),
// so we mirror a relevant slice here for the security check.
const KNOWN_VIDS = new Set([
    '1a2c', '0b0c', '1cbe', '0c45', '0763', '10d6', '1a86', '0409', '046d', '04b4',
    '04f2', '04e8', '05ac', '0781', '0951', '0b95', '0d28', '0e8d', '1004', '12d1',
    '13d3', '1410', '15d9', '174f', '18a5', '1a40', '1b1c', '1d50', '1d57', '1e7d',
    '20a0', '2357', '25a7', '258a', '2717', '2a8a', '2c7c', '30de', '3538', '413c',
    '4242', '4572', '8086', '8087', '322e', '0408', '5986',
])

// Devices from these VIDs are *known* to be built-in laptop components
// (webcams, BT, fingerprint) that sometimes enumerate as user-visible HID.
const TRUSTED_INTERNAL_VIDS = new Set([
    '8087', '322e', '0408', '04f2', '5986', '0c45', '13d3',
])

export interface SecurityFinding {
    instanceId: string
    name: string
    reason: string
    severity: 'info' | 'warning' | 'critical'
}

export function checkSecurity(devices: any[]): SecurityFinding[] {
    const findings: SecurityFinding[] = []

    for (const d of devices) {
        if (d.isInternal) continue  // built-in devices are fine

        const vid = (d.idVendor || '').toLowerCase()
        const name = d.name || ''

        // 1. Unknown / unbranded vendor
        if (vid && !KNOWN_VIDS.has(vid) && !TRUSTED_INTERNAL_VIDS.has(vid)) {
            // HID with no manufacturer name is a classic BadUSB / Rubber Ducky pattern
            if (d.type === 'HIDClass' || d._resolvedType === 'HIDClass') {
                findings.push({
                    instanceId: d.instanceId,
                    name,
                    reason: 'HID device with unknown vendor. Could be a legitimate accessory, but a HID device that pretends to be a keyboard from an unknown brand is a known BadUSB pattern. Verify the source.',
                    severity: 'warning',
                })
            } else {
                findings.push({
                    instanceId: d.instanceId,
                    name,
                    reason: `Device uses an unknown or unbranded vendor ID (${vid.toUpperCase()}). Verify it is what you expect.`,
                    severity: 'info',
                })
            }
        }

        // 2. HID device with a generic name (e.g. "USB Input Device") that
        //    also claims keyboard capability — could be a keystroke injector.
        if ((d.type === 'HIDClass' || d._resolvedType === 'HIDClass') &&
            /^(usb\s+(input|hid|device|composite)|generic)\b/i.test(name)) {
            findings.push({
                instanceId: d.instanceId,
                name,
                reason: 'Generic HID device with no manufacturer name. Some keystroke-injection attacks present this way. Confirm the physical device is something you plugged in intentionally.',
                severity: 'warning',
            })
        }

        // 3. USB hub that enumerates with a suspicious class
        if (d._resolvedType === 'USBHub' && vid && !KNOWN_VIDS.has(vid)) {
            findings.push({
                instanceId: d.instanceId,
                name,
                reason: `USB hub from unknown vendor (${vid.toUpperCase()}). Some malicious devices present as hubs to intercept traffic.`,
                severity: 'info',
            })
        }
    }

    return findings
}
