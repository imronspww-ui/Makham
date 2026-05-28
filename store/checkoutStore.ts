'use client'
import { create } from 'zustand'
import type { PaymentMethod, CategoryAddon } from '@/types'

interface CheckoutState {
  customerName: string
  customerPhone: string
  address: string
  lat: number | null
  lng: number | null
  distanceKm: number | null
  deliveryFee: number | null
  paymentMethod: PaymentMethod
  note: string
  /** Category-level addon selections (one per required group) */
  categoryAddons: CategoryAddon[]
  setCustomerName: (v: string) => void
  setCustomerPhone: (v: string) => void
  setPaymentMethod: (v: PaymentMethod) => void
  setNote: (v: string) => void
  setLocation: (params: {
    lat: number
    lng: number
    distanceKm: number
    deliveryFee: number
    address: string
  }) => void
  /** Toggle a category addon choice. Replaces existing choice if single-select. */
  toggleCategoryAddon: (addon: CategoryAddon, multiSelect: boolean) => void
  /** Clear all selections for a given category + group */
  clearCategoryGroup: (categoryId: string, groupId: string) => void
  reset: () => void
}

const defaultState = {
  customerName: '',
  customerPhone: '',
  address: '',
  lat: null,
  lng: null,
  distanceKm: null,
  deliveryFee: null,
  paymentMethod: 'cash' as PaymentMethod,
  note: '',
  categoryAddons: [] as CategoryAddon[],
}

export const useCheckoutStore = create<CheckoutState>()((set, get) => ({
  ...defaultState,
  setCustomerName: (v) => set({ customerName: v }),
  setCustomerPhone: (v) => set({ customerPhone: v }),
  setPaymentMethod: (v) => set({ paymentMethod: v }),
  setNote: (v) => set({ note: v }),
  setLocation: ({ lat, lng, distanceKm, deliveryFee, address }) =>
    set({ lat, lng, distanceKm, deliveryFee, address }),

  toggleCategoryAddon: (addon, multiSelect) => {
    const prev = get().categoryAddons
    const isSelected = prev.some(
      (a) => a.categoryId === addon.categoryId && a.groupId === addon.groupId && a.choiceId === addon.choiceId,
    )
    if (isSelected) {
      // Deselect
      set({ categoryAddons: prev.filter(
        (a) => !(a.categoryId === addon.categoryId && a.groupId === addon.groupId && a.choiceId === addon.choiceId),
      )})
    } else if (multiSelect) {
      set({ categoryAddons: [...prev, addon] })
    } else {
      // Single select: replace existing selection for this group
      set({ categoryAddons: [
        ...prev.filter((a) => !(a.categoryId === addon.categoryId && a.groupId === addon.groupId)),
        addon,
      ]})
    }
  },

  clearCategoryGroup: (categoryId, groupId) =>
    set({ categoryAddons: get().categoryAddons.filter(
      (a) => !(a.categoryId === categoryId && a.groupId === groupId),
    )}),

  reset: () => set(defaultState),
}))
