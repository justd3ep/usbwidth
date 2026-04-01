import { useState, useCallback } from 'react'

export interface TopologyData {
  systemInfo: Record<string, string>
  tree: any[]
  classifiedDevices: any[]
  warnings: any[]
  recommendations: any[]
  isMock: boolean
  error: string | null
}

export type LoadState = 'idle' | 'loading' | 'success' | 'error'

export function useHardwareData() {
  const [data, setData] = useState<TopologyData | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchTopology = useCallback(async () => {
    setLoadState('loading')
    setErrorMsg(null)
    try {
      const result = await window.api.getTopology()
      if (result.success && result.data) {
        setData(result.data)
        setLoadState('success')
      } else {
        setErrorMsg(result.error || 'Unknown error from main process')
        setLoadState('error')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'IPC call failed')
      setLoadState('error')
    }
  }, [])

  return { data, loadState, errorMsg, fetchTopology }
}
