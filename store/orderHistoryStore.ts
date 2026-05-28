'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OrderHistoryItem {
  id: string
  orderNumber: string
  createdAt: string // client-side ISO string at time of order
}

interface OrderHistoryState {
  orders: OrderHistoryItem[]
  addOrder: (item: OrderHistoryItem) => void
  removeOrder: (id: string) => void
  clear: () => void
}

export const useOrderHistoryStore = create<OrderHistoryState>()(
  persist(
    (set) => ({
      orders: [],
      addOrder: (item) =>
        set((state) => ({
          // newest first, no duplicates, keep max 30
          orders: [item, ...state.orders.filter((o) => o.id !== item.id)].slice(0, 30),
        })),
      removeOrder: (id) =>
        set((state) => ({ orders: state.orders.filter((o) => o.id !== id) })),
      clear: () => set({ orders: [] }),
    }),
    { name: 'makham-order-history' },
  ),
)
