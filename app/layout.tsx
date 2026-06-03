import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/ToastProvider'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม',
  description: 'สั่งอาหารออนไลน์',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม',
    startupImage: '/icons/icon-512.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-gray-50">
        <ToastProvider />
        {children}
      </body>
    </html>
  )
}
