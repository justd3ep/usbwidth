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
      title: "USB Controller Load Is High",
      steps: [
        "Disconnect unused high-bandwidth devices to reduce controller load",
        "If available, try moving some devices to a different USB controller"
      ]
    });
  } else if (hasHubLimitation || hasDeviceLimitation) {
    if (hasHubLimitation) {
      recs.push({
        id: makeId(),
        priorityTag: "OPTIONAL",
        title: "Improve Hub Performance (Optional)",
        steps: [
          "For your fastest devices, connecting directly to your laptop instead of through a hub may improve transfer speeds",
          "This is not required — most devices work normally through a hub"
        ]
      });
    }
    if (hasDeviceLimitation) {
      recs.push({
        id: makeId(),
        priorityTag: "OPTIONAL",
        title: "Get Faster File Transfers (Optional)",
        steps: [
          "If you need faster file transfer speeds, consider using a USB 3.0 or higher storage device",
          "Your current setup is working normally — this is only needed if you want faster speeds"
        ]
      });
    }
  }
  if (!hasSystemLimitation && !hasHubLimitation && !hasDeviceLimitation) {
    recs.push({
      id: makeId(),
      priorityTag: "INFO",
      title: "Your USB Setup Is Optimal",
      steps: [
        "All devices are running at their expected speed.",
        "No changes are needed. Everything is working as it should."
      ]
    });
  }
  return recs;
}
export {
  generateRecommendations
};
