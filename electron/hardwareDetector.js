import { getSystemInfo as getLinuxSystemInfo, getUsbDevices as getLinuxUsbDevices } from './linuxDetector.js'

export async function detectHardware() {
  try {
    const [systemInfo, usbDevices] = await Promise.all([
      getLinuxSystemInfo(),
      getLinuxUsbDevices(),
    ])
    return { systemInfo, usbDevices, isMock: false, error: null }
  } catch (err) {
    console.error('[HardwareDetector] Linux/sysfs failed:', err.message)
    return { 
      systemInfo: {}, 
      usbDevices: [], 
      isMock: false, 
      error: `Linux hardware read failed: ${err.message}` 
    }
  }
}
