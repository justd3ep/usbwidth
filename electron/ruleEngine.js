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

  // Create a quick lookup map
  const deviceMap = new Map()
  
  // Recursively add all tree nodes to lookup map
  function addToMap(nodes) {
    for (const node of nodes) {
      deviceMap.set(node.instanceId, node)
      if (node.children) addToMap(node.children)
    }
  }
  addToMap(tree)

  // 1. Assign Status
  for (const device of classifiedDevices) {
    if (device.isInternal) {
      device.status = 'NORMAL'
      device.statusMessage = 'Operating at expected bandwidth.'
      continue
    }

    const isBasicType = ['HIDClass', 'Bluetooth', 'AudioEndpoint'].includes(device.type)
    if (device.tier === TIER.LOW || isBasicType) {
      device.status = 'NORMAL'
      device.statusMessage = 'Device uses low bandwidth and operates normally.'
      continue
    }

    // Determine parent/port speed
    let portSpeed = null
    const parentNode = device.parentId ? deviceMap.set(device.parentId) || deviceMap.get(device.parentId) : null
    
    // Quick heuristic: find the closest Hub/Controller capability above this device
    let current = parentNode
    while (current) {
      if (current.speedMbps && current.speedMbps > 480) {
        portSpeed = current.speedMbps
        break
      } else if (current.speedMbps === 480) {
        portSpeed = 480
      }
      current = current.parentId ? deviceMap.get(current.parentId) : null
    }

    // Default to device speed if we cannot find port speed
    if (!portSpeed && device.speedMbps) portSpeed = device.speedMbps

    const isUsb2 = device.speedMbps && device.speedMbps <= 480

    let source = null
    
    // Bottleneck logic
    if (device.tier === TIER.HIGH && device.viaHub) {
      device.status = 'LIMITED'
      device.statusMessage = 'Sharing bandwidth via multiple devices on a hub.'
      source = 'HUB_LIMITATION'
    } else if (device.tier === TIER.HIGH && isUsb2) {
      device.status = 'LIMITED'
      device.statusMessage = 'Performance limited by device or cable capability (USB 2.0).'
      source = 'DEVICE_LIMITATION'
    } else if (device.tier === TIER.MEDIUM && isUsb2) {
      device.status = 'LIMITED'
      device.statusMessage = 'Device is operating at USB 2.0 speed (acceptable but limited).'
      source = 'DEVICE_LIMITATION'
    } else {
      device.status = 'NORMAL'
      device.statusMessage = 'Operating at full speed without bottlenecks.'
    }
    
    // Note: 'WARNING' (Red) mapping is reserved for SYSTEM_LIMITATION scenarios. 
    // In our simplified logic, most things are yellow (LIMITED). 
    // Let's add an explicit mock case for SYSTEM_LIMITATION if many high tier items exist on same controller.
    // For now we will just use DEVICE and HUB limitations per the instructions.

    // 2. Aggregate Issues
    if (device.status !== 'NORMAL') {
      let summary = ''
      if (source === 'HUB_LIMITATION') {
        summary = 'Bandwidth is shared via hub'
      } else if (source === 'DEVICE_LIMITATION') {
        summary = 'Running at reduced speed'
      }

      issues.push({
        id: makeId(),
        severity: 'warning', // yellow
        status: device.status,
        title: summary,
        detail: device.statusMessage,
        affectedIds: [device.instanceId],
        deviceName: device.name,
        source: source,
        portCapability: portSpeed,
        deviceCapability: device.speedMbps,
        connectionPath: device.viaHub ? 'Via Hub' : 'Direct',
        verdict: `Bottleneck Source: ${source === 'DEVICE_LIMITATION' ? 'DEVICE' : source === 'HUB_LIMITATION' ? 'HUB' : 'SYSTEM'}`,
        verdictVerdict: source === 'DEVICE_LIMITATION' ? 'DEVICE' : source === 'HUB_LIMITATION' ? 'HUB' : 'SYSTEM'
      })
    }
  }

  return issues
}
