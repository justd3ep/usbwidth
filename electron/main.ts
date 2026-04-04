import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Linux: disable hardware GPU to avoid VSync/GL errors, keep software renderer
if (process.platform === 'linux') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-sandbox')
  app.commandLine.appendSwitch('disable-dev-shm-usage')
  // Extremely common fix for pure black screens on Fedora/Wayland:
  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations')
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
  process.env['ELECTRON_DISABLE_SANDBOX'] = 'true'
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
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
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
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

async function getTopologyData() {
  // Dynamic imports (ESM-compatible)
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
