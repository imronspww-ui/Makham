'use client'
import { Sidebar } from '@/components/admin/Sidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useAdminOrderAlert } from '@/lib/hooks/useAdminOrderAlert'

function AdminAlertProvider() {
  useAdminOrderAlert()
  return null
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <AdminAlertProvider />
    </div>
  )
}
