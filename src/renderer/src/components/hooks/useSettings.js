import { useState, useEffect } from 'react'
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts'

export function useSettings() {
  const [loading, setLoading] = useState(true)
  const [storedSettings, setStoredSettings] = useState({
    geminiApiKeys: ['', '', '', ''],
    openaiApiKeys: ['', '', '', ''],
    shortcuts: { ...DEFAULT_SHORTCUTS }
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (window.api?.loadSettings) {
          const s = await window.api.loadSettings()
          if (s) setStoredSettings(s)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])


  const mergeSettings = (partial) =>
    setStoredSettings((prev) => ({ ...prev, ...partial }))

  return { storedSettings, loading, mergeSettings }
}
