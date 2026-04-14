/**
 * classifier.js
 *
 * Assigns each device a profile (type category + tier) using name-pattern
 * matching and USB class codes.
 *
 * Intentionally does NOT make assumptions about required bandwidth —
 * we don't have reliable capability data from sysfs alone.
 * Status evaluation (ADEQUATE vs LIMITED) is the rule engine's job.
 */

// ─── Tier enum ────────────────────────────────────────────────────────────────

export const TIER = {
  LOW:    'LOW',    // audio, HID, Bluetooth — safely low bandwidth by design
  MEDIUM: 'MEDIUM', // webcams, printers — moderate bandwidth
  HIGH:   'HIGH',   // storage, capture cards — want USB 3.x
}

// ─── Status enum ──────────────────────────────────────────────────────────────

export const STATUS = {
  ADEQUATE: 'ADEQUATE', // working as expected for this device type
  LIMITED:  'LIMITED',  // confirmed performance limitation (only when certain)
}

// ─── Safe-by-default profile keys ─────────────────────────────────────────────
//
// Devices in this set are NEVER flagged LIMITED regardless of connection speed.
// Their design bandwidth is far below even USB 1.1.
export const SAFE_PROFILES = new Set([
  'audio',
  'midi',
  'keyboard',
  'mouse',
  'gamepad',
  'bluetooth',
  'smartcard',
  'hid',
])

// ─── Profile definitions ──────────────────────────────────────────────────────
//
// Each profile defines:
//   tier   – used for the "Bandwidth Use" column badge in the topology tree
//   label  – human-readable device category label

const PROFILES = {
  // ── Input / HID ──────────────────────────────────────────────────────────
  hid:      { tier: TIER.LOW,    label: 'Input Device'       },
  keyboard: { tier: TIER.LOW,    label: 'Keyboard'           },
  mouse:    { tier: TIER.LOW,    label: 'Pointer Device'     },
  gamepad:  { tier: TIER.LOW,    label: 'Game Controller'    },

  // ── Audio ─────────────────────────────────────────────────────────────────
  // USB audio is designed for USB 1.1 Full Speed.
  // USB 2.0 is 40× more than it will ever need. Never flag these.
  audio:    { tier: TIER.LOW,    label: 'Audio Device'       },

  // ── Bluetooth / Wireless ──────────────────────────────────────────────────
  bluetooth: { tier: TIER.LOW,   label: 'Bluetooth Adapter'  },

  // ── Smart Card / Security ─────────────────────────────────────────────────
  smartcard: { tier: TIER.LOW,   label: 'Smart Card'         },

  // ── MIDI / Audio Interfaces ───────────────────────────────────────────────
  midi:     { tier: TIER.LOW,    label: 'MIDI / Interface'   },

  // ── Webcam / Imaging ─────────────────────────────────────────────────────
  // Standard HD webcams work fine at USB 2.0 (480 Mbps).
  // We can't detect resolution, so we don't flag these.
  webcam:   { tier: TIER.MEDIUM, label: 'Webcam'             },

  // ── Printers ─────────────────────────────────────────────────────────────
  printer:  { tier: TIER.MEDIUM, label: 'Printer'            },

  // ── Mass Storage / Drives ─────────────────────────────────────────────────
  // Storage devices can be limited — but only flag when we have proof.
  // See ruleEngine.js for the exact condition.
  storage:  { tier: TIER.HIGH,   label: 'Storage Device'     },

  // ── Capture Cards / Streaming ─────────────────────────────────────────────
  capture:  { tier: TIER.HIGH,   label: 'Capture Device'     },

  // ── Docks ─────────────────────────────────────────────────────────────────
  dock:     { tier: TIER.HIGH,   label: 'Dock / Hub'         },

  // ── Fallback ──────────────────────────────────────────────────────────────
  // Default to ADEQUATE — do not assume issues without evidence.
  unknown:  { tier: TIER.MEDIUM, label: 'USB Device'         },
}

// ─── Name-pattern → profile key ───────────────────────────────────────────────
// Ordered: most-specific first. First match wins.

const NAME_RULES = [
  // Storage (HIGH)
  { pattern: /\b(ssd|nvme|m\.2|flash|extreme|portable.*drive|hard.*drive|disk|sata|mass.*storage|thumb.*drive|usb.*drive|pen.*drive)\b/i, profile: 'storage' },
  { pattern: /\b(sandisk|seagate|western.*digital|wd.*passport|toshiba.*storage|kingston.*dt)\b/i,                                        profile: 'storage' },

  // Capture (HIGH)
  { pattern: /\b(capture|elgato|avermedia|magewell|video.*grab|stream.*deck|hdmi.*capture)\b/i, profile: 'capture' },

  // Dock (HIGH)
  { pattern: /\b(dock(ing)?|hub.*dock|thunderbolt)\b/i, profile: 'dock' },

  // Webcam (MEDIUM)
  { pattern: /\b(webcam|web.*cam|hd.*cam|brio|c920|c922|c925|c930)\b/i,         profile: 'webcam' },
  { pattern: /\b(camera(?!.*security)|cam(?!\w))\b/i,                            profile: 'webcam' },

  // Printer (MEDIUM)
  { pattern: /\b(printer|hp.*laserjet|epson|canon.*mg|brother.*hl)\b/i,          profile: 'printer' },

  // Audio (LOW — safe, never flag)
  { pattern: /\b(audio|headset|headphone|earphone|earbud|speaker|microphone|mic|dac|soundcard|sound.*blaster|realtek.*audio|usb.*audio|audio.*interface)\b/i, profile: 'audio' },

  // MIDI (LOW — safe)
  { pattern: /\b(midi|focusrite|scarlett|audient|behringer|steinberg|presonus|interface)\b/i, profile: 'midi' },

  // Keyboard (LOW)
  { pattern: /\b(keyboard|kbd|numpad|das.*keyboard|ducky|keychron)\b/i,           profile: 'keyboard' },

  // Mouse / Pointer (LOW)
  { pattern: /\b(mouse|trackpad|trackball|pointer|mx.*master)\b/i,                profile: 'mouse' },

  // Gamepad (LOW)
  { pattern: /\b(joystick|gamepad|controller|xbox.*controller|dualshock|dualsense)\b/i, profile: 'gamepad' },

  // Bluetooth (LOW)
  { pattern: /\b(bluetooth|bt.*adapter|wireless.*adapter|nfc|fingerprint|card.*reader)\b/i, profile: 'bluetooth' },

  // Smart Card (LOW)
  { pattern: /\b(smart.*card|yubikey|security.*key|fido|token)\b/i,               profile: 'smartcard' },
]

// ─── USB class code → profile key ────────────────────────────────────────────

const CLASS_PROFILE = {
  // Linux sysfs types
  AudioEndpoint:  'audio',
  HIDClass:       'hid',
  Keyboard:       'keyboard',
  Mouse:          'mouse',
  DiskDrive:      'storage',
  ImageDevice:    'webcam',
  Printer:        'printer',
  SmartCard:      'smartcard',
  Bluetooth:      'bluetooth',
  Miscellaneous:  'unknown',
  VendorSpecific: 'unknown',
  USBDevice:      'unknown',
  // Windows PnP class names (from Win32_PnPEntity.PNPClass)
  Camera:         'webcam',
  Image:          'webcam',
  Media:          'audio',
  Biometric:      'hid',
  Net:            'unknown',
  WPD:            'storage',   // Windows Portable Devices (phones, cameras with storage)
  SCSIAdapter:    'storage',
  CDROM:          'storage',
  PrintQueue:     'printer',
  SmartCardReader:'smartcard',
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Infer the device profile key from its name and USB class type.
 * Returns a key from PROFILES.
 */
export function inferProfileKey(device) {
  const name = device.name || ''

  // 1. Name-pattern match (highest priority — most specific)
  for (const rule of NAME_RULES) {
    if (rule.pattern.test(name)) return rule.profile
  }

  // 2. USB class fallback
  const classFallback = CLASS_PROFILE[device.type]
  if (classFallback) return classFallback

  return 'unknown'
}

/**
 * Classify a single device node.
 * Attaches: tier, tierReason, profileKey, profileLabel.
 *
 * Does NOT assign status — that is the rule engine's job.
 */
export function classifyDevice(device) {
  const profileKey = inferProfileKey(device)
  const profile    = PROFILES[profileKey] || PROFILES.unknown

  device.profileKey   = profileKey
  device.profileLabel = profile.label
  device.tier         = profile.tier
  device.tierReason   = `profile: ${profileKey}`

  return device
}

/**
 * Classify all leaf devices in a flat list.
 */
export function classifyAll(devices) {
  return devices.map(classifyDevice)
}

export { PROFILES }
