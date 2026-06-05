'use client'
import { QrCode, Store, Truck, Clock, ShieldAlert, Star, Receipt, UtensilsCrossed, KeyRound, Phone } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { PromptPaySettingsForm, DeliverySettingsForm, StoreSettingsForm } from '@/components/admin/SettingsForm'
import { ContactSettingsForm } from '@/components/admin/ContactSettingsForm'
import { OpeningHoursForm } from '@/components/admin/OpeningHoursForm'
import { LoyaltySettingsForm } from '@/components/admin/LoyaltySettingsForm'
import { ReceiptSettingsForm } from '@/components/admin/ReceiptSettingsForm'
import { TableQRManager } from '@/components/admin/TableQRManager'
import { DangerZoneForm } from '@/components/admin/DangerZoneForm'
import { StaffAccountsForm } from '@/components/admin/StaffAccountsForm'
import { Spinner } from '@/components/ui/Spinner'
import { FirebaseBanner } from '@/components/admin/FirebaseBanner'

export default function SettingsPage() {
  const { settings, loading, reload } = useSettings()

  if (loading) return <Spinner text="กำลังโหลดการตั้งค่า..." />
  if (!settings) return <div className="py-10 text-center text-gray-400">ไม่สามารถโหลดการตั้งค่าได้</div>

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <FirebaseBanner />
      <h1 className="text-2xl font-bold text-gray-800">ตั้งค่า</h1>

      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
            <Store size={16} />
          </div>
          <h2 className="font-semibold text-gray-700">ข้อมูลร้านและแบรนด์</h2>
        </div>
        <StoreSettingsForm settings={settings} onSaved={reload} />
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Phone size={16} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-700">ช่องทางติดต่อ & โซเชียล</h2>
            <p className="text-xs text-gray-400">แสดงบนหน้าร้านให้ลูกค้าเห็น — LINE, Facebook, Instagram, TikTok ฯลฯ</p>
          </div>
        </div>
        <ContactSettingsForm settings={settings} onSaved={reload} />
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
            <QrCode size={16} />
          </div>
          <h2 className="font-semibold text-gray-700">ข้อมูล PromptPay</h2>
        </div>
        <PromptPaySettingsForm settings={settings} onSaved={reload} />
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
            <Truck size={16} />
          </div>
          <h2 className="font-semibold text-gray-700">ตั้งค่าการจัดส่ง</h2>
        </div>
        <DeliverySettingsForm settings={settings} onSaved={reload} />
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Clock size={16} />
          </div>
          <h2 className="font-semibold text-gray-700">เวลาเปิด-ปิดร้าน</h2>
        </div>
        <OpeningHoursForm settings={settings} />
      </div>

      {/* ── Loyalty / Points ── */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
            <Star size={16} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-700">ระบบสะสมแต้ม</h2>
            <p className="text-xs text-gray-400">ลูกค้าสะสมแต้มผ่านเบอร์โทร แลกเมนูฟรีได้</p>
          </div>
        </div>
        <LoyaltySettingsForm settings={settings} onSaved={reload} />
      </div>

      {/* ── Table QR codes ── */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
            <UtensilsCrossed size={16} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-700">QR Code ประจำโต๊ะ</h2>
            <p className="text-xs text-gray-400">สร้าง QR ให้ลูกค้าสแกนสั่งอาหารจากโต๊ะได้เลย</p>
          </div>
        </div>
        <TableQRManager />
      </div>

      {/* ── Staff PIN ── */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
            <KeyRound size={16} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-700">บัญชีพนักงาน</h2>
            <p className="text-xs text-gray-400">แต่ละคนมี PIN ส่วนตัว — บันทึก "ขายโดย" ในออเดอร์ POS อัตโนมัติ</p>
          </div>
        </div>
        <StaffAccountsForm />
      </div>

      {/* ── Stock reset ── */}

      {/* ── Receipt settings ── */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
            <Receipt size={16} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-700">ตั้งค่าใบเสร็จ POS</h2>
            <p className="text-xs text-gray-400">โลโก้, ที่อยู่, เบอร์โทร, Tax ID, ข้อความท้าย</p>
          </div>
        </div>
        <ReceiptSettingsForm settings={settings} onSaved={reload} />
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-600 mb-2">ข้อมูล Firebase</p>
        <p>ตั้งค่า Firebase Project ID: <code className="bg-gray-200 px-1 rounded text-xs">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ยังไม่ได้ตั้งค่า'}</code></p>
        <p className="mt-1 text-xs text-gray-400">แก้ไขได้ที่ไฟล์ .env.local</p>
      </div>

      {/* ── Danger Zone ── */}
      <div className="rounded-2xl bg-white border-2 border-red-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
            <ShieldAlert size={16} />
          </div>
          <h2 className="font-semibold text-red-600">Danger Zone</h2>
        </div>
        <DangerZoneForm />
      </div>
    </div>
  )
}
