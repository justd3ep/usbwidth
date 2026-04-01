import { ipcRenderer, contextBridge } from 'electron'

// Expose a typed, safe API to the renderer under window.api
contextBridge.exposeInMainWorld('api', {
  /**
   * Fetch the full hardware topology analysis.
   * Returns { success, data?, error? }
   */
  getTopology: () => ipcRenderer.invoke('get-topology'),
})

// Typescript global type stub (used in renderer)
export {}
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
          isMock: boolean
          error: string | null
        }
        error?: string
      }>
    }
  }
}
