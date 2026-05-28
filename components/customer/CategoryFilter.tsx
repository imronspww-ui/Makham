'use client'
import type { Category } from '@/types'

interface Props {
  categories: Category[]
  activeId: string | null
  onChange: (id: string | null) => void
}

export function CategoryFilter({ categories, activeId, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onChange(null)}
        className={[
          'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 whitespace-nowrap',
          activeId === null
            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
            : 'bg-white/80 text-stone-600 border-stone-200 hover:border-orange-300 hover:text-orange-600',
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
              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
              : 'bg-white/80 text-stone-600 border-stone-200 hover:border-orange-300 hover:text-orange-600',
          ].join(' ')}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
