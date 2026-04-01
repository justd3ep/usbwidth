"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  /**
   * Fetch the full hardware topology analysis.
   * Returns { success, data?, error? }
   */
  getTopology: () => electron.ipcRenderer.invoke("get-topology")
});
