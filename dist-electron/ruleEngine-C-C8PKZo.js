import { TIER } from "./classifier-DFFWmIRU.js";
import { devicesByController } from "./topologyBuilder-DTJTV21B.js";
let _warningCounter = 0;
function makeId() {
  return `warn-${++_warningCounter}`;
}
function runRules(tree, classifiedDevices) {
  _warningCounter = 0;
  const warnings = [];
  const deviceById = new Map(classifiedDevices.map((d) => [d.instanceId, d]));
  const ctrlMap = devicesByController(tree);
  for (const device of classifiedDevices) {
    device.status = "Normal";
    device.statusMessage = "This device operates at its intended speed and does not impact system performance.";
  }
  const sharedHighControllers = /* @__PURE__ */ new Set();
  for (const [ctrlId, { controller, devices }] of ctrlMap) {
    const highDevices = devices.map((d) => deviceById.get(d.instanceId) || d).filter((d) => d.tier === TIER.HIGH);
    if (highDevices.length >= 2) {
      sharedHighControllers.add(ctrlId);
      warnings.push({
        id: makeId(),
        severity: "critical",
        code: "MULTI_HIGH_SAME_CTRL",
        title: `${highDevices.length} high-bandwidth devices share one controller`,
        detail: `"${highDevices.map((d) => d.name).join('" and "')}" are all on "${controller.name}". Simultaneous use will compete for controller bandwidth and may cause slowdowns, stutters, or data errors.`,
        affectedIds: [ctrlId, ...highDevices.map((d) => d.instanceId)]
      });
    }
  }
  for (const device of classifiedDevices) {
    if (device.isInternal || device.tier === TIER.LOW) {
      continue;
    }
    const isUsb2 = device.speedMbps && device.speedMbps <= 480;
    if (device.tier === TIER.MEDIUM) {
      if (isUsb2) {
        device.status = "Limited";
        device.statusMessage = "This device may be limited by USB 2.0 speeds but is typically sufficient for its function.";
        if (device.viaHub) {
          warnings.push({
            id: makeId(),
            severity: "warning",
            code: "MEDIUM_DEV_VIA_HUB",
            title: `Medium-bandwidth device connected through a hub`,
            detail: `"${device.name}" is on a USB hub. For webcams and audio interfaces this can cause dropped frames or audio glitches under high USB load.`,
            affectedIds: [device.instanceId]
          });
        }
      }
    } else if (device.tier === TIER.HIGH) {
      let isBottleneck = false;
      let msg = "";
      if (isUsb2) {
        isBottleneck = true;
        msg = "This high-speed device is restricted by a slower connection. Performance will be noticeably reduced.";
        warnings.push({
          id: makeId(),
          severity: "warning",
          code: "SPEED_MISMATCH",
          title: `High-bandwidth device limited by port speed`,
          detail: `"${device.name}" supports higher speeds but the connection runs at ${device.speedMbps} Mbps. This device is running below its maximum capability.`,
          affectedIds: [device.instanceId]
        });
      } else if (device.viaHub) {
        isBottleneck = true;
        msg = "This high-speed device is restricted by shared hub bandwidth. Performance will be noticeably reduced.";
        warnings.push({
          id: makeId(),
          severity: "critical",
          code: "HIGH_DEV_VIA_HUB",
          title: `High-bandwidth device connected through a hub`,
          detail: `"${device.name}" is plugged into a USB hub. Hubs share bandwidth across all their ports and add latency, which degrades performance for storage.`,
          affectedIds: [device.instanceId]
        });
      } else {
        for (const [ctrlId, { devices: ctrlDevices }] of ctrlMap) {
          if (sharedHighControllers.has(ctrlId) && ctrlDevices.some((d) => d.instanceId === device.instanceId)) {
            isBottleneck = true;
            msg = "This high-speed device is sharing a controller with other high-speed devices. Performance will be noticeably reduced.";
          }
        }
      }
      if (isBottleneck) {
        device.status = "Bottleneck";
        device.statusMessage = msg;
      }
    }
  }
  return warnings;
}
export {
  runRules
};
