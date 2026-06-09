'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { UtensilsCrossed } from 'lucide-react'

export default function TableRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const tableNumber = String(params.tableNumber ?? '')

  useEffect(() => {
    if (tableNumber) {
      sessionStorage.setItem('tableNumber', tableNumber)
      // ใช้ setTimeout เล็กน้อยเพื่อให้ sessionStorage บันทึกก่อน redirect
      setTimeout(() => router.replace('/'), 800)
    } else {
      router.replace('/')
    }
  }, [tableNumber, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-orange-50">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
        <UtensilsCrossed size={40} className="text-orange-500" />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-stone-800">โต๊ะที่ {tableNumber}</p>
        <p className="text-sm text-stone-500 mt-1 animate-pulse">กำลังเปิดเมนู...</p>
      </div>
    </div>
  )
}
