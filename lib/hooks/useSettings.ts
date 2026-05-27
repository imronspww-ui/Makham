'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSettings } from '@/lib/services/settingsService'
import type { Settings } from '@/types'

const DEFAULT_DELIVERY = { pricePerKm: 10, minDistance: 1, minFee: 30, maxDistance: 20 }

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSettings()
      setSettings(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { settings, loading, reload: load, defaultDelivery: DEFAULT_DELIVERY }
}
