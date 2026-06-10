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

  // Scroll to a specific index
  const scrollTo = useCallback((idx: number) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[idx] as HTMLElement | undefined
    if (!card) return
    track.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' })
    setCurrent(idx)
  }, [])

  // Sync dot indicator on native swipe
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    function onScroll() {
      if (!track) return
      // Find which card's left edge is closest to the scroll position
      let closest = 0
      let minDist = Infinity
      Array.from(track.children).forEach((child, i) => {
        const el = child as HTMLElement
        const dist = Math.abs(el.offsetLeft - 16 - track.scrollLeft)
        if (dist < minDist) { minDist = dist; closest = i }
      })
      setCurrent(closest)
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
        const track = trackRef.current
        if (track) {
          const card = track.children[next] as HTMLElement | undefined
          if (card) track.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' })
        }
        return next
      })
    }, 4500)
  }, [slides.length])

  useEffect(() => {
    startAuto()
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [startAuto])

  function pauseAuto() { if (autoRef.current) clearInterval(autoRef.current) }
  function resumeAuto() { startAuto() }

  if (slides.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {/* Card track */}
      <div
        ref={trackRef}
        onTouchStart={pauseAuto}
        onTouchEnd={resumeAuto}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 -mx-4 pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="relative flex-none w-[82%] snap-start rounded-2xl overflow-hidden shadow-md bg-stone-800 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => onSelect(slide)}
          >
            {/* Image with 4:3 aspect ratio */}
            <div className="aspect-[4/3] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.imageUrl}
                alt={slide.name}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>

            {/* Gradient + info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3.5 flex items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="flex items-center gap-1 rounded-full bg-amber-800/90 backdrop-blur-sm px-2 py-0.5">
                    <Flame size={9} className="text-white" />
                    <span className="text-[10px] font-bold text-white">ยอดนิยม</span>
                  </div>
                </div>
                <h3 className="text-white font-bold text-base leading-tight drop-shadow truncate">{slide.name}</h3>
                {slide.description && (
                  <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{slide.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-1 rounded-full bg-orange-600 px-3.5 py-1.5 text-sm font-bold text-white shadow-lg">
                {slide.price > 0 ? formatCurrency(slide.price) : 'ดูเมนู'}
              </div>
            </div>
          </div>
        ))}
        {/* trailing spacer so last card has right padding */}
        <div className="flex-none w-4 shrink-0" />
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={[
                'rounded-full transition-all duration-300',
                i === current ? 'w-5 h-1.5 bg-orange-500' : 'w-1.5 h-1.5 bg-stone-300',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
