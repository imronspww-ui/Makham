'use client'
import { useState } from 'react'
import { Flame, Search, X } from 'lucide-react'
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
  const [search, setSearch] = useState('')

  const isSearching = search.trim().length > 0
  const q = search.toLowerCase()

  // Items filtered by category then by search
  const filtered = (() => {
    let result = activeCategoryId
      ? items.filter((item) => item.categoryId === activeCategoryId)
      : items
    if (isSearching) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q),
      )
    }
    return result
  })()

  // Popular items (shown only when not searching and no category filter)
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
    <div className="flex flex-col gap-4">
      {/* ── Search bar ── */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาเมนู..."
          className="w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-10 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all shadow-sm"
        />
        {isSearching && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Search results ── */}
      {isSearching ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-stone-500">
            ผลการค้นหา &ldquo;{search}&rdquo; — พบ {filtered.length} รายการ
          </p>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Search size={36} className="mx-auto mb-2 opacity-30" />
              <p>ไม่พบเมนูที่ตรงกัน</p>
              <button onClick={() => setSearch('')} className="mt-1 text-xs text-orange-500 hover:underline">
                ล้างการค้นหา
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <MenuCard key={item.id} item={item} showPopularBadge />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Popular section (only when no filter active) ── */}
          {popularItems.length > 0 && !activeCategoryId && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-orange-500" />
                <h2 className="text-base font-bold text-stone-800">เมนูยอดนิยม</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
