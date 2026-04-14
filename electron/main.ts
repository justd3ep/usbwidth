import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Must be set before app is ready — disables Chromium sandbox at env level
// This is required on Fedora/Wayland where /tmp namespace restrictions block shared memory
process.env['ELECTRON_DISABLE_SANDBOX'] = '1'

// Linux: disable hardware GPU to avoid VSync/GL errors, keep software renderer
if (process.platform === 'linux') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-sandbox')
  app.commandLine.appendSwitch('disable-dev-shm-usage')
  app.commandLine.appendSwitch('in-process-gpu')
  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations')
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
}

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'usbWidth',
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // ─── Native USB hotplug (Windows) ────────────────────────────────────────────
  // libusb fires 'attach'/'detach' events directly from the USB kernel driver.
  // No polling. No PowerShell. Response time < 100ms.
  if (process.platform === 'win32') {
    import('./hardwareDetector.js')
      .then(async ({ registerHotplug }) => {
        try {
          await registerHotplug(async () => {
            try {
              const newData = await getTopologyData()
              if (win && !win.isDestroyed()) {
                win.webContents.send('hardware-updated', newData)
              }
            } catch (err) {
              console.error('[Hotplug] Failed to push update:', err)
            }
          })
        } catch (err) {
          console.error('[Hotplug] Setup failed:', err)
        }
      })
      .catch(err => console.error('[Hotplug] Import failed:', err))
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

async function getTopologyData() {
  const { detectHardware } = await import('./hardwareDetector.js')
  const { buildTopology, flattenDevices } = await import('./topologyBuilder.js')
  const { classifyAll } = await import('./classifier.js')
  const { runRules } = await import('./ruleEngine.js')
  const { generateRecommendations } = await import('./recommendationEngine.js')

  const { systemInfo, usbDevices, error } = await detectHardware() as { systemInfo: any, usbDevices: any[], error: any }
  const tree = buildTopology(usbDevices) as any[]
  const flat = flattenDevices(tree) as any[]
  const classified = classifyAll(flat) as any[]
  const warnings = runRules(tree, classified)
  const recommendations = generateRecommendations(warnings)

  return {
    systemInfo,
    tree,
    classifiedDevices: classified,
    warnings,
    recommendations,
    error: error || null,
    platform: process.platform,
  }
}

ipcMain.handle('get-topology', async (_event) => {
  try {
    return { success: true, data: await getTopologyData() }
  } catch (err: any) {
    console.error('[IPC get-topology]', err)
    return { success: false, error: err.message }
  }
})

// ─── App lifecycle ─────────────────────────────────────────────────────────────

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
