let _recCounter = 0;
function makeId() {
  return `rec-${++_recCounter}`;
}
function generateRecommendations(warnings) {
  _recCounter = 0;
  const recs = [];
  for (const warn of warnings) {
    switch (warn.code) {
      case "MULTI_HIGH_SAME_CTRL":
        recs.push({
          id: makeId(),
          warningId: warn.id,
          priority: 1,
          title: "Spread high-bandwidth devices across controllers",
          steps: [
            "Connect one of the high-bandwidth devices to a different physical USB port (check if your laptop has ports on both sides — they may use different controllers).",
            "If your laptop has a Thunderbolt/USB-C port, prefer it for the highest-demand device (SSD or capture card) — it typically has a dedicated controller.",
            "Avoid using a USB hub for any storage drive or capture card.",
            "If only one controller is available, do not run all high-bandwidth devices simultaneously."
          ],
          canDisable: false,
          affectedIds: warn.affectedIds
        });
        break;
      case "HIGH_DEV_VIA_HUB":
        recs.push({
          id: makeId(),
          warningId: warn.id,
          priority: 1,
          title: "Plug the device directly into the laptop",
          steps: [
            "Remove the device from the USB hub.",
            "Connect it directly to a USB port on the laptop chassis.",
            "Prefer a USB 3.x (blue or teal) port for drives and capture cards.",
            "Reserve the hub for low-bandwidth peripherals like keyboards and mice."
          ],
          canDisable: false,
          affectedIds: warn.affectedIds
        });
        break;
      case "MEDIUM_DEV_VIA_HUB":
        recs.push({
          id: makeId(),
          warningId: warn.id,
          priority: 2,
          title: "Move audio/video device off the hub if issues occur",
          steps: [
            "If you experience audio glitches or webcam frame drops, try plugging the device directly into the laptop.",
            "USB hubs can introduce latency that affects real-time audio and video.",
            "Keep low-bandwidth devices (keyboard, mouse) on the hub instead."
          ],
          canDisable: false,
          affectedIds: warn.affectedIds
        });
        break;
      case "SPEED_MISMATCH":
        recs.push({
          id: makeId(),
          warningId: warn.id,
          priority: 2,
          title: "Connect device to a faster port",
          steps: [
            "Check if your laptop has USB 3.0/3.1/3.2 or USB-C / Thunderbolt ports — they run at 5–40 Gbps versus 480 Mbps for USB 2.0.",
            "Look for a port with a blue insert (USB 3.0) or the SS (SuperSpeed) label.",
            "Reconnect the device to that faster port for optimal transfer speeds."
          ],
          canDisable: false,
          affectedIds: warn.affectedIds
        });
        break;
      case "MULTI_MEDIUM_USB2":
        recs.push({
          id: makeId(),
          warningId: warn.id,
          priority: 3,
          title: "Reduce simultaneous audio/video devices on USB 2.0",
          steps: [
            "If you experience sync issues, disconnect devices you are not actively using.",
            "Move one device to a USB 3.x port if available — USB 3 controllers are typically separate from USB 2 ones.",
            "Consider a dedicated USB audio interface with its own USB controller path."
          ],
          canDisable: false,
          affectedIds: warn.affectedIds
        });
        break;
      default:
        recs.push({
          id: makeId(),
          warningId: warn.id,
          priority: 3,
          title: "Review USB device placement",
          steps: [
            "Check which physical USB ports are used by high-demand devices.",
            "Consult your laptop's manual to identify which ports share controllers."
          ],
          canDisable: false,
          affectedIds: warn.affectedIds
        });
    }
  }
  return recs.sort((a, b) => a.priority - b.priority);
}
export {
  generateRecommendations
};
