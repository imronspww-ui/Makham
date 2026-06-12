'use client'
import { useEffect, useState } from 'react'
import { getAllMenuStats } from '@/lib/services/menuStatsService'

interface Stat { ordersToday: number; clicksTotal: number; ordersTotal: number }

export function useMenuStats() {
  const [stats, setStats] = useState<Record<string, Stat>>({})

  useEffect(() => {
    getAllMenuStats().then(setStats).catch(() => {})
  }, [])

  return stats
}
