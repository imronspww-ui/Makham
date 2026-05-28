'use client'
import { useState } from 'react'
import { Flame } from 'lucide-react'
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

  // Items visible under current category filter
  const filtered = activeCategoryId
    ? items.filter((item) => item.categoryId === activeCategoryId)
    : items

  // Popular items (shown above everything when no filter is active)
  const popularItems = items.filter(
    (item) => item.isPopular && item.isAvailable && !item.isSoldOut,
  )

  if (loading) return <MenuGridSkeleton />

  if (error)
    return (
      <div className="py-12 text-center">
        <p className="text-stone-500">{error}</p>
        <p className="mt-1 text-xs text-stone-400">กรุณาตั้งค่า Firebase ใน .env.local</p>
      </div>
    )

  return (
    <div className="flex flex-col gap-5">
      {/* ── Popular section (only when no filter active) ── */}
      {popularItems.length > 0 && !activeCategoryId && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            <h2 className="text-base font-bold text-stone-800">เมนูยอดนิยม</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {popularItems.map((item) => (
              <MenuCard key={`pop-${item.id}`} item={item} showPopularBadge={false} />
            ))}
          </div>
          <div className="border-t border-stone-100 mt-1" />
        </section>
      )}

      {/* ── Category filter ── */}
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          activeId={activeCategoryId}
          onChange={setActiveCategoryId}
        />
      )}

      {/* ── Main menu grid ── */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-stone-400">ยังไม่มีเมนูในหมวดนี้</div>
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
