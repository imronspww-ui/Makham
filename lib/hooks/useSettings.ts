'use client'
import { useState, useEffect, useCallback } from 'react'
import { subscribeToSettings } from '@/lib/services/settingsService'
import type { Settings } from '@/types'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToSettings((data) => {
      setSettings(data)
      setLoading(false)
    })
    return unsub
  }, [])

  // kept for API compatibility — real-time makes explicit reload unnecessary
  const reload = useCallback(() => {}, [])

  return { settings, loading, reload }
}
