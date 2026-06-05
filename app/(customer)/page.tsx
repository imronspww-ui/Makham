'use client'
import { useMenu } from '@/lib/hooks/useMenu'
import { useSettings } from '@/lib/hooks/useSettings'
import { MenuGrid } from '@/components/customer/MenuGrid'
import { StoreInfoCard } from '@/components/customer/StoreInfoCard'

export default function HomePage() {
  const { items, categories, loading, error } = useMenu()
  const { settings } = useSettings()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title text-2xl font-bold text-stone-800 tracking-tight">เมนูอาหาร</h1>
        <p className="page-subtitle text-sm text-stone-500 mt-0.5">เลือกเมนูที่ต้องการ แล้วกดตะกร้าเพื่อสั่งอาหาร</p>
      </div>
      <MenuGrid items={items} categories={categories} loading={loading} error={error} />
      {settings?.store && <StoreInfoCard store={settings.store} />}
    </div>
  )
}
