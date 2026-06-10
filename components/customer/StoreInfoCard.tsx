'use client'
import { Phone, ExternalLink, MapPin, Star, Flame } from 'lucide-react'
import type { StoreSettings } from '@/types'

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function LineIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.952 12.478C19.952 8.27 15.834 4.856 10.976 4.856S2 8.27 2 12.478c0 3.773 3.347 6.933 7.868 7.531.306.066.723.201.828.463.095.237.062.608.031.848l-.133.8c-.04.24-.187.94.825.512s5.456-3.212 7.44-5.499c1.371-1.504 2.093-3.032 2.093-4.655zM8.086 14.628H6.219a.481.481 0 01-.481-.48V10.37a.481.481 0 01.961 0v3.297h1.387a.481.481 0 010 .961zm1.68-.48a.481.481 0 01-.961 0V10.37a.481.481 0 01.961 0v3.778zm4.794 0a.481.481 0 01-.857.3l-1.94-2.648v2.348a.481.481 0 01-.961 0V10.37a.481.481 0 01.857-.3l1.94 2.647V10.37a.481.481 0 01.961 0v3.778zm2.953-2.39a.481.481 0 010 .96H16.14v.949h1.374a.481.481 0 010 .961H15.66a.481.481 0 01-.481-.48V10.37a.481.481 0 01.481-.481h1.854a.481.481 0 010 .961H16.14v.908h1.374z" />
    </svg>
  )
}
function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}
function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

// ── Shared helper ─────────────────────────────────────────────────────────────
export interface SocialItem {
  key: string
  label: string
  shortLabel: string
  href: string
  icon: (size?: number) => React.ReactNode
  iconColor: string
  bgColor: string
  borderColor: string
}

export function buildSocials(store: StoreSettings): SocialItem[] {
  const list: SocialItem[] = []
  if (store.phoneContact) {
    const tel = store.phoneContact.replace(/\D/g, '')
    list.push({ key: 'phone', label: store.phoneContact, shortLabel: 'โทร',
      href: `tel:${tel}`, icon: (s = 20) => <Phone size={s} />,
      iconColor: 'text-white', bgColor: 'bg-green-500', borderColor: 'border-green-600' })
  }
  if (store.lineId) {
    const href = store.lineId.startsWith('http') ? store.lineId : `https://line.me/ti/p/~${store.lineId}`
    list.push({ key: 'line', label: store.lineId.startsWith('http') ? 'LINE' : store.lineId, shortLabel: 'LINE',
      href, icon: (s = 20) => <LineIcon size={s} />,
      iconColor: 'text-white', bgColor: 'bg-[#06c755]', borderColor: 'border-[#05a847]' })
  }
  if (store.facebookUrl) {
    list.push({ key: 'facebook', label: 'Facebook', shortLabel: 'FB',
      href: store.facebookUrl, icon: (s = 20) => <FacebookIcon size={s} />,
      iconColor: 'text-white', bgColor: 'bg-[#1877f2]', borderColor: 'border-[#1464cc]' })
  }
  if (store.instagramUrl) {
    list.push({ key: 'instagram', label: 'Instagram', shortLabel: 'IG',
      href: store.instagramUrl, icon: (s = 20) => <InstagramIcon size={s} />,
      iconColor: 'text-white', bgColor: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]', borderColor: 'border-[#c13584]' })
  }
  if (store.tiktokUrl) {
    list.push({ key: 'tiktok', label: 'TikTok', shortLabel: 'TikTok',
      href: store.tiktokUrl, icon: (s = 20) => <TikTokIcon size={s} />,
      iconColor: 'text-white', bgColor: 'bg-black', borderColor: 'border-stone-700' })
  }
  if (store.websiteUrl) {
    list.push({ key: 'website', label: 'เว็บไซต์', shortLabel: 'Web',
      href: store.websiteUrl, icon: (s = 20) => <ExternalLink size={s} />,
      iconColor: 'text-white', bgColor: 'bg-orange-500', borderColor: 'border-orange-600' })
  }
  return list
}

// ── E: Store Profile Header ───────────────────────────────────────────────────
interface ProfileProps {
  store: StoreSettings
  items?: import('@/types').MenuItem[]
}

export function StoreProfileHeader({ store, items = [] }: ProfileProps) {
  const socials = buildSocials(store)
  const extra   = store.additionalLinks ?? []

  // คำนวณคะแนนรวมจาก menu items ที่มีรีวิว
  const ratedItems = items.filter((i) => i.ratingCount != null && (i.ratingCount ?? 0) > 0)
  const storeRating = ratedItems.length > 0
    ? ratedItems.reduce((sum, i) => sum + (i.avgRating ?? 0) * (i.ratingCount ?? 0), 0) /
      ratedItems.reduce((sum, i) => sum + (i.ratingCount ?? 0), 0)
    : null
  const totalReviews = ratedItems.reduce((sum, i) => sum + (i.ratingCount ?? 0), 0)

  const hasCover = !!(store.bannerUrl || store.bgImageUrl)

  return (
    <div className="section-card relative rounded-2xl border border-stone-100 bg-white shadow-sm">
      {/* Cover photo zone */}
      <div className="relative h-20 overflow-hidden rounded-t-2xl bg-gradient-to-br from-amber-700 via-orange-800 to-stone-900">
        {hasCover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.bannerUrl ?? store.bgImageUrl}
            alt=""
            className="h-full w-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Logo — overlaps cover */}
      <div className="px-4 pb-3">
        <div className="relative z-10 flex items-end justify-between -mt-7 mb-2">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt={store.name}
              className="h-14 w-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md border-2 border-amber-400 shrink-0">
              <span className="text-xl font-bold text-white">{store.name.charAt(0).toUpperCase()}</span>
            </div>
          )}

          {/* Store rating pill */}
          {storeRating !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 shadow-sm">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-amber-700">{storeRating.toFixed(1)}</span>
              <span className="text-[10px] text-stone-400">({totalReviews})</span>
            </div>
          )}
        </div>

        {/* Name + description */}
        <h2 className="font-bold text-stone-800 text-base leading-tight">{store.name}</h2>
        {store.description && (
          <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{store.description}</p>
        )}
        {store.address && !store.description && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-stone-400">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{store.address}</span>
          </div>
        )}

        {/* Social icons */}
        {(socials.length > 0 || extra.length > 0) && (
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {socials.map((s) => (
              <a key={s.key} href={s.href}
                target={s.key === 'phone' ? '_self' : '_blank'} rel="noreferrer"
                className={`flex h-8 w-8 items-center justify-center rounded-full ${s.bgColor} ${s.iconColor} shadow-sm active:scale-95 transition-transform`}
                title={s.label}
              >
                {s.icon(15)}
              </a>
            ))}
            {extra.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100 px-2.5 text-xs font-medium text-stone-600 active:scale-95 transition-transform"
                title={link.label}
              >
                <ExternalLink size={11} />
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* Announcement banner */}
        {store.announcement && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-orange-50 border border-orange-100 px-3 py-2.5">
            <Flame size={14} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700 leading-relaxed">{store.announcement}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── A: Social Floating Bar ────────────────────────────────────────────────────
// Rendered in layout — ลอยเหนือ nav bar, ซ่อนเมื่อมีสินค้าในตะกร้า
interface FloatBarProps {
  store: StoreSettings
  hide?: boolean          // ซ่อนเมื่อ cart bar แสดงอยู่
  theme?: 'light' | 'dark'
}

export function SocialFloatingBar({ store, hide = false, theme = 'light' }: FloatBarProps) {
  const socials = buildSocials(store)
  const extra   = store.additionalLinks ?? []

  if ((socials.length === 0 && extra.length === 0) || hide) return null

  const pillBg     = theme === 'dark' ? 'rgba(26,18,9,0.95)' : 'rgba(26,18,9,0.92)'
  const dividerCol = theme === 'dark' ? '#3d2a10' : '#3d2a10'

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-30"
      style={{ borderTop: `1px solid ${dividerCol}` }}
    >
      <div
        className="mx-auto max-w-5xl px-3 py-2 backdrop-blur-md flex items-center gap-2 overflow-x-auto scrollbar-hide"
        style={{ background: pillBg }}
      >
        <span className="text-[10px] font-semibold text-[#a8825a] shrink-0 tracking-wide">ติดต่อ</span>
        <div className="w-px h-4 shrink-0" style={{ background: dividerCol }} />

        {socials.map((s) => (
          <a
            key={s.key}
            href={s.href}
            target={s.key === 'phone' ? '_self' : '_blank'}
            rel="noreferrer"
            title={s.label}
            className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 active:scale-90 transition-transform ${s.bgColor} ${s.iconColor}`}
          >
            {s.icon(15)}
          </a>
        ))}

        {extra.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            title={link.label}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-white shrink-0 active:scale-90 transition-transform"
          >
            <ExternalLink size={14} />
          </a>
        ))}
      </div>
    </div>
  )
}
