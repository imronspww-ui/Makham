'use client'
import { useState, useEffect, useCallback } from 'react'
import { getOrders } from '@/lib/services/orderService'
import type { Order, OrderStatus } from '@/types'

export function useOrders(statusFilter?: OrderStatus) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getOrders()
      setOrders(statusFilter ? data.filter((o) => o.status === statusFilter) : data)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  return { orders, loading, reload: load }
}
