/**
 * classifier.js
 * Classifies each device into a bandwidth tier:
 *   LOW    – keyboard, mouse, HID (< 5 MB/s practical)
 *   MEDIUM – webcam, audio, microphone (5–50 MB/s)
 *   HIGH   – SSD, NVMe, capture card, dock (100+ MB/s)
 */

const TIER = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
}

/** USB device type → tier */
const TYPE_MAP = {
  Keyboard: TIER.LOW,
  Mouse: TIER.LOW,
  HIDClass: TIER.LOW,
  AudioEndpoint: TIER.MEDIUM,
  DiskDrive: TIER.HIGH,
  ImageDevice: TIER.MEDIUM, // default for image devices
}

/** Name substrings → tier overrides (case-insensitive) */
const NAME_RULES = [
  // HIGH
  { pattern: /\b(ssd|nvme|m\.2|thumb|flash|extreme|portable.*drive|hard.*drive|disk|sata|mass.*storage)\b/i, tier: TIER.HIGH },
  { pattern: /\b(capture|stream|elgato|avermedia|magewell|video.*grab)\b/i, tier: TIER.HIGH },
  { pattern: /\b(dock(ing)?|hub.*dock|thunderbolt)\b/i, tier: TIER.HIGH },
  // MEDIUM
  { pattern: /\b(webcam|cam|camera)\b/i, tier: TIER.MEDIUM },
  { pattern: /\b(audio|headset|microphone|mic|speaker|dac|soundcard)\b/i, tier: TIER.MEDIUM },
  { pattern: /\b(midi|interface)\b/i, tier: TIER.MEDIUM },
  // LOW
  { pattern: /\b(keyboard|kbd)\b/i, tier: TIER.LOW },
  { pattern: /\b(mouse|trackpad|trackball|pointer)\b/i, tier: TIER.LOW },
  { pattern: /\b(numpad|joystick|gamepad|controller)\b/i, tier: TIER.LOW },
  { pattern: /\b(bluetooth|bt.*adapter|fingerprint|card.*reader|nfc)\b/i, tier: TIER.LOW },
]

/**
 * Classify a single device node.
 * @param {Object} device – node from topologyBuilder
 * @returns {Object} device with added `tier`, `tierReason`
 */
export function classifyDevice(device) {
  const name = device.name || ''

  // Name-based rules take highest priority
  for (const rule of NAME_RULES) {
    if (rule.pattern.test(name)) {
      device.tier = rule.tier
      device.tierReason = `name match: ${rule.pattern}`
      return device
    }
  }

  // Fall back to USB type
  const typeTier = TYPE_MAP[device.type]
  if (typeTier) {
    device.tier = typeTier
    device.tierReason = `type: ${device.type}`
    return device
  }

  // Unknown → treat as MEDIUM to be cautious
  device.tier = TIER.MEDIUM
  device.tierReason = 'unknown – defaulted to MEDIUM'
  return device
}

/**
 * Classify all leaf devices in a flat list.
 */
export function classifyAll(devices) {
  return devices.map(classifyDevice)
}

export { TIER }
