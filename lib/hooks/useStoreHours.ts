'use client'
import { useMemo } from 'react'
import type { Settings } from '@/types'

/** Pure function — can be used outside React too */
export function computeIsOpen(settings: Settings | null): boolean {
  const hours = settings?.openingHours
  if (!hours || !hours.enabled) return true      // ยังไม่ตั้งค่า → เปิดเสมอ
  if (hours.manualOverride === 'open') return true
  if (hours.manualOverride === 'closed') return false

  // ตรวจตามตารางเวลา
  const now = new Date()
  const day = String(now.getDay())               // "0"=อาทิตย์ … "6"=เสาร์
  const daySchedule = hours.schedule?.[day]
  if (!daySchedule || daySchedule.isOff) return false

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const cur = `${hh}:${mm}`
  return cur >= daySchedule.open && cur < daySchedule.close
}

export function useStoreHours(settings: Settings | null) {
  const isOpen = useMemo(() => computeIsOpen(settings), [settings])
  return { isOpen }
}
