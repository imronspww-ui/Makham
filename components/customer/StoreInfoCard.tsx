'use client'
import { Phone, ExternalLink } from 'lucide-react'
import type { StoreSettings } from '@/types'

// ── Icon components สำหรับแต่ละ platform ───────────────────────────────────
function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M19.952 12.478C19.952 8.27 15.834 4.856 10.976 4.856S2 8.27 2 12.478c0 3.773 3.347 6.933 7.868 7.531.306.066.723.201.828.463.095.237.062.608.031.848l-.133.8c-.04.24-.187.94.825.512s5.456-3.212 7.44-5.499c1.371-1.504 2.093-3.032 2.093-4.655zM8.086 14.628H6.219a.481.481 0 01-.481-.48V10.37a.481.481 0 01.961 0v3.297h1.387a.481.481 0 010 .961zm1.68-.48a.481.481 0 01-.961 0V10.37a.481.481 0 01.961 0v3.778zm4.794 0a.481.481 0 01-.857.3l-1.94-2.648v2.348a.481.481 0 01-.961 0V10.37a.481.481 0 01.857-.3l1.94 2.647V10.37a.481.481 0 01.961 0v3.778zm2.953-2.39a.481.481 0 010 .96H16.14v.949h1.374a.481.481 0 010 .961H15.66a.481.481 0 01-.481-.48V10.37a.481.481 0 01.481-.481h1.854a.481.481 0 010 .961H16.14v.908h1.374z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────────────────

interface Props {
  store: StoreSettings
}

interface SocialButton {
  key: string
  label: string
  href: string
  icon: React.ReactNode
  color: string
  bg: string
}

export function StoreInfoCard({ store }: Props) {
  const socials: SocialButton[] = []

  if (store.phoneContact) {
    const tel = store.phoneContact.replace(/\D/g, '')
    socials.push({
      key: 'phone', label: store.phoneContact, href: `tel:${tel}`,
      icon: <Phone size={18} />, color: 'text-green-700', bg: 'bg-green-50 border-green-200 hover:bg-green-100',
    })
  }
  if (store.lineId) {
    const href = store.lineId.startsWith('http') ? store.lineId : `https://line.me/ti/p/~${store.lineId}`
    socials.push({
      key: 'line', label: store.lineId.startsWith('http') ? 'LINE' : store.lineId,
      href, icon: <LineIcon />, color: 'text-[#06c755]', bg: 'bg-[#f0fdf4] border-[#06c755]/30 hover:bg-[#dcfce7]',
    })
  }
  if (store.facebookUrl) {
    socials.push({
      key: 'facebook', label: 'Facebook', href: store.facebookUrl,
      icon: <FacebookIcon />, color: 'text-[#1877f2]', bg: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    })
  }
  if (store.instagramUrl) {
    socials.push({
      key: 'instagram', label: 'Instagram', href: store.instagramUrl,
      icon: <InstagramIcon />, color: 'text-[#e1306c]', bg: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
    })
  }
  if (store.tiktokUrl) {
    socials.push({
      key: 'tiktok', label: 'TikTok', href: store.tiktokUrl,
      icon: <TikTokIcon />, color: 'text-stone-800', bg: 'bg-stone-50 border-stone-200 hover:bg-stone-100',
    })
  }
  if (store.websiteUrl) {
    socials.push({
      key: 'website', label: 'เว็บไซต์', href: store.websiteUrl,
      icon: <ExternalLink size={18} />, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    })
  }
  const extra = store.additionalLinks ?? []

  if (socials.length === 0 && extra.length === 0) return null

  return (
    <div className="section-card rounded-2xl bg-white border border-stone-100 p-4 flex flex-col gap-3 shadow-sm">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">ช่องทางติดต่อ</p>

      <div className="flex flex-wrap gap-2">
        {socials.map((s) => (
          <a
            key={s.key}
            href={s.href}
            target={s.key === 'phone' ? '_self' : '_blank'}
            rel="noreferrer"
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${s.color} ${s.bg}`}
          >
            {s.icon}
            <span>{s.label}</span>
          </a>
        ))}

        {extra.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700 transition-colors"
          >
            <ExternalLink size={15} />
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
