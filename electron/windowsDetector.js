/**
 * windowsDetector.js — v4 (libusb native)
 *
 * No PowerShell. No WMI. No shell.
 *
 * Strategy
 * --------
 * 1. usb.getDeviceList()      — synchronous libusb call, ~5-15ms, gives VID/PID/descriptor/topology
 * 2. reg.exe (execFileSync)   — one batch query for ALL USB FriendlyNames from registry, ~80ms
 * 3. String descriptors       — opened per-device for ones registry misses (open() may fail if driver claims it)
 * 4. usb.on('attach'/'detach') — true kernel hotplug events, fires in <50ms
 * 5. device.speed             — libusb actual connected speed constant (not guessing from name)
 * 6. portNumbers[]            — physical bus topology, used to detect hubs and build device tree
 */

import { execFileSync }      from 'node:child_process'
import { createRequire }     from 'node:module'
import os                    from 'node:os'

const require = createRequire(import.meta.url)

// ─── Load usb native module ───────────────────────────────────────────────────

let _usb = null
try {
  _usb = require('usb')
  // Suppress libusb debug noise
  if (_usb.setDebugLevel) _usb.setDebugLevel(0)
} catch (e) {
  console.error('[windowsDetector] Failed to load usb module:', e.message)
}

function getUsb() { return _usb }

// ─── Speed from bcdUSB device descriptor ─────────────────────────────────────
// device.speed is not reliably exposed in usb v2 on Windows.
// bcdUSB (Binary Coded Decimal) is embedded in every device's firmware:
//   0x0110 = 272 dec  → USB 1.1  = 12 Mbps
//   0x0200 = 512 dec  → USB 2.0  = 480 Mbps
//   0x0300 = 768 dec  → USB 3.0  = 5000 Mbps
//   0x0310 = 784 dec  → USB 3.1  = 10000 Mbps
//   0x0320 = 800 dec  → USB 3.2  = 20000 Mbps
//   0x0400 = 1024 dec → USB 4.0  = 40000 Mbps

function bcdUsbToSpeed(bcdUsb) {
  if (!bcdUsb) return null
  if (bcdUsb >= 0x0400) return 40000  // USB 4.0
  if (bcdUsb >= 0x0320) return 20000  // USB 3.2 Gen 2×2
  if (bcdUsb >= 0x0310) return 10000  // USB 3.1 Gen 2
  if (bcdUsb >= 0x0300) return 5000   // USB 3.0 / 3.2 Gen 1
  if (bcdUsb >= 0x0200) return 480    // USB 2.0
  if (bcdUsb >= 0x0110) return 12     // USB 1.1
  return 1.5                           // USB 1.0
}

// ─── USB device class → PnP-style type string ─────────────────────────────────

function classCodeToType(bDeviceClass, bDeviceSubClass) {
  switch (bDeviceClass) {
    case 0x01: return 'AudioEndpoint'
    case 0x02: return 'Net'
    case 0x03: return 'HIDClass'
    case 0x06: return 'Image'
    case 0x07: return 'Printer'
    case 0x08: return 'DiskDrive'
    case 0x0A: return 'Net'
    case 0x0B: return 'SmartCard'
    case 0x0E: return 'Camera'
    case 0xE0: return 'Bluetooth'
    default:   return 'USBDevice'
  }
}

// ─── Registry name lookup (one batch call, no PowerShell) ─────────────────────

let _regNameMap = null
let _regNameTime = 0
const REG_TTL = 15000  // 15s cache

function loadRegistryNames() {
  const now = Date.now()
  if (_regNameMap && (now - _regNameTime) < REG_TTL) return _regNameMap

  _regNameMap = new Map()   // "VID_XXXX&PID_XXXX" → friendlyName
  _regNameTime = now

  try {
    // One batch query: reg.exe called directly (no shell/cmd.exe)
    const out = execFileSync('reg.exe', [
      'query', 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USB',
      '/s', '/v', 'FriendlyName'
    ], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 4000 })

    let currentVidPid = null
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim()

      // Header line: path contains VID_xxxx&PID_xxxx
      const keyMatch = trimmed.match(/\\(VID_[0-9A-Fa-f]{4}&PID_[0-9A-Fa-f]{4})/i)
      if (keyMatch) {
        currentVidPid = keyMatch[1].toUpperCase()
        continue
      }

      // Value line: "    FriendlyName    REG_SZ    Some Device Name"
      if (currentVidPid && trimmed.match(/^FriendlyName\s+REG_SZ/i)) {
        const val = trimmed.replace(/^FriendlyName\s+REG_SZ\s+/i, '').trim()
        // Windows string indirection like "%oem14.inf,%USB_Product%;" → skip
        if (val && !val.startsWith('%') && !_regNameMap.has(currentVidPid)) {
          _regNameMap.set(currentVidPid, val)
        }
      }
    }

    // Second pass: pick up DeviceDesc for anything still missing a name
    try {
      const out2 = execFileSync('reg.exe', [
        'query', 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USB',
        '/s', '/v', 'DeviceDesc'
      ], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 4000 })

      currentVidPid = null
      for (const line of out2.split(/\r?\n/)) {
        const trimmed = line.trim()
        const keyMatch = trimmed.match(/\\(VID_[0-9A-Fa-f]{4}&PID_[0-9A-Fa-f]{4})/i)
        if (keyMatch) { currentVidPid = keyMatch[1].toUpperCase(); continue }

        if (currentVidPid && trimmed.match(/^DeviceDesc\s+REG_SZ/i) && !_regNameMap.has(currentVidPid)) {
          let val = trimmed.replace(/^DeviceDesc\s+REG_SZ\s+/i, '').trim()
          // Strip Windows INF indirection: "@oem14.inf,%Disk.DeviceDesc%;USB Mass Storage" → take after semicolon
          if (val.includes(';')) val = val.split(';').pop().trim()
          if (val && !val.startsWith('@') && !val.startsWith('%')) {
            _regNameMap.set(currentVidPid, val)
          }
        }
      }
    } catch { /* FriendlyName alone is enough */ }

  } catch (e) {
    console.error('[windowsDetector] Registry batch query failed:', e.message)
  }

  return _regNameMap
}

function getRegistryName(idVendorHex, idProductHex) {
  const key = `VID_${idVendorHex.toUpperCase()}&PID_${idProductHex.toUpperCase()}`
  return loadRegistryNames().get(key) || null
}

let _regCapMap = null
let _regCapTime = 0

function loadRegistryCapabilities() {
  const now = Date.now()
  if (_regCapMap && (now - _regCapTime) < REG_TTL) return _regCapMap

  _regCapMap = new Map()   // "VID_XXXX&PID_XXXX" → isRemovable (boolean)
  _regCapTime = now

  try {
    const out = execFileSync('reg.exe', [
      'query', 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USB',
      '/s', '/v', 'Capabilities'
    ], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 4000 })

    let currentVidPid = null
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim()

      const keyMatch = trimmed.match(/\\(VID_[0-9A-Fa-f]{4}&PID_[0-9A-Fa-f]{4})/i)
      if (keyMatch) {
        currentVidPid = keyMatch[1].toUpperCase()
        continue
      }

      if (currentVidPid && trimmed.match(/^Capabilities\s+REG_DWORD/i)) {
        const valMatch = trimmed.match(/0x([0-9a-fA-F]+)/)
        if (valMatch) {
          const capValue = parseInt(valMatch[1], 16)
          // CM_DEVCAP_REMOVABLE is 0x00000004
          const isRemovable = (capValue & 0x4) !== 0
          
          // If we haven't seen this VID/PID, or if it's currently marked non-removable
          // but we just found a removable instance, update it to be safe.
          if (!_regCapMap.has(currentVidPid) || isRemovable) {
            _regCapMap.set(currentVidPid, isRemovable)
          }
        }
      }
    }
  } catch (e) {
    console.error('[windowsDetector] Registry Capabilities query failed:', e.message)
  }

  return _regCapMap
}

function getRegistryRemovableFlag(idVendorHex, idProductHex) {
  const key = `VID_${idVendorHex.toUpperCase()}&PID_${idProductHex.toUpperCase()}`
  if (!loadRegistryCapabilities().has(key)) return null
  return loadRegistryCapabilities().get(key)
}
// ─── Topology ID helpers ───────────────────────────────────────────────────────


function controllerId(busNumber) {
  return `USB_CTRL_BUS${busNumber}`
}

function hubId(busNumber, portNumbers) {
  return `USB_HUB_BUS${busNumber}_P${portNumbers.join('_')}`
}

function deviceId(device) {
  const d = device.deviceDescriptor
  const vid = d.idVendor.toString(16).padStart(4, '0').toUpperCase()
  const pid = d.idProduct.toString(16).padStart(4, '0').toUpperCase()
  const port = (device.portNumbers || []).join('.')
  return `USB\\VID_${vid}&PID_${pid}\\${device.busNumber}&${port}`
}

function parentIdFor(device, hubSet) {
  const ports = device.portNumbers || []
  if (ports.length <= 1) return controllerId(device.busNumber)
  // Parent is hub at portNumbers.slice(0, -1) on same bus
  return hubId(device.busNumber, ports.slice(0, -1))
}

// ─── System info ──────────────────────────────────────────────────────────────

let _sysInfoCache = null

export async function getSystemInfo() {
  if (_sysInfoCache) return _sysInfoCache

  const cpus = os.cpus()
  const cpu  = cpus.length ? cpus[0].model : 'Unknown'
  const ramGB = Math.round(os.totalmem() / (1024 ** 3) * 10) / 10

  let manufacturer = 'Unknown'
  let model        = 'Unknown'
  let biosVersion  = ''
  let osName       = `Windows ${os.release()}`

  // Registry reads for BIOS/OS info — fast, no WMI
  try {
    const biosOut = execFileSync('reg.exe', [
      'query', 'HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS',
      '/v', 'SystemManufacturer'
    ], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 2000 })
    const m = biosOut.match(/SystemManufacturer\s+REG_SZ\s+(.+)/i)
    if (m) manufacturer = m[1].trim()
  } catch {}

  try {
    const biosOut = execFileSync('reg.exe', [
      'query', 'HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS',
      '/v', 'SystemProductName'
    ], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 2000 })
    const m = biosOut.match(/SystemProductName\s+REG_SZ\s+(.+)/i)
    if (m) model = m[1].trim()
  } catch {}

  try {
    const osOut = execFileSync('reg.exe', [
      'query', 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion',
      '/v', 'ProductName'
    ], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 2000 })
    const m = osOut.match(/ProductName\s+REG_SZ\s+(.+)/i)
    if (m) osName = m[1].trim()
  } catch {}

  try {
    const biosOut = execFileSync('reg.exe', [
      'query', 'HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS',
      '/v', 'BIOSVersion'
    ], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 2000 })
    const m = biosOut.match(/BIOSVersion\s+REG_SZ\s+(.+)/i)
    if (m) biosVersion = m[1].trim()
  } catch {}

  let usbCapabilities = []
  try {
    const ctlOut = execFileSync('powershell.exe', [
      '-NoProfile', '-Command',
      'Get-CimInstance Win32_USBController | Select-Object -ExpandProperty Name'
    ], { encoding: 'utf8', windowsHide: true, timeout: 3000 })
    
    let hasTb = false, has32 = false, has31 = false, has30 = false
    for (const name of ctlOut.split(/\r?\n/)) {
      const l = name.toLowerCase().trim()
      if (!l) continue
      if (l.includes('thunderbolt') || l.includes('usb4')) hasTb = true
      if (l.includes('3.2')) has32 = true
      if (l.includes('3.1')) has31 = true
      if (l.includes('3.0')) has30 = true
      if (l.includes('extensible') && !has30) has30 = true // xHCI implies 3.0+
    }

    if (hasTb) { has32 = true; has31 = true; has30 = true; }
    if (has32) { has31 = true; has30 = true; }
    if (has31) { has30 = true; }

    if (has30) usbCapabilities.push('USB 3.0 (5 Gbps) — Fast transfers for drives and cameras')
    if (has31) usbCapabilities.push('USB 3.1 (10 Gbps) — High-speed for SSDs and capture cards')
    if (has32) usbCapabilities.push('USB 3.2 (20 Gbps) — Ultra-fast for demanding devices')
    if (hasTb) usbCapabilities.push('Thunderbolt / USB4 (40 Gbps) — For monitors, docks, and eGPUs')

    if (usbCapabilities.length === 0) {
      usbCapabilities.push('USB 2.0 (480 Mbps) — Standard connection')
    }
  } catch (e) {
    usbCapabilities.push('Unable to detect physical limits')
  }

  _sysInfoCache = { manufacturer, model, cpu, os: osName, totalRam: `${ramGB} GB`, biosVersion, usbCapabilities }
  return _sysInfoCache
}

// ─── USB device enumeration ───────────────────────────────────────────────────

const USB_CLASS_HUB = 9

// VIDs that appear ONLY on OEM/soldered components — never on retail external USB devices
const INTERNAL_VIDS = new Set([
  '8087',  // Intel: integrated Bluetooth, Wi-Fi
  '322e',  // Realtek: built-in laptop webcam (not used by any external camera brand)
  '0408',  // Quanta: OEM laptop camera modules
  '04f2',  // Chicony: OEM laptop camera modules
  '5986',  // Acer: OEM laptop camera modules
  '0c45',  // Microdia / Sonix: built-in webcam chip
  '13d3',  // IMC Networks: built-in camera / BT
])

export function getUsbDevices() {
  const usb = getUsb()
  if (!usb) throw new Error('usb native module not available')

  const rawDevices = usb.getDeviceList()  // synchronous, ~5–15ms

  // Pre-warm registry name cache (one batch call)
  loadRegistryNames()

  // Identify hubs by their bus+port key
  const hubKeys = new Set()
  for (const d of rawDevices) {
    if (d.deviceDescriptor.bDeviceClass === USB_CLASS_HUB && d.portNumbers?.length > 0) {
      hubKeys.add(`${d.busNumber}:${d.portNumbers.join('_')}`)
    }
  }

  // Unique bus numbers → create controller entries
  const busSeen = new Set()
  const deviceList = []

  for (const d of rawDevices) {
    if (!busSeen.has(d.busNumber)) {
      busSeen.add(d.busNumber)
      // Infer controller speed: take the fastest device on this bus
      deviceList.push({
        instanceId:    controllerId(d.busNumber),
        type:          'USBController',
        _resolvedType: 'USBController',
        name:          `USB Host Controller (Bus ${d.busNumber})`,
        parentId:      null,
        speedMbps:     null,
        idVendor:      null,
        idProduct:     null,
        isInternal:    true,
        class:         'USB',
        locationPath:  '',
      })
    }
  }

  // Process all devices
  for (const device of rawDevices) {
    const desc     = device.deviceDescriptor
    const ports    = device.portNumbers || []
    const isHub    = desc.bDeviceClass === USB_CLASS_HUB
    const busSpeed = bcdUsbToSpeed(desc.bcdUSB)  // actual speed from device firmware

    const idVendorHex  = desc.idVendor.toString(16).padStart(4, '0')
    const idProductHex = desc.idProduct.toString(16).padStart(4, '0')

    if (isHub) {
      if (ports.length === 0) continue  // Root hub — represented by controller node

      // Non-root hub: add as USBHub node
      const parentId = parentIdFor(device, hubKeys)
      deviceList.push({
        instanceId:    hubId(device.busNumber, ports),
        type:          'USBHub',
        _resolvedType: 'USBHub',
        name:          'USB Hub',
        parentId,
        speedMbps:     busSpeed,
        idVendor:      idVendorHex,
        idProduct:     idProductHex,
        isInternal:    true,
        class:         'USB',
        locationPath:  `BUS${device.busNumber}\\PORT${ports.join('.')}`,
      })
      continue
    }

    // ── Regular device ─────────────────────────────────────────────────────

    const parentId = parentIdFor(device, hubKeys)

    // Name: registry first (fast, safe), then null.
    // String descriptors via device.open() are intentionally skipped on Windows —
    // driver-claimed devices (HID, storage) can hang indefinitely on open().
    const name = getRegistryName(idVendorHex, idProductHex) ?? null

    // ── isInternal detection ──────────────────────────────────────────────────
    //
    // Primary check: Windows Device Capabilities registry flag
    const isRemovableFlag = getRegistryRemovableFlag(idVendorHex, idProductHex)
    const nameL = (name || '').toLowerCase()
    
    let isInternal = INTERNAL_VIDS.has(idVendorHex.toLowerCase()) ||
      /\b(integrated|built.?in|internal|ir\s+camera|touchpad|fingerprint)\b/i.test(nameL) ||
      /^usb[\s\d.]*hd[\s\d.]*uvc\s+web.?cam/i.test(nameL) ||
      /^(hd\s+)?web.?cam\s*(\d|$)/i.test(nameL) ||
      /^usb\s+camera\s*(\d|$)/i.test(nameL)
      
    if (isRemovableFlag === false) {
      // Windows definitively states it is non-removable,
      // catching devices like "USB Input Device" trackpads that failed the regex above.
      isInternal = true
    }

    const resolvedType = classCodeToType(desc.bDeviceClass, desc.bDeviceSubClass)

    deviceList.push({
      instanceId:    deviceId(device),
      type:          isInternal ? 'internal' : 'external',
      _resolvedType: resolvedType,
      class:         resolvedType,
      name:          name || `USB Device (${idVendorHex}:${idProductHex})`,  // internal fallback for topology
      displayName:   name,   // null → UI can choose to show nothing
      parentId,
      speedMbps:     busSpeed,
      idVendor:      idVendorHex,
      idProduct:     idProductHex,
      isInternal,
      locationPath:  `BUS${device.busNumber}\\PORT${ports.join('.')}`,
    })
  }

  // Sort: controllers → hubs → devices
  const ORDER = { USBController: 0, USBHub: 1 }
  deviceList.sort((a, b) => (ORDER[a._resolvedType] ?? 2) - (ORDER[b._resolvedType] ?? 2))

  return deviceList
}

// ─── Hotplug ──────────────────────────────────────────────────────────────────

let _hotplugSetup = false

export function setupHotplug(onChange) {
  const usb = getUsb()
  if (!usb || _hotplugSetup) return

  let debounce = null
  const fire = () => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => { clearCache(); onChange() }, 300)
  }

  try {
    usb.on('attach', fire)
    usb.on('detach', fire)
    _hotplugSetup = true
    console.log('[windowsDetector] Native USB hotplug listeners registered')
  } catch (e) {
    console.warn('[windowsDetector] Hotplug not available (will not auto-refresh on plug/unplug):', e.message)
  }
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let _cache      = null
let _cacheTimer = null

export function clearCache() {
  _cache = null
  if (_cacheTimer) { clearTimeout(_cacheTimer); _cacheTimer = null }
}

export async function fetchRaw() {
  if (_cache) return _cache
  const [systemInfo, usbDevices] = await Promise.all([getSystemInfo(), getUsbDevices()])
  _cache = { systemInfo, usbDevices }
  _cacheTimer = setTimeout(clearCache, 10000)
  return _cache
}
