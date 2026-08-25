import { ipcRenderer, contextBridge } from 'electron'

// Expose a typed, safe API to the renderer under window.api
contextBridge.exposeInMainWorld('api', {
  /**
   * Fetch the full hardware topology analysis.
   * Returns { success, data?, error? }
   */
  getTopology: () => ipcRenderer.invoke('get-topology'),

  /**
   * Listen to real-time hardware changes (Windows only).
   */
  onHardwareUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('hardware-updated', (_event, value) => callback(value))
  },

  /**
   * Save the current scan to a file chosen by the user.
   */
  saveScan: (payload: { defaultName?: string; contents: string }) =>
    ipcRenderer.invoke('save-scan', payload) as Promise<{ success: boolean; path?: string; error?: string }>,

  /**
   * Open an http(s) URL in the user's default browser.
   */
  openExternal: (url: string) =>
    ipcRenderer.invoke('open-external', url) as Promise<{ success: boolean; error?: string }>,
})

// Typescript global type stub (used in renderer)
export { }
declare global {
  interface Window {
    api: {
      getTopology: () => Promise<{
        success: boolean
        data?: {
          systemInfo: Record<string, string>
          tree: any[]
          classifiedDevices: any[]
          warnings: any[]
          recommendations: any[]
          platform: string
          error: string | null
        }
        error?: string
      }>
      onHardwareUpdate: (callback: (data: any) => void) => void
      saveScan: (payload: { defaultName?: string; contents: string }) =>
        Promise<{ success: boolean; path?: string; error?: string }>
      openExternal: (url: string) =>
        Promise<{ success: boolean; error?: string }>
    }
  }
}
