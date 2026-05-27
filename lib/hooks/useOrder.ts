'use client'
import { useState, useEffect } from 'react'
import { subscribeToOrder } from '@/lib/services/orderService'
import type { Order } from '@/types'

export function useOrder(id: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const unsub = subscribeToOrder(id, (data) => {
      setOrder(data)
      setLoading(false)
    })
    return unsub
  }, [id])

  return { order, loading }
}
