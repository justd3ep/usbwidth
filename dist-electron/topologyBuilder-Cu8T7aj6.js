function buildTopology(devices) {
  const nodeMap = /* @__PURE__ */ new Map();
  for (const device of devices) {
    nodeMap.set(device.instanceId, {
      ...device,
      children: [],
      depth: 0,
      // filled in later
      viaHub: false
      // filled in later
    });
  }
  const roots = [];
  for (const [id, node] of nodeMap) {
    if (!node.parentId || !nodeMap.has(node.parentId)) {
      roots.push(node);
    } else {
      nodeMap.get(node.parentId).children.push(node);
    }
  }
  annotate(roots, 0, false);
  return roots;
}
function annotate(nodes, depth, viaHub) {
  for (const node of nodes) {
    node.depth = depth;
    node.viaHub = viaHub;
    const isHub = node.type === "USBHub" && depth >= 1;
    annotate(node.children, depth + 1, viaHub || isHub);
  }
}
function flattenDevices(tree) {
  const results = [];
  function walk(nodes) {
    for (const node of nodes) {
      if (node.type !== "USBController" && node.type !== "USBHub") {
        results.push(node);
      }
      walk(node.children);
    }
  }
  walk(tree);
  return results;
}
export {
  buildTopology,
  flattenDevices
};
