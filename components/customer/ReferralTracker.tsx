'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const LS_KEY = 'referral_by'

/** อ่าน ?ref=PHONE จาก URL แล้วเก็บใน localStorage */
export function ReferralTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref && /^\d{9,10}$/.test(ref.replace(/\D/g, ''))) {
      localStorage.setItem(LS_KEY, ref.replace(/\D/g, ''))
    }
  }, [searchParams])

  return null
}

export function getReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LS_KEY)
}

export function clearReferralCode(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LS_KEY)
}
