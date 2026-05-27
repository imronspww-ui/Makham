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
          'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
          activeId === null
            ? 'bg-orange-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-orange-100',
        ].join(' ')}
      >
        ทั้งหมด
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={[
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            activeId === cat.id
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-orange-100',
          ].join(' ')}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
