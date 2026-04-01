import { TIER } from "./classifier-DolESKBG.js";
import { devicesByController } from "./topologyBuilder-Ce11BBH_.js";
let _warningCounter = 0;
function makeId() {
  return `warn-${++_warningCounter}`;
}
function runRules(tree, classifiedDevices) {
  _warningCounter = 0;
  const warnings = [];
  const deviceById = new Map(classifiedDevices.map((d) => [d.instanceId, d]));
  const ctrlMap = devicesByController(tree);
  for (const [ctrlId, { controller, devices }] of ctrlMap) {
    const highDevices = devices.map((d) => deviceById.get(d.instanceId) || d).filter((d) => d.tier === TIER.HIGH);
    if (highDevices.length >= 2) {
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
    if (device.tier === TIER.HIGH && device.viaHub) {
      warnings.push({
        id: makeId(),
        severity: "critical",
        code: "HIGH_DEV_VIA_HUB",
        title: `High-bandwidth device connected through a hub`,
        detail: `"${device.name}" is plugged into a USB hub rather than directly into the laptop. Hubs share bandwidth across all their ports and add latency, which can degrade performance for storage devices and capture cards.`,
        affectedIds: [device.instanceId]
      });
    }
  }
  for (const device of classifiedDevices) {
    if (device.tier === TIER.MEDIUM && device.viaHub) {
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
  for (const [, { controller, devices }] of ctrlMap) {
    for (const device of devices) {
      if (device.speedMbps && controller.speedMbps && device.speedMbps < controller.speedMbps / 10) {
        const classified = classifiedDevices.find((d) => d.instanceId === device.instanceId);
        if (classified && classified.tier === TIER.HIGH) {
          warnings.push({
            id: makeId(),
            severity: "warning",
            code: "SPEED_MISMATCH",
            title: `High-bandwidth device limited by port speed`,
            detail: `"${device.name}" supports up to ${device.speedMbps} Mbps but the controller reports ${controller.speedMbps} Mbps. This device is running below its maximum capability.`,
            affectedIds: [device.instanceId, controller.instanceId]
          });
        }
      }
    }
  }
  for (const [ctrlId, { controller, devices }] of ctrlMap) {
    if (controller.speedMbps && controller.speedMbps <= 480) {
      const mediumDevices = devices.map((d) => deviceById.get(d.instanceId) || d).filter((d) => d.tier === TIER.MEDIUM);
      if (mediumDevices.length >= 2) {
        warnings.push({
          id: makeId(),
          severity: "info",
          code: "MULTI_MEDIUM_USB2",
          title: `Multiple audio/video devices sharing a USB 2.0 controller`,
          detail: `"${mediumDevices.map((d) => d.name).join('" and "')}" are on the same USB 2.0 controller (max ${controller.speedMbps} Mbps). Running them simultaneously may cause audio/video sync issues.`,
          affectedIds: [ctrlId, ...mediumDevices.map((d) => d.instanceId)]
        });
      }
    }
  }
  return warnings;
}
export {
  runRules
};
