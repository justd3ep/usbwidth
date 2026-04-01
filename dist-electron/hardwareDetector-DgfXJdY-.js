import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
function getMockData() {
  const systemInfo = {
    manufacturer: "Dell Inc.",
    model: "XPS 15 9570",
    cpu: "Intel(R) Core(TM) i7-8750H CPU @ 2.20GHz",
    os: "Windows 11 Pro",
    totalRam: "16 GB"
  };
  const usbDevices = [
    // Controller 1 – xHCI (USB 3.x)
    {
      instanceId: "PCI\\VEN_8086&DEV_A36D&CC_0C0330\\3&11583659&0&A0",
      type: "USBController",
      name: "Intel(R) USB 3.1 eXtensible Host Controller",
      parentId: null,
      speedMbps: 1e4
    },
    // Root Hub on Controller 1
    {
      instanceId: "USB\\ROOT_HUB30\\4&3A512143&0",
      type: "USBHub",
      name: "USB Root Hub (USB 3.0)",
      parentId: "PCI\\VEN_8086&DEV_A36D&CC_0C0330\\3&11583659&0&A0",
      speedMbps: 5e3
    },
    // External Hub on Port 4
    {
      instanceId: "USB\\VID_05E3&PID_0616\\6&3A1F2E0C&0&4",
      type: "USBHub",
      name: "USB3.0 Hub (Anker 7-Port)",
      parentId: "USB\\ROOT_HUB30\\4&3A512143&0",
      speedMbps: 5e3
    },
    // SSD-1 plugged into hub
    {
      instanceId: "USB\\VID_0BC2&PID_AB30\\NA123456789",
      type: "DiskDrive",
      name: "Seagate Fast SSD (USB 3.0)",
      parentId: "USB\\VID_05E3&PID_0616\\6&3A1F2E0C&0&4",
      speedMbps: 5e3
    },
    // SSD-2 plugged into hub
    {
      instanceId: "USB\\VID_0781&PID_5583\\NA987654321",
      type: "DiskDrive",
      name: "SanDisk Extreme Portable SSD",
      parentId: "USB\\VID_05E3&PID_0616\\6&3A1F2E0C&0&4",
      speedMbps: 5e3
    },
    // Capture card plugged into hub
    {
      instanceId: "USB\\VID_07CA&PID_0511\\CAPTURE001",
      type: "ImageDevice",
      name: "AVerMedia Live Gamer Portable 2",
      parentId: "USB\\VID_05E3&PID_0616\\6&3A1F2E0C&0&4",
      speedMbps: 5e3
    },
    // Webcam directly on Controller 1
    {
      instanceId: "USB\\VID_046D&PID_085C\\CAM0001",
      type: "ImageDevice",
      name: "Logitech C920 HD Pro Webcam",
      parentId: "USB\\ROOT_HUB30\\4&3A512143&0",
      speedMbps: 5e3
    },
    // Controller 2 – EHCI (USB 2.0)
    {
      instanceId: "PCI\\VEN_8086&DEV_A36D&CC_0C0330\\3&11583659&0&B0",
      type: "USBController",
      name: "Intel(R) USB 2.0 Enhanced Host Controller",
      parentId: null,
      speedMbps: 480
    },
    // Root Hub on Controller 2
    {
      instanceId: "USB\\ROOT_HUB20\\4&1A2B3C4D&0",
      type: "USBHub",
      name: "USB Root Hub (USB 2.0)",
      parentId: "PCI\\VEN_8086&DEV_A36D&CC_0C0330\\3&11583659&0&B0",
      speedMbps: 480
    },
    // Keyboard directly on Controller 2
    {
      instanceId: "USB\\VID_046D&PID_C31C\\KB0001",
      type: "Keyboard",
      name: "Logitech USB Keyboard K270",
      parentId: "USB\\ROOT_HUB20\\4&1A2B3C4D&0",
      speedMbps: 480
    },
    // Mouse directly on Controller 2
    {
      instanceId: "USB\\VID_046D&PID_C077\\MS0001",
      type: "Mouse",
      name: "Logitech USB Optical Mouse M90",
      parentId: "USB\\ROOT_HUB20\\4&1A2B3C4D&0",
      speedMbps: 480
    },
    // USB audio directly on Controller 2
    {
      instanceId: "USB\\VID_0D8C&PID_0012\\AUDIO001",
      type: "AudioEndpoint",
      name: "USB Audio Codec (Headset)",
      parentId: "USB\\ROOT_HUB20\\4&1A2B3C4D&0",
      speedMbps: 480
    }
  ];
  return { systemInfo, usbDevices, isMock: true };
}
const execAsync = promisify(exec);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.join(__dirname$1, "..", "resources", "scripts");
async function runPowerShell(scriptName, args = []) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const argStr = args.map((a) => `"${a}"`).join(" ");
  const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" ${argStr}`;
  const { stdout, stderr } = await execAsync(cmd, { timeout: 15e3 });
  if (stderr && stderr.trim()) {
    console.warn(`[PS Warn] ${scriptName}:`, stderr.trim());
  }
  return JSON.parse(stdout.trim());
}
async function detectHardware() {
  if (process.platform !== "win32") {
    console.log("[HardwareDetector] Non-Windows platform — using mock data.");
    return getMockData();
  }
  try {
    const [systemInfo, usbDevices] = await Promise.all([
      runPowerShell("getSystemInfo.ps1"),
      runPowerShell("getUsbDevices.ps1")
    ]);
    return { systemInfo, usbDevices, isMock: false };
  } catch (err) {
    console.error("[HardwareDetector] PowerShell failed:", err.message);
    console.log("[HardwareDetector] Falling back to mock data.");
    const mock = getMockData();
    mock.error = `WMI query failed: ${err.message}`;
    return mock;
  }
}
export {
  detectHardware
};
