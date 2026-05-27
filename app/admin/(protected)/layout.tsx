'use client'
import { Sidebar } from '@/components/admin/Sidebar'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
