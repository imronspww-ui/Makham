'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Flame } from 'lucide-react'
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
  const trackRef = useRef<HTMLDivElement>(null)
  const autoRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollTo = useCallback((idx: number) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' })
    setCurrent(idx)
  }, [])

  // Detect which slide is visible after a native swipe
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    function onScroll() {
      if (!track) return
      const idx = Math.round(track.scrollLeft / track.clientWidth)
      setCurrent(idx)
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-advance
  const startAuto = useCallback(() => {
    if (slides.length <= 1) return
    autoRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % slides.length
        trackRef.current?.scrollTo({ left: next * (trackRef.current?.clientWidth ?? 0), behavior: 'smooth' })
        return next
      })
    }, 4500)
  }, [slides.length])

  useEffect(() => {
    startAuto()
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [startAuto])

  // Pause auto on touch
  function handleTouchStart() {
    if (autoRef.current) clearInterval(autoRef.current)
  }
  function handleTouchEnd() {
    if (autoRef.current) clearInterval(autoRef.current)
    startAuto()
  }

  if (slides.length === 0) return null

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-md select-none">
      {/* Scroll track */}
      <div
        ref={trackRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className="relative flex-shrink-0 w-full h-44 snap-start bg-stone-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.imageUrl}
              alt={slide.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="flex items-center gap-1 rounded-full bg-amber-800/90 backdrop-blur-sm px-2 py-0.5">
                    <Flame size={10} className="text-white" />
                    <span className="text-[10px] font-bold text-white">ยอดนิยม</span>
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg leading-tight drop-shadow truncate">{slide.name}</h3>
                {slide.description && (
                  <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{slide.description}</p>
                )}
              </div>
              <button
                onClick={() => onSelect(slide)}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg active:scale-95 transition-all"
              >
                {slide.price > 0
                  ? formatCurrency(slide.price)
                  : <span className="text-xs opacity-90">ดูเมนู</span>
                }
                <span className="text-xs opacity-80">สั่งเลย</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
          {slides.map((_, i) => (
            <div
              key={i}
              className={[
                'rounded-full transition-all duration-300',
                i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
