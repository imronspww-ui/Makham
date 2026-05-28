'use client'
import { useMenu } from '@/lib/hooks/useMenu'
import { MenuGrid } from '@/components/customer/MenuGrid'

export default function HomePage() {
  const { items, categories, loading, error } = useMenu()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">เมนูอาหาร</h1>
        <p className="text-sm text-stone-500 mt-0.5">เลือกเมนูที่ต้องการ แล้วกดตะกร้าเพื่อสั่งอาหาร</p>
      </div>
      <MenuGrid items={items} categories={categories} loading={loading} error={error} />
    </div>
  )
}
