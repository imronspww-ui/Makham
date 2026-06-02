'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * อ่าน ?table=X จาก URL แล้วเก็บใน sessionStorage
 * ต้อง wrap ใน <Suspense> เพราะใช้ useSearchParams
 */
export function TableNumberTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const table = searchParams.get('table')
    if (table) {
      sessionStorage.setItem('tableNumber', table.trim())
    }
  }, [searchParams])

  return null
}
