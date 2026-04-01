/**
 * linuxDetector.js
 * Reads real USB topology and system info on Linux using:
 *   - /sys/class/dmi/id/  → system info (no sudo)
 *   - /sys/bus/usb/devices/ → USB topology (no sudo)
 *   - `lsusb` → friendly device names (supplementary)
 */

import fs from 'node:fs/promises'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execAsync = promisify(exec)

const DMI_DIR = '/sys/class/dmi/id'
const USB_DIR = '/sys/bus/usb/devices'

// ─── System Info ──────────────────────────────────────────────────────────────

async function readDmiField(field) {
  try {
    const val = await fs.readFile(path.join(DMI_DIR, field), 'utf8')
    return val.trim()
  } catch {
    return null
  }
}

async function getMemoryGB() {
  try {
    const meminfo = await fs.readFile('/proc/meminfo', 'utf8')
    const match = meminfo.match(/MemTotal:\s+(\d+)\s+kB/)
    if (match) {
      return `${(parseInt(match[1]) / 1024 / 1024).toFixed(1)} GB`
    }
  } catch { /* ignore */ }
  return null
}

async function getCpuName() {
  try {
    const cpuinfo = await fs.readFile('/proc/cpuinfo', 'utf8')
    const match = cpuinfo.match(/^model name\s*:\s*(.+)$/m)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

export async function getSystemInfo() {
  const [manufacturer, productName, cpu, totalRam, biosVersion, osRelease] = await Promise.all([
    readDmiField('sys_vendor'),
    readDmiField('product_name'),
    getCpuName(),
    getMemoryGB(),
    readDmiField('bios_version'),
    fs.readFile('/etc/os-release', 'utf8').then(s => {
      const m = s.match(/^PRETTY_NAME="(.+)"$/m)
      return m ? m[1] : null
    }).catch(() => null),
  ])

  return {
    manufacturer: manufacturer || 'Unknown',
    model: productName || 'Unknown',
    cpu: cpu || 'Unknown',
    os: osRelease || 'Linux',
    totalRam: totalRam || 'Unknown',
    biosVersion: biosVersion || '',
  }
}

// ─── lsusb name map ───────────────────────────────────────────────────────────

async function buildLsusbMap() {
  const map = new Map()
  try {
    const { stdout } = await execAsync('lsusb', { timeout: 5000 })
    // Line format: Bus 001 Device 002: ID 046d:c31c Logitech, Inc. Keyboard K120
    for (const line of stdout.split('\n')) {
      const m = line.match(/Bus (\d+) Device (\d+): ID ([0-9a-f]{4}):([0-9a-f]{4})\s+(.*)/)
      if (m) {
        const key = `${parseInt(m[1], 10)}-${parseInt(m[2], 10)}`
        map.set(key, m[5].trim() || null)
      }
    }
  } catch {
    // lsusb not installed or failed — names will come from sysfs only
  }
  return map
}

// ─── USB Topology ─────────────────────────────────────────────────────────────

/**
 * Read a sysfs attribute file for a usb device dir, return trimmed string or null.
 */
async function readAttr(devDir, attr) {
  try {
    const val = await fs.readFile(path.join(USB_DIR, devDir, attr), 'utf8')
    return val.trim()
  } catch {
    return null
  }
}

/**
 * Determine USB speed in Mbps from the sysfs `speed` file (value is in Mb/s).
 */
function parseSpeedMbps(speedStr) {
  if (!speedStr) return null
  const n = parseFloat(speedStr)
  return isNaN(n) ? null : n
}

/**
 * Determine USB device type heuristic from sysfs bDeviceClass / idVendor / product.
 */
async function guessType(devDir) {
  const cls = await readAttr(devDir, 'bDeviceClass')
  // USB Class codes: https://www.usb.org/defined-class-codes
  const CLASS_MAP = {
    '00': 'unknown',       // Use interface class
    '01': 'AudioEndpoint',
    '02': 'Modem',
    '03': 'HIDClass',
    '05': 'HIDClass',      // physical
    '06': 'ImageDevice',   // still image (cameras)
    '07': 'Printer',
    '08': 'DiskDrive',     // mass storage
    '09': 'USBHub',
    '0a': 'Modem',
    '0b': 'SmartCard',
    '0e': 'ImageDevice',   // video (webcam)
    '10': 'AudioEndpoint', // audio/video
    'e0': 'Bluetooth',
    'ef': 'Miscellaneous',
    'ff': 'VendorSpecific',
  }
  return CLASS_MAP[cls?.toLowerCase()] || 'USBDevice'
}

export async function getUsbDevices() {
  let entries
  try {
    entries = await fs.readdir(USB_DIR)
  } catch {
    return []
  }

  const lsusbMap = await buildLsusbMap()
  const devices = []

  for (const entry of entries) {
    // sysfs usb device naming:
    //   usb1         → root hub / controller alias (busnum=1)
    //   1-0:1.0      → config interfaces — skip
    //   1-1          → device on bus1 port1
    //   1-1.2        → device on bus1 hub-port1 sub-port2
    if (entry.includes(':')) continue  // skip interface descriptors

    const [busRaw, ...portParts] = entry.split('-')
    const busNum = parseInt(busRaw.replace('usb', ''), 10)
    if (isNaN(busNum)) continue

    const isRootHub = entry.startsWith('usb')  // e.g. usb1
    const devNumStr  = await readAttr(entry, 'devnum')
    const devNum     = devNumStr ? parseInt(devNumStr, 10) : 0
    const speedStr   = await readAttr(entry, 'speed')
    const speedMbps  = parseSpeedMbps(speedStr)
    const product    = await readAttr(entry, 'product')
    const mfr        = await readAttr(entry, 'manufacturer')
    const idVendor   = await readAttr(entry, 'idVendor')
    const idProduct  = await readAttr(entry, 'idProduct')
    const removableStr = await readAttr(entry, 'removable')

    // Friendly name: lsusb > product attr > vendor:product id
    const lsusbKey = `${busNum}-${devNum}`
    const lsusbName = lsusbMap.get(lsusbKey)
    let name = lsusbName || product || (idVendor && idProduct ? `USB Device ${idVendor}:${idProduct}` : entry)

    // Normalize legacy USB 3.x strings to USB 3.2
    if (name) {
      name = name.replace(/USB\s*3\.1\s*Gen\s*2/ig, 'USB 3.2 Gen 2')
                 .replace(/USB\s*3\.1\s*Gen\s*1/ig, 'USB 3.2 Gen 1')
                 .replace(/USB\s*3\.0/ig, 'USB 3.2 Gen 1')
    }

    // Parent ID: derive from path
    // e.g. 1-1.2 → parent is 1-1 (the hub)
    //      1-1   → parent is usb1 (root hub)
    //      usb1  → no parent (it's the controller)
    let parentId = null
    let type = 'USBDevice'

    if (isRootHub) {
      type = 'USBController'
      parentId = null
    } else {
      const portPath = portParts.join('-')  // e.g. "1" or "1.2"
      const portSegments = portPath.split('.')

      if (portSegments.length === 1) {
        // Direct child of root hub: parent = usb{busNum}
        parentId = `usb${busNum}`
        type = await guessType(entry)

        // If it's a hub, mark it (but not root hub — those are USBController)
        if (type === 'USBHub') {
          type = 'USBHub'
        }
      } else {
        // Downstream of an external hub: parent= bus-port1.port2...portN-1
        portSegments.pop()
        parentId = `${busNum}-${portSegments.join('.')}`
        type = await guessType(entry)
      }
    }

    // Internal device heuristic
    const isInternal =
      removableStr === 'fixed' ||
      /\b(bluetooth|integrated|built-in|internal|touchpad)\b/i.test(name) ||
      type === 'Bluetooth'

    devices.push({
      instanceId: entry,
      type,
      name: mfr ? `${mfr} ${name}` : name,
      parentId,
      speedMbps,
      idVendor: idVendor || null,
      idProduct: idProduct || null,
      isInternal,
    })
  }

  // Sort so controllers first, then hubs, then devices
  const ORDER = { USBController: 0, USBHub: 1 }
  devices.sort((a, b) => (ORDER[a.type] ?? 2) - (ORDER[b.type] ?? 2))

  return devices
}
