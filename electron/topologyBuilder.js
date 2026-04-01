/**
 * topologyBuilder.js
 * Converts the flat USB device array into a nested tree:
 *   Controller → RootHub → [Hub]* → Device
 */

/**
 * Build a node map and link parents.
 * @param {Array} devices – flat array from hardwareDetector
 * @returns {Object} topology tree (array of controller root nodes)
 */
export function buildTopology(devices) {
  // Index all nodes by instanceId
  const nodeMap = new Map()
  for (const device of devices) {
    nodeMap.set(device.instanceId, {
      ...device,
      children: [],
      depth: 0,        // filled in later
      viaHub: false,   // filled in later
    })
  }

  const roots = []

  // Link children to parents
  for (const [id, node] of nodeMap) {
    if (!node.parentId || !nodeMap.has(node.parentId)) {
      roots.push(node) // top-level controllers
    } else {
      nodeMap.get(node.parentId).children.push(node)
    }
  }

  // Annotate depth + viaHub
  annotate(roots, 0, false)

  return roots
}

function annotate(nodes, depth, viaHub) {
  for (const node of nodes) {
    node.depth = depth
    // A device is "via hub" if any ancestor (below root hub) is a USBHub
    node.viaHub = viaHub
    // Children of a non-root USBHub are via hub. In Linux, Root Hub is depth 0.
    const isHub = node.type === 'USBHub' && depth >= 1
    annotate(node.children, depth + 1, viaHub || isHub)
  }
}

/**
 * Returns a flat list of all leaf devices (non-controller, non-hub).
 */
export function flattenDevices(tree) {
  const results = []
  function walk(nodes) {
    for (const node of nodes) {
      if (node.type !== 'USBController' && node.type !== 'USBHub') {
        results.push(node)
      }
      walk(node.children)
    }
  }
  walk(tree)
  return results
}

/**
 * Returns a map of controllerInstanceId → [leaf devices under it]
 */
export function devicesByController(tree) {
  const map = new Map()
  for (const controller of tree) {
    if (controller.type !== 'USBController') continue
    const devices = []
    walkForDevices(controller.children, devices)
    map.set(controller.instanceId, { controller, devices })
  }
  return map
}

function walkForDevices(nodes, acc) {
  for (const node of nodes) {
    if (node.type !== 'USBController' && node.type !== 'USBHub') {
      acc.push(node)
    }
    walkForDevices(node.children, acc)
  }
}
