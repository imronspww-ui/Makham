'use client'
import { create } from 'zustand'
import type { PaymentMethod } from '@/types'

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
}

export const useCheckoutStore = create<CheckoutState>()((set) => ({
  ...defaultState,
  setCustomerName: (v) => set({ customerName: v }),
  setCustomerPhone: (v) => set({ customerPhone: v }),
  setPaymentMethod: (v) => set({ paymentMethod: v }),
  setNote: (v) => set({ note: v }),
  setLocation: ({ lat, lng, distanceKm, deliveryFee, address }) =>
    set({ lat, lng, distanceKm, deliveryFee, address }),
  reset: () => set(defaultState),
}))
