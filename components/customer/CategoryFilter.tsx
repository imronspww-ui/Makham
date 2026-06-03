'use client'
import type { Category } from '@/types'

interface Props {
  categories: Category[]
  activeId: string | null
  onChange: (id: string | null) => void
}

export function CategoryFilter({ categories, activeId, onChange }: Props) {
  return (
    <div className="category-filter-bar sticky top-[57px] z-20 -mx-4 px-4 py-2 bg-[#fff8f0]/90 backdrop-blur-md border-b border-orange-100 flex gap-2 overflow-x-auto scrollbar-hide">
      <button
        onClick={() => onChange(null)}
        className={[
          'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 whitespace-nowrap',
          activeId === null
            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
            : 'chip-inactive bg-white/70 text-stone-600 border-orange-200 hover:border-orange-400 hover:text-orange-700',
        ].join(' ')}
      >
        ทั้งหมด
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={[
            'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 whitespace-nowrap',
            activeId === cat.id
              ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
              : 'chip-inactive bg-white/70 text-stone-600 border-orange-200 hover:border-orange-400 hover:text-orange-700',
          ].join(' ')}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
