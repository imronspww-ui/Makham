'use client'
import type { Category } from '@/types'

// Auto-map Thai food category keywords → emoji
function categoryEmoji(name: string): string {
  const n = name.toLowerCase()
  if (/ยำ|ส้มตำ|สลัด/.test(n))   return '🥗'
  if (/น้ำ|เครื่องดื่ม|ชา|กาแฟ|โค้ก|สไปรท์|โซดา/.test(n)) return '🥤'
  if (/ลูกชิ้น|ปิ้ง|ย่าง/.test(n)) return '🍢'
  if (/ข้าว|ผัด|炒/.test(n))       return '🍚'
  if (/ก๋วยเตี๋ยว|เส้น|ราดหน้า/.test(n)) return '🍜'
  if (/ไก่/.test(n))               return '🍗'
  if (/หมู/.test(n))               return '🥩'
  if (/กุ้ง|ปลา|ทะเล/.test(n))    return '🦐'
  if (/ขนม|หวาน|เค้ก/.test(n))    return '🍰'
  if (/ซุป|ต้ม/.test(n))          return '🍲'
  if (/แซนวิช|เบอร์เกอร์/.test(n)) return '🥪'
  if (/ไส้กรอก|แฟรงค์/.test(n))  return '🌭'
  return '🍽️'
}

interface Props {
  categories: Category[]
  activeId: string | null
  onChange: (id: string | null) => void
}

export function CategoryFilter({ categories, activeId, onChange }: Props) {
  return (
    <div className="category-filter-bar sticky top-[57px] z-20 -mx-4 px-4 py-2.5 bg-[#fff8f0]/90 backdrop-blur-md border-b border-orange-100 flex gap-2 overflow-x-auto scrollbar-hide">
      <button
        onClick={() => onChange(null)}
        className={[
          'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5',
          activeId === null
            ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-200'
            : 'chip-inactive bg-white/70 text-stone-600 border-orange-200 hover:border-orange-400 hover:text-orange-700',
        ].join(' ')}
      >
        <span>✨</span>ทั้งหมด
      </button>
      {categories.map((cat) => {
        const emoji = categoryEmoji(cat.name)
        const active = activeId === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={[
              'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5',
              active
                ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-200'
                : 'chip-inactive bg-white/70 text-stone-600 border-orange-200 hover:border-orange-400 hover:text-orange-700',
            ].join(' ')}
          >
            <span>{emoji}</span>{cat.name}
          </button>
        )
      })}
    </div>
  )
}
