'use client'
import { useEffect, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { X, Share2, Copy, Check, ExternalLink } from 'lucide-react'

interface Props {
  onClose: () => void
}

export function QrOrderModal({ onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)

  const orderUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (!orderUrl) return
    QRCode.toDataURL(orderUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#1a0a00', light: '#fff8f0' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => {})
  }, [orderUrl])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({ title: 'สั่งอาหารออนไลน์', url: orderUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(orderUrl).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [orderUrl])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(orderUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [orderUrl])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-xs rounded-2xl bg-[#1a1007] border border-amber-900/50 shadow-2xl flex flex-col items-center gap-5 px-6 pt-5 pb-6">

        {/* Header */}
        <div className="flex w-full items-center justify-between">
          <p className="text-base font-bold text-amber-100">📱 QR สั่งอาหาร</p>
          <button onClick={onClose} className="text-amber-700 hover:text-amber-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* QR */}
        <div className="rounded-2xl bg-[#fff8f0] p-3 shadow-2xl shadow-black/50">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR สั่งอาหาร" className="w-56 h-56 rounded-xl" />
          ) : (
            <div className="w-56 h-56 rounded-xl flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-amber-700 border-t-amber-400 animate-spin" />
            </div>
          )}
        </div>

        {/* URL */}
        <div className="flex w-full items-center gap-2 rounded-xl bg-[#0d0a07] border border-[#2a1e0f] px-3 py-2">
          <span className="flex-1 truncate text-xs text-amber-600 font-mono">{orderUrl}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 text-amber-700 hover:text-amber-400 transition-colors"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
          <a
            href={orderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-amber-700 hover:text-amber-400 transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Action buttons */}
        <div className="flex w-full gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator ? (
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold py-3 transition-colors"
            >
              <Share2 size={15} />
              แชร์ลิงก์
            </button>
          ) : (
            <button
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold py-3 transition-colors"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
            </button>
          )}
        </div>

        <p className="text-[11px] text-amber-900 text-center -mt-2">
          ให้ลูกค้าสแกนเพื่อสั่งอาหารออนไลน์
        </p>
      </div>
    </div>
  )
}
