'use client'
import { Volume2 } from 'lucide-react'

interface Props {
  onUnlock: () => void
}

/**
 * แสดงแถบสีส้มบนสุดของ admin เพื่อให้ user แตะ unlock AudioContext
 * iOS ต้องการ user gesture ก่อนถึงจะเล่นเสียงได้
 */
export function AudioUnlockBanner({ onUnlock }: Props) {
  return (
    <button
      type="button"
      onClick={onUnlock}
      className="flex w-full items-center justify-center gap-2 bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 active:bg-orange-700 transition-colors shrink-0"
    >
      <Volume2 size={16} className="animate-pulse" />
      แตะที่นี่เพื่อเปิดเสียงแจ้งเตือนออเดอร์ (จำเป็นสำหรับ iOS)
    </button>
  )
}
