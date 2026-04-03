import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
const execAsync = promisify(exec);
const DMI_DIR = "/sys/class/dmi/id";
const USB_DIR = "/sys/bus/usb/devices";
async function readDmiField(field) {
  try {
    const val = await fs.readFile(path.join(DMI_DIR, field), "utf8");
    return val.trim();
  } catch {
    return null;
  }
}
async function getMemoryGB() {
  try {
    const meminfo = await fs.readFile("/proc/meminfo", "utf8");
    const match = meminfo.match(/MemTotal:\s+(\d+)\s+kB/);
    if (match) {
      return `${(parseInt(match[1]) / 1024 / 1024).toFixed(1)} GB`;
    }
  } catch {
  }
  return null;
}
async function getCpuName() {
  try {
    const cpuinfo = await fs.readFile("/proc/cpuinfo", "utf8");
    const match = cpuinfo.match(/^model name\s*:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}
async function getSystemInfo() {
  const [manufacturer, productName, cpu, totalRam, biosVersion, osRelease] = await Promise.all([
    readDmiField("sys_vendor"),
    readDmiField("product_name"),
    getCpuName(),
    getMemoryGB(),
    readDmiField("bios_version"),
    fs.readFile("/etc/os-release", "utf8").then((s) => {
      const m = s.match(/^PRETTY_NAME="(.+)"$/m);
      return m ? m[1] : null;
    }).catch(() => null)
  ]);
  return {
    manufacturer: manufacturer || "Unknown",
    model: productName || "Unknown",
    cpu: cpu || "Unknown",
    os: osRelease || "Linux",
    totalRam: totalRam || "Unknown",
    biosVersion: biosVersion || ""
  };
}
async function buildLsusbMap() {
  const map = /* @__PURE__ */ new Map();
  try {
    const { stdout } = await execAsync("lsusb", { timeout: 5e3 });
    for (const line of stdout.split("\n")) {
      const m = line.match(/Bus (\d+) Device (\d+): ID ([0-9a-f]{4}):([0-9a-f]{4})\s+(.*)/);
      if (m) {
        const key = `${parseInt(m[1], 10)}-${parseInt(m[2], 10)}`;
        map.set(key, m[5].trim() || null);
      }
    }
  } catch {
  }
  return map;
}
async function readAttr(devDir, attr) {
  try {
    const val = await fs.readFile(path.join(USB_DIR, devDir, attr), "utf8");
    return val.trim();
  } catch {
    return null;
  }
}
function parseSpeedMbps(speedStr) {
  if (!speedStr) return null;
  const n = parseFloat(speedStr);
  return isNaN(n) ? null : n;
}
async function guessType(devDir) {
  const cls = await readAttr(devDir, "bDeviceClass");
  const CLASS_MAP = {
    "00": "unknown",
    // Use interface class
    "01": "AudioEndpoint",
    "02": "Modem",
    "03": "HIDClass",
    "05": "HIDClass",
    // physical
    "06": "ImageDevice",
    // still image (cameras)
    "07": "Printer",
    "08": "DiskDrive",
    // mass storage
    "09": "USBHub",
    "0a": "Modem",
    "0b": "SmartCard",
    "0e": "ImageDevice",
    // video (webcam)
    "10": "AudioEndpoint",
    // audio/video
    "e0": "Bluetooth",
    "ef": "Miscellaneous",
    "ff": "VendorSpecific"
  };
  return CLASS_MAP[cls == null ? void 0 : cls.toLowerCase()] || "USBDevice";
}
async function getUsbDevices() {
  let entries;
  try {
    entries = await fs.readdir(USB_DIR);
  } catch {
    return [];
  }
  const lsusbMap = await buildLsusbMap();
  const devices = [];
  for (const entry of entries) {
    if (entry.includes(":")) continue;
    const [busRaw, ...portParts] = entry.split("-");
    const busNum = parseInt(busRaw.replace("usb", ""), 10);
    if (isNaN(busNum)) continue;
    const isRootHub = entry.startsWith("usb");
    const devNumStr = await readAttr(entry, "devnum");
    const devNum = devNumStr ? parseInt(devNumStr, 10) : 0;
    const speedStr = await readAttr(entry, "speed");
    const speedMbps = parseSpeedMbps(speedStr);
    const product = await readAttr(entry, "product");
    const mfr = await readAttr(entry, "manufacturer");
    const idVendor = await readAttr(entry, "idVendor");
    const idProduct = await readAttr(entry, "idProduct");
    const removableStr = await readAttr(entry, "removable");
    const lsusbKey = `${busNum}-${devNum}`;
    const lsusbName = lsusbMap.get(lsusbKey);
    let name = lsusbName || product || (idVendor && idProduct ? `USB Device ${idVendor}:${idProduct}` : entry);
    if (name) {
      name = name.replace(/USB\s*3\.1\s*Gen\s*2/ig, "USB 3.2 Gen 2").replace(/USB\s*3\.1\s*Gen\s*1/ig, "USB 3.2 Gen 1").replace(/USB\s*3\.0/ig, "USB 3.2 Gen 1");
    }
    let parentId = null;
    let type = "USBDevice";
    if (isRootHub) {
      type = "USBController";
      parentId = null;
    } else {
      const portPath = portParts.join("-");
      const portSegments = portPath.split(".");
      if (portSegments.length === 1) {
        parentId = `usb${busNum}`;
        type = await guessType(entry);
        if (type === "USBHub") {
          type = "USBHub";
        }
      } else {
        portSegments.pop();
        parentId = `${busNum}-${portSegments.join(".")}`;
        type = await guessType(entry);
      }
    }
    const isInternal = removableStr === "fixed" || /\b(bluetooth|integrated|built-in|internal|touchpad)\b/i.test(name) || type === "Bluetooth";
    devices.push({
      instanceId: entry,
      type,
      name: mfr ? `${mfr} ${name}` : name,
      parentId,
      speedMbps,
      idVendor: idVendor || null,
      idProduct: idProduct || null,
      isInternal
    });
  }
  const ORDER = { USBController: 0, USBHub: 1 };
  devices.sort((a, b) => (ORDER[a.type] ?? 2) - (ORDER[b.type] ?? 2));
  return devices;
}
async function detectHardware() {
  try {
    const [systemInfo, usbDevices] = await Promise.all([
      getSystemInfo(),
      getUsbDevices()
    ]);
    return { systemInfo, usbDevices, error: null };
  } catch (err) {
    console.error("[HardwareDetector] Linux/sysfs failed:", err.message);
    return {
      systemInfo: {},
      usbDevices: [],
      error: `Linux hardware read failed: ${err.message}`
    };
  }
}
export {
  detectHardware
};
