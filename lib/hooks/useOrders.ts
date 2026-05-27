'use client'
import { useState, useEffect } from 'react'
import { subscribeToOrders } from '@/lib/services/orderService'
import type { Order } from '@/types'

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToOrders((data) => {
      setOrders(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { orders, loading }
}
