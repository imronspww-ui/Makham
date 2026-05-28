'use client'
import { Sidebar } from '@/components/admin/Sidebar'
import { useAdminOrderAlert } from '@/lib/hooks/useAdminOrderAlert'

/** Component แยกเพื่อให้ hook ทำงานได้ใน client boundary */
function AdminAlertProvider() {
  useAdminOrderAlert()
  return null
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
      <AdminAlertProvider />
    </div>
  )
}
