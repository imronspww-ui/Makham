'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CustomerState {
  name: string
  phone: string
  /** Save after a successful order */
  saveCustomer: (name: string, phone: string) => void
  clear: () => void
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      name: '',
      phone: '',
      saveCustomer: (name, phone) => set({ name, phone }),
      clear: () => set({ name: '', phone: '' }),
    }),
    { name: 'makham-customer' },
  ),
)
