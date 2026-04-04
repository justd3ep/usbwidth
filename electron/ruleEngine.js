/**
 * ruleEngine.js
 *
 * Evaluates classified devices and assigns one of two statuses:
 *
 *   ADEQUATE  →  "Working as Expected"
 *               Default for all devices. Used when behavior is correct
 *               for the device type, or when we don't have enough data
 *               to make a reliable judgment.
 *
 *   LIMITED   →  "Limited Performance"
 *               Only used when we have CLEAR evidence of a problem:
 *               - A HIGH-tier device (storage/capture) whose name
 *                 explicitly advertises USB 3.x support is running
 *                 at USB 2.0 or lower speed.
 *               - OR: a HIGH-tier device is sharing bandwidth via a
 *                 hub.
 *
 * Guiding principle: it is better to show nothing than to show
 * something wrong. Never flag a device unless we are certain.
 */

import { TIER, STATUS, SAFE_PROFILES } from './classifier.js'

let _warningCounter = 0
function makeId() { return `issue-${++_warningCounter}` }

// ─── USB 3.x capability detection ────────────────────────────────────────────
//
// We can only confidently claim a device "supports higher speeds"
// if its own product name says so. This is conservative by design.

const USB3_NAME_PATTERN = /\b(usb\s*3|usb-c|superspeed|ss\b|type-c|gen\s*[12x]|nvme|thunderbolt)\b/i

function deviceClaimsUSB3Support(device) {
  return USB3_NAME_PATTERN.test(device.name || '')
}

// ─── Human-readable messages ──────────────────────────────────────────────────

function buildStatusMessage(device, status, source) {
  const label = device.profileLabel || 'This device'

  if (status === STATUS.ADEQUATE) {
    // Vary the message by device category for clarity
    if (SAFE_PROFILES.has(device.profileKey)) {
      if (device.profileKey === 'audio' || device.profileKey === 'midi') {
        return 'Audio devices are designed for low bandwidth. USB 2.0 or even USB 1.1 is more than sufficient — this is completely normal.'
      }
      if (device.profileKey === 'keyboard' || device.profileKey === 'mouse' || device.profileKey === 'gamepad') {
        return 'Input devices use minimal bandwidth. This connection speed is perfect for this device type.'
      }
      if (device.profileKey === 'bluetooth') {
        return 'Bluetooth adapters use very little bandwidth. Speed is irrelevant for this device type.'
      }
      return `${label} operates at low bandwidth by design. This speed is correct and expected.`
    }
    if (device.viaHub) {
      return `${label} is sharing a connection via hub and working normally.`
    }
    return `${label} is operating as expected for its device type.`
  }

  // LIMITED messages — only shown when we are certain
  if (source === 'HUB_LIMITATION') {
    return `${label} is sharing bandwidth with other devices on a hub. ` +
      `Connecting it directly to a port on your computer may improve transfer speeds.`
  }

  if (source === 'DEVICE_LIMITATION') {
    return `${label} advertises USB 3.x support in its name but is currently connected at USB 2.0 speed (~40 MB/s max). ` +
      `Plugging into a USB 3.x port could significantly improve transfer speeds.`
  }

  return `${label} may be running below its optimal speed.`
}

function buildWarningSummary(device, source) {
  if (source === 'HUB_LIMITATION') return 'Sharing hub — direct connection may be faster'
  if (source === 'DEVICE_LIMITATION') return 'Connected at USB 2.0 (device supports USB 3.x)'
  return 'Performance may be reduced'
}

function buildWarningDetail(device, source) {
  const label = device.profileLabel || 'Device'

  if (source === 'HUB_LIMITATION') {
    return `${label} is connected through a USB hub and shares its bandwidth with other devices on the same hub. ` +
      `For best performance with high-speed transfers, connect it directly to a port on your computer.`
  }

  if (source === 'DEVICE_LIMITATION') {
    return `${label}'s name indicates it supports USB 3.x speeds (up to ~625 MB/s), ` +
      `but it is currently running at USB 2.0 speed, which caps transfers at around 40 MB/s. ` +
      `Try plugging it into a blue USB-A port or a USB-C port to get its full speed.`
  }

  return `${label} may be running below its full capability.`
}

// ─── Core evaluator ───────────────────────────────────────────────────────────

/**
 * Determine the status for a single classified device.
 *
 * Returns { status, source } where source is null for ADEQUATE devices.
 */
function evaluateDevice(device) {
  // ── Rule 1: Safe device types are ALWAYS adequate ────────────────────────
  // Audio, keyboards, mice, Bluetooth, etc. do not need high bandwidth.
  // Never flag these regardless of speed.
  if (SAFE_PROFILES.has(device.profileKey)) {
    return { status: STATUS.ADEQUATE, source: null }
  }

  // ── Rule 2: Internal devices are always adequate ─────────────────────────
  if (device.isInternal) {
    return { status: STATUS.ADEQUATE, source: null }
  }

  // ── Rule 3: Hub sharing — only flag HIGH-tier devices ───────────────────
  // Low and medium tier devices don't care about sharing a hub.
  if (device.tier === TIER.HIGH && device.viaHub) {
    return { status: STATUS.LIMITED, source: 'HUB_LIMITATION' }
  }

  // ── Rule 4: Speed mismatch — only when we KNOW the device supports USB 3.x
  // We require both:
  //   a) Device type is HIGH tier (storage, capture, dock)
  //   b) Device name explicitly advertises USB 3.x (so we know it can do better)
  //   c) Actual connected speed is USB 2.0 or lower (≤ 480 Mbps)
  if (
    device.tier === TIER.HIGH &&
    device.speedMbps &&
    device.speedMbps <= 480 &&
    deviceClaimsUSB3Support(device)
  ) {
    return { status: STATUS.LIMITED, source: 'DEVICE_LIMITATION' }
  }

  // ── Default: working as expected ─────────────────────────────────────────
  // We don't have enough information to flag this device, so we don't.
  return { status: STATUS.ADEQUATE, source: null }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Run evaluation on all classified devices and return the issue list.
 *
 * @param {any[]} tree              – topology tree (for parent lookups)
 * @param {any[]} classifiedDevices – flat classified devices
 * @returns {any[]} issues for WarningsPanel (only LIMITED devices)
 */
export function runRules(tree, classifiedDevices) {
  _warningCounter = 0
  const issues = []

  // Build parent-lookup map
  const deviceMap = new Map()
  function addToMap(nodes) {
    for (const node of nodes) {
      deviceMap.set(node.instanceId, node)
      if (node.children) addToMap(node.children)
    }
  }
  addToMap(tree)

  for (const device of classifiedDevices) {
    // Resolve port speed (best-effort, used for display only)
    let portSpeed = null
    let current   = device.parentId ? deviceMap.get(device.parentId) : null
    while (current) {
      if (current.speedMbps && current.speedMbps > 480) { portSpeed = current.speedMbps; break }
      else if (current.speedMbps === 480)                { portSpeed = 480 }
      current = current.parentId ? deviceMap.get(current.parentId) : null
    }
    if (!portSpeed && device.speedMbps) portSpeed = device.speedMbps

    const { status, source } = evaluateDevice(device)

    device.status        = status
    device.statusMessage = buildStatusMessage(device, status, source)

    // Only add to warnings list for LIMITED devices
    if (status === STATUS.LIMITED) {
      issues.push({
        id:               makeId(),
        severity:         'warning',
        status:           device.status,
        title:            buildWarningSummary(device, source),
        detail:           buildWarningDetail(device, source),
        affectedIds:      [device.instanceId],
        deviceName:       device.name,
        source:           source,
        portCapability:   portSpeed,
        deviceCapability: device.speedMbps,
        connectionPath:   device.viaHub ? 'Via Hub' : 'Direct',
        verdict:          device.statusMessage,
      })
    }
  }

  // ── System-level: heavy controller load ──────────────────────────────────
  // Only flag if 3+ distinctly HIGH-tier devices confirmed on one controller.
  const controllerLoad = new Map()
  for (const device of classifiedDevices) {
    if (device.tier !== TIER.HIGH || device.isInternal || device.status !== STATUS.LIMITED) continue
    let current = device.parentId ? deviceMap.get(device.parentId) : null
    while (current) {
      if (current.type === 'USBController') {
        controllerLoad.set(current.instanceId, (controllerLoad.get(current.instanceId) || 0) + 1)
        break
      }
      current = current.parentId ? deviceMap.get(current.parentId) : null
    }
  }

  for (const [controllerId, count] of controllerLoad) {
    if (count >= 3) {
      const ctrl = deviceMap.get(controllerId)
      issues.unshift({
        id:               makeId(),
        severity:         'critical',
        status:           STATUS.LIMITED,
        title:            'Multiple High-Speed Devices on One Controller',
        detail:           `${count} high-bandwidth devices are competing on the same USB controller. ` +
                          `You may notice slowdowns during simultaneous transfers. ` +
                          `Spreading devices across different ports can help.`,
        affectedIds:      [],
        deviceName:       ctrl ? (ctrl.name || 'USB Controller') : 'USB Controller',
        source:           'SYSTEM_LIMITATION',
        portCapability:   null,
        deviceCapability: null,
        connectionPath:   'Controller',
        verdict:          'Multiple high-bandwidth devices sharing one controller.',
      })
    }
  }

  return issues
}
