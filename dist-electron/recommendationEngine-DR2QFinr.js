let _recCounter = 0;
function makeId() {
  return `rec-${++_recCounter}`;
}
function generateRecommendations(issues) {
  _recCounter = 0;
  const recs = [];
  const hasDeviceLimitation = issues.some((i) => i.source === "DEVICE_LIMITATION");
  const hasHubLimitation = issues.some((i) => i.source === "HUB_LIMITATION");
  const hasSystemLimitation = issues.some((i) => i.source === "SYSTEM_LIMITATION");
  if (hasSystemLimitation) {
    recs.push({
      id: makeId(),
      priorityTag: "IMPORTANT",
      title: "Reduce Overall System Load",
      steps: [
        "Disconnect high-bandwidth devices when not in use",
        "Move some devices to a different internal controller if possible"
      ]
    });
  } else if (hasHubLimitation || hasDeviceLimitation) {
    if (hasHubLimitation) {
      recs.push({
        id: makeId(),
        priorityTag: "IMPORTANT",
        title: "Optimize Hub Connections",
        steps: [
          "Connect high-speed devices directly instead of using a hub",
          "Use a powered hub if power delivery is limiting bandwidth"
        ]
      });
    }
    if (hasDeviceLimitation) {
      recs.push({
        id: makeId(),
        priorityTag: "OPTIONAL",
        title: "Upgrade Slower Devices",
        steps: [
          "Use a USB 3.0+ device to achieve higher speeds",
          "Move device to a lower-tier port to free up high-speed ports for demanding devices"
        ]
      });
    }
  }
  if (!hasSystemLimitation && !hasHubLimitation && !hasDeviceLimitation) {
    recs.push({
      id: makeId(),
      priorityTag: "INFO",
      title: "Optimal USB Topology",
      steps: [
        "No configuration bottlenecks detected.",
        "All devices have sufficient bandwidth for their tier."
      ]
    });
  }
  return recs;
}
export {
  generateRecommendations
};
