'use client'
/**
 * ReceiptSettingsForm — ตั้งค่าใบเสร็จ POS
 * โลโก้ / ที่อยู่ / เบอร์โทร / เลขผู้เสียภาษี / ข้อความท้าย / บรรทัดพิเศษ
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Eye, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { updateReceiptSettings } from '@/lib/services/settingsService'
import { printReceipt } from '@/lib/utils/printReceipt'
import type { Settings, ReceiptSettings } from '@/types'

interface Props {
  settings: Settings
  onSaved:  () => void
}

const DEFAULT_RECEIPT: ReceiptSettings = {
  showLogo:      false,
  showAddress:   false,
  phone:         '',
  taxId:         '',
  footerMessage: 'ขอบคุณที่ใช้บริการ 🙏',
  noteLines:     '',
}

export function ReceiptSettingsForm({ settings, onSaved }: Props) {
  const init = { ...DEFAULT_RECEIPT, ...settings.receipt }

  const [showLogo,      setShowLogo]      = useState(init.showLogo)
  const [showAddress,   setShowAddress]   = useState(init.showAddress)
  const [phone,         setPhone]         = useState(init.phone)
  const [taxId,         setTaxId]         = useState(init.taxId)
  const [footerMessage, setFooterMessage] = useState(init.footerMessage || 'ขอบคุณที่ใช้บริการ 🙏')
  const [noteLines,     setNoteLines]     = useState(init.noteLines)
  const [saving,        setSaving]        = useState(false)

  const hasLogo    = Boolean(settings.store.logoUrl)
  const hasAddress = Boolean(settings.store.address)

  async function handleSave() {
    setSaving(true)
    try {
      const data: ReceiptSettings = { showLogo, showAddress, phone, taxId, footerMessage, noteLines }
      await updateReceiptSettings(data)
      toast.success('บันทึกการตั้งค่าใบเสร็จสำเร็จ')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  function handlePreview() {
    // สร้างข้อมูลตัวอย่างแล้ว print
    printReceipt(
      {
        orderNumber:    'TEST-001',
        paidAt:         new Date(),
        items: [
          { name: 'ส้มตำไทย', price: 55, qty: 1 },
          { name: 'ข้าวเหนียว', price: 15, qty: 2, options: 'ห่อใหญ่' },
          { name: 'ไก่ทอด', price: 70, qty: 1, note: 'กรอบพิเศษ' },
        ],
        subtotal:       210,
        discountAmount: 10,
        discountLabel:  '฿10',
        total:          200,
        cashPaid:       500,
        change:         300,
      },
      settings.store.name || 'ชื่อร้าน',
      settings.store,
      { showLogo, showAddress, phone, taxId, footerMessage, noteLines },
    )
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── โลโก้ ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">แสดงโลโก้บนใบเสร็จ</p>
          {hasLogo ? (
            <div className="flex items-center gap-3 mt-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.store.logoUrl} alt="logo"
                className="h-10 w-10 rounded-lg object-cover border border-gray-200 flex-shrink-0"
              />
              <p className="text-xs text-gray-400">ใช้โลโก้จากการตั้งค่าร้าน</p>
            </div>
          ) : (
            <p className="text-xs text-amber-500 mt-1">
              ⚠️ ยังไม่มีโลโก้ — ตั้งค่าที่ "ข้อมูลร้านและแบรนด์" ก่อน
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowLogo((v) => !v)}
          disabled={!hasLogo}
          className="mt-0.5 disabled:opacity-40"
          title={showLogo ? 'ปิดการแสดงโลโก้' : 'เปิดการแสดงโลโก้'}
        >
          {showLogo
            ? <ToggleRight size={32} className="text-orange-500" />
            : <ToggleLeft  size={32} className="text-gray-300" />}
        </button>
      </div>

      {/* ── ที่อยู่ ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">แสดงที่อยู่บนใบเสร็จ</p>
          {hasAddress ? (
            <p className="text-xs text-gray-400 mt-1">{settings.store.address}</p>
          ) : (
            <p className="text-xs text-amber-500 mt-1">
              ⚠️ ยังไม่มีที่อยู่ — ตั้งค่าที่ "ข้อมูลร้านและแบรนด์" ก่อน
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAddress((v) => !v)}
          disabled={!hasAddress}
          className="mt-0.5 disabled:opacity-40"
          title={showAddress ? 'ปิดการแสดงที่อยู่' : 'เปิดการแสดงที่อยู่'}
        >
          {showAddress
            ? <ToggleRight size={32} className="text-orange-500" />
            : <ToggleLeft  size={32} className="text-gray-300" />}
        </button>
      </div>

      {/* ── เบอร์โทรร้าน ── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          เบอร์โทรร้าน
          <span className="ml-1.5 text-xs font-normal text-gray-400">— แสดงใต้ชื่อร้านบนใบเสร็จ</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="เช่น 081-234-5678"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
        />
      </div>

      {/* ── เลขที่ผู้เสียภาษี ── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          เลขที่ผู้เสียภาษี (Tax ID)
          <span className="ml-1.5 text-xs font-normal text-gray-400">— ถ้าว่างจะไม่แสดงในใบเสร็จ</span>
        </label>
        <input
          type="text"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 13))}
          placeholder="เช่น 0105567012345 (13 หลัก)"
          maxLength={13}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none font-mono"
        />
        {taxId && taxId.length !== 13 && (
          <p className="text-xs text-amber-500">เลขที่ผู้เสียภาษีต้องมี 13 หลัก (ปัจจุบัน {taxId.length} หลัก)</p>
        )}
      </div>

      {/* ── ข้อความท้ายใบเสร็จ ── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">ข้อความท้ายใบเสร็จ</label>
        <input
          type="text"
          value={footerMessage}
          onChange={(e) => setFooterMessage(e.target.value)}
          placeholder="ขอบคุณที่ใช้บริการ 🙏"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
        />
        <p className="text-xs text-gray-400">แสดงที่ด้านล่างใบเสร็จ ใส่ emoji ได้</p>
      </div>

      {/* ── บรรทัดพิเศษ ── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          บรรทัดพิเศษใต้ข้อความท้าย
          <span className="ml-1.5 text-xs font-normal text-gray-400">— เพิ่มทีละบรรทัด</span>
        </label>
        <textarea
          value={noteLines}
          onChange={(e) => setNoteLines(e.target.value)}
          rows={4}
          placeholder={`เช่น:\nWiFi: MakhamShop / Pass: 12345678\nLine: @makham.store\nIG: @makham_store`}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-400 outline-none resize-none font-mono"
        />
        <p className="text-xs text-gray-400">แต่ละบรรทัดจะแสดงแยกกัน เช่น รหัส WiFi, Line OA, เว็บไซต์</p>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 flex-wrap">
        <Button type="button" loading={saving} onClick={handleSave}>
          บันทึกการตั้งค่าใบเสร็จ
        </Button>
        <button
          type="button"
          onClick={handlePreview}
          className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Eye size={15} />
          ดูตัวอย่างใบเสร็จ
        </button>
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        กด <span className="font-medium text-gray-500">ดูตัวอย่างใบเสร็จ</span> เพื่อดูก่อนบันทึก (ใช้ข้อมูลสมมุติ)
      </p>
    </div>
  )
}
