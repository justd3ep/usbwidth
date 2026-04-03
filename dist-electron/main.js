import { app, ipcMain, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
if (process.platform === "linux") {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-sandbox");
  app.commandLine.appendSwitch("enable-features", "WaylandWindowDecorations");
  app.commandLine.appendSwitch("ozone-platform-hint", "auto");
  process.env["ELECTRON_DISABLE_SANDBOX"] = "true";
}
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Hardware Topology & Bottleneck Advisor",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    ...process.platform === "darwin" ? { titleBarStyle: "hiddenInset" } : {},
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
async function getTopologyData() {
  const { detectHardware } = await import("./hardwareDetector-Ch9r5p-Q.js");
  const { buildTopology, flattenDevices } = await import("./topologyBuilder-Cu8T7aj6.js");
  const { classifyAll } = await import("./classifier-D_aOqHLF.js");
  const { runRules } = await import("./ruleEngine-UOesDFWe.js");
  const { generateRecommendations } = await import("./recommendationEngine-DR2QFinr.js");
  const { systemInfo, usbDevices, error } = await detectHardware();
  const tree = buildTopology(usbDevices);
  const flat = flattenDevices(tree);
  const classified = classifyAll(flat);
  const warnings = runRules(tree, classified);
  const recommendations = generateRecommendations(warnings);
  return {
    systemInfo,
    tree,
    classifiedDevices: classified,
    warnings,
    recommendations,
    error: error || null
  };
}
ipcMain.handle("get-topology", async (_event) => {
  try {
    return { success: true, data: await getTopologyData() };
  } catch (err) {
    console.error("[IPC get-topology]", err);
    return { success: false, error: err.message };
  }
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
