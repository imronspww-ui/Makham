import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/ToastProvider'

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม',
  description: 'สั่งอาหารออนไลน์',
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
