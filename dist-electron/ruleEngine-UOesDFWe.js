import { TIER } from "./classifier-D_aOqHLF.js";
let _warningCounter = 0;
function makeId() {
  return `issue-${++_warningCounter}`;
}
function runRules(tree, classifiedDevices) {
  _warningCounter = 0;
  const issues = [];
  const deviceMap = /* @__PURE__ */ new Map();
  function addToMap(nodes) {
    for (const node of nodes) {
      deviceMap.set(node.instanceId, node);
      if (node.children) addToMap(node.children);
    }
  }
  addToMap(tree);
  for (const device of classifiedDevices) {
    if (device.isInternal) {
      device.status = "NORMAL";
      device.statusMessage = "Operating at expected bandwidth.";
      continue;
    }
    const isBasicType = ["HIDClass", "Bluetooth", "AudioEndpoint"].includes(device.type);
    if (device.tier === TIER.LOW || isBasicType) {
      device.status = "NORMAL";
      device.statusMessage = "Device uses low bandwidth and operates normally.";
      continue;
    }
    let portSpeed = null;
    const parentNode = device.parentId ? deviceMap.set(device.parentId) || deviceMap.get(device.parentId) : null;
    let current = parentNode;
    while (current) {
      if (current.speedMbps && current.speedMbps > 480) {
        portSpeed = current.speedMbps;
        break;
      } else if (current.speedMbps === 480) {
        portSpeed = 480;
      }
      current = current.parentId ? deviceMap.get(current.parentId) : null;
    }
    if (!portSpeed && device.speedMbps) portSpeed = device.speedMbps;
    const isUsb2 = device.speedMbps && device.speedMbps <= 480;
    let source = null;
    if (device.tier === TIER.HIGH && device.viaHub) {
      device.status = "LIMITED";
      device.statusMessage = "Sharing bandwidth via multiple devices on a hub.";
      source = "HUB_LIMITATION";
    } else if (device.tier === TIER.HIGH && isUsb2) {
      device.status = "LIMITED";
      device.statusMessage = "Performance limited by device or cable capability (USB 2.0).";
      source = "DEVICE_LIMITATION";
    } else if (device.tier === TIER.MEDIUM && isUsb2) {
      device.status = "LIMITED";
      device.statusMessage = "Device is operating at USB 2.0 speed (acceptable but limited).";
      source = "DEVICE_LIMITATION";
    } else {
      device.status = "NORMAL";
      device.statusMessage = "Operating at full speed without bottlenecks.";
    }
    if (device.status !== "NORMAL") {
      let summary = "";
      if (source === "HUB_LIMITATION") {
        summary = "Bandwidth is shared via hub";
      } else if (source === "DEVICE_LIMITATION") {
        summary = "Running at reduced speed";
      }
      issues.push({
        id: makeId(),
        severity: "warning",
        // yellow
        status: device.status,
        title: summary,
        detail: device.statusMessage,
        affectedIds: [device.instanceId],
        deviceName: device.name,
        source,
        portCapability: portSpeed,
        deviceCapability: device.speedMbps,
        connectionPath: device.viaHub ? "Via Hub" : "Direct",
        verdict: `Bottleneck Source: ${source === "DEVICE_LIMITATION" ? "DEVICE" : source === "HUB_LIMITATION" ? "HUB" : "SYSTEM"}`,
        verdictVerdict: source === "DEVICE_LIMITATION" ? "DEVICE" : source === "HUB_LIMITATION" ? "HUB" : "SYSTEM"
      });
    }
  }
  return issues;
}
export {
  runRules
};
