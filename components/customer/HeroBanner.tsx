'use client'
import { useState, useEffect, useCallback } from 'react'
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import type { MenuItem } from '@/types'

interface Props {
  items: MenuItem[]
  onSelect: (item: MenuItem) => void
}

export function HeroBanner({ items, onSelect }: Props) {
  const slides = items
    .filter((i) => i.isPopular && i.imageUrl && i.isAvailable && !i.isSoldOut)
    .slice(0, 5)

  const [current, setCurrent] = useState(0)
  const [animKey, setAnimKey] = useState(0)

  const goTo = useCallback((idx: number) => {
    setCurrent(idx)
    setAnimKey((k) => k + 1)
  }, [])

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo])
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, slides.length, goTo])

  useEffect(() => {
    if (slides.length <= 1) return
    const id = setInterval(next, 4500)
    return () => clearInterval(id)
  }, [slides.length, next])

  if (slides.length === 0) return null

  const slide = slides[current]

  return (
    <div className="relative rounded-2xl overflow-hidden h-44 shadow-md bg-stone-800 select-none">
      {/* Image */}
      <div key={animKey} className="absolute inset-0 animate-banner-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.imageUrl}
          alt={slide.name}
          className="h-full w-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="flex items-center gap-1 rounded-full bg-amber-800/90 backdrop-blur-sm px-2 py-0.5">
              <Flame size={10} className="text-white" />
              <span className="text-[10px] font-bold text-white">ยอดนิยม</span>
            </div>
          </div>
          <h3 className="text-white font-bold text-lg leading-tight drop-shadow">{slide.name}</h3>
          {slide.description && (
            <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{slide.description}</p>
          )}
        </div>
        <button
          onClick={() => onSelect(slide)}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg active:scale-95 transition-all"
        >
          {slide.price > 0 ? formatCurrency(slide.price) : (
            <span className="text-xs opacity-90">ตั้งแต่ ฿{Math.min(...(slide.optionGroups ?? []).flatMap((g) => g.choices.map((c) => c.extraPrice)).filter((p) => p > 0))}</span>
          )}
          <span className="text-xs opacity-80">สั่งเลย</span>
        </button>
      </div>

      {/* Prev/Next arrows — desktop only */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={['rounded-full transition-all duration-300', i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
