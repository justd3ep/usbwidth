import { useState, useCallback, useEffect } from 'react'
import type { TopologyData, LoadState } from '../types/usb'

export type { TopologyData, LoadState }

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

  // Subscribe to real-time Windows hardware changes
  useEffect(() => {
    if (window.api && window.api.onHardwareUpdate) {
      window.api.onHardwareUpdate((result) => {
        if (result && !result.error) {
          setData(result)
          setLoadState('success')
        }
      })
    }
  }, [])

  return { data, loadState, errorMsg, fetchTopology }
}
