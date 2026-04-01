/**
 * ruleEngine.js
 * Evaluates the classified topology to assign explicit status labels
 * and aggregates them into issue items for the Bottlenecks panel.
 */

import { TIER } from './classifier.js'

let _warningCounter = 0
function makeId() { return `issue-${++_warningCounter}` }

/**
 * Run context-aware evaluation per device and aggregate issues.
 * @param {Array}  tree            – topology tree
 * @param {Array}  classifiedDevices – flat classified devices
 * @returns {Array} List of aggregated issues to show in the UI
 */
export function runRules(tree, classifiedDevices) {
  _warningCounter = 0
  const issues = []

  // 1. Assign Status
  for (const device of classifiedDevices) {
    if (device.isInternal) {
      device.status = 'NORMAL'
      device.statusMessage = 'This device operates at low bandwidth and does not impact performance.'
      continue
    }

    const isBasicType = ['HIDClass', 'Bluetooth', 'AudioEndpoint'].includes(device.type)
    if (device.tier === TIER.LOW || isBasicType) {
      device.status = 'NORMAL'
      device.statusMessage = 'This device operates at low bandwidth and does not impact performance.'
      continue
    }

    const isUsb2 = device.speedMbps && device.speedMbps <= 480

    if (device.tier === TIER.HIGH && (isUsb2 || device.viaHub)) {
      device.status = 'WARNING'
      device.statusMessage = 'This high-speed device may experience reduced performance due to a slower connection or shared bandwidth.'
    } else if (device.tier === TIER.MEDIUM && isUsb2) {
      device.status = 'LIMITED'
      device.statusMessage = 'This device is operating on a lower-speed connection but should function normally for typical use.'
    } else {
      device.status = 'NORMAL'
      device.statusMessage = 'This device operates at its intended speed and does not impact system performance.'
    }

    // 2. Aggregate Issues (Only show issues for LIMITED and WARNING)
    if (device.status !== 'NORMAL') {
      let summary = ''
      if (device.status === 'WARNING') {
        summary = device.viaHub 
          ? 'High-bandwidth device connected via hub' 
          : 'High-bandwidth device connected via USB 2.0'
      } else if (device.status === 'LIMITED') {
        summary = 'Medium-bandwidth device on USB 2.0 (acceptable but limited)'
      }

      issues.push({
        id: makeId(),
        severity: device.status === 'WARNING' ? 'critical' : 'warning',
        status: device.status,
        title: summary,
        detail: device.statusMessage,
        affectedIds: [device.instanceId],
        deviceName: device.name,
      })
    }
  }

  return issues
}
