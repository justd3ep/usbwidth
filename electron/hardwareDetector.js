/**
 * hardwareDetector.js
 * Platform dispatcher: routes to the correct OS-specific detector.
 */

export async function detectHardware() {
  const platform = process.platform

  if (platform === 'linux') {
    const { getSystemInfo, getUsbDevices } = await import('./linuxDetector.js')
    try {
      const [systemInfo, usbDevices] = await Promise.all([getSystemInfo(), getUsbDevices()])
      return { systemInfo, usbDevices, error: null }
    } catch (err) {
      console.error('[HardwareDetector] Linux/sysfs failed:', err.message)
      return { systemInfo: {}, usbDevices: [], error: `Linux hardware read failed: ${err.message}` }
    }
  }

  if (platform === 'win32') {
    const { getSystemInfo, getUsbDevices } = await import('./windowsDetector.js')
    try {
      const [systemInfo, usbDevices] = await Promise.all([getSystemInfo(), getUsbDevices()])
      return { systemInfo, usbDevices, error: null }
    } catch (err) {
      console.error('[HardwareDetector] Windows/libusb failed:', err.message)
      return { systemInfo: {}, usbDevices: [], error: `Windows hardware read failed: ${err.message}` }
    }
  }

  return {
    systemInfo: {},
    usbDevices: [],
    error: `Unsupported platform: ${platform}. Only Linux and Windows are currently supported.`,
  }
}

/**
 * Register native USB hotplug listeners (Windows only).
 * Call this once after the Electron window is created.
 */
export async function registerHotplug(onChange) {
  if (process.platform !== 'win32') return
  const { setupHotplug } = await import('./windowsDetector.js')
  setupHotplug(onChange)
}
