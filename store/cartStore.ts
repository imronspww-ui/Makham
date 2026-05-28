'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, OrderType, SelectedOption } from '@/types'

interface CartState {
  items: CartItem[]
  orderType: OrderType
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (menuItemId: string) => void
  updateQty: (menuItemId: string, qty: number) => void
  clearCart: () => void
  setOrderType: (type: OrderType) => void
  getTotalItems: () => number
  getTotalPrice: () => number
  getItemEffectivePrice: (item: CartItem) => number
}

function effectivePrice(item: CartItem): number {
  const optExtra = (item.selectedOptions ?? []).reduce((s, o) => s + o.extraPrice, 0)
  return item.price + optExtra
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'pickup',

      addItem: (item) => {
        // Ensure backward-compat defaults
        const newItem: Omit<CartItem, 'qty'> = {
          ...item,
          selectedOptions: item.selectedOptions ?? [],
          itemNote: item.itemNote ?? '',
        }
        const existing = get().items.find((i) => i.menuItemId === newItem.menuItemId)
        if (existing) {
          set((state) => ({
            items: state.items.map((i) =>
              i.menuItemId === newItem.menuItemId ? { ...i, qty: i.qty + 1 } : i,
            ),
          }))
        } else {
          set((state) => ({ items: [...state.items, { ...newItem, qty: 1 }] }))
        }
      },

      removeItem: (menuItemId) =>
        set((state) => ({ items: state.items.filter((i) => i.menuItemId !== menuItemId) })),

      updateQty: (menuItemId, qty) => {
        if (qty <= 0) {
          get().removeItem(menuItemId)
        } else {
          set((state) => ({
            items: state.items.map((i) => (i.menuItemId === menuItemId ? { ...i, qty } : i)),
          }))
        }
      },

      clearCart: () => set({ items: [] }),
      setOrderType: (type) => set({ orderType: type }),
      getTotalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      getTotalPrice: () =>
        get().items.reduce((sum, i) => sum + effectivePrice(i) * i.qty, 0),
      getItemEffectivePrice: (item) => effectivePrice(item),
    }),
    { name: 'makham-cart' },
  ),
)
