'use client'
import { useState } from 'react'
import { MenuCard } from './MenuCard'
import { CategoryFilter } from './CategoryFilter'
import { MenuGridSkeleton } from '@/components/ui/Skeleton'
import type { MenuItem, Category } from '@/types'

interface Props {
  items: MenuItem[]
  categories: Category[]
  loading: boolean
  error: string | null
}

export function MenuGrid({ items, categories, loading, error }: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  const filtered = activeCategoryId
    ? items.filter((item) => item.categoryId === activeCategoryId)
    : items

  if (loading) return <MenuGridSkeleton />

  if (error)
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{error}</p>
        <p className="mt-1 text-xs text-gray-400">กรุณาตั้งค่า Firebase ใน .env.local</p>
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          activeId={activeCategoryId}
          onChange={setActiveCategoryId}
        />
      )}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400">ยังไม่มีเมนูในหมวดนี้</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
