'use client'
import { useState } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Upload, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { uploadImage } from '@/lib/firebase/storage'
import { updateThaiChangThaiSettings } from '@/lib/services/settingsService'
import type { Settings } from '@/types'

interface Props {
  settings: Settings
  onSaved: () => void
}

export function ThaiChangThaiSettingsForm({ settings, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [qrUrl, setQrUrl] = useState(settings.thaichangthai?.qrUrl ?? '')
  const [accountName, setAccountName] = useState(settings.thaichangthai?.accountName ?? '')

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, 'images')
      setQrUrl(url)
      toast.success('อัปโหลด QR สำเร็จ')
    } catch {
      toast.error('อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSave() {
    if (!qrUrl) { toast.error('กรุณาอัปโหลด QR Code ก่อน'); return }
    setSaving(true)
    try {
      await updateThaiChangThaiSettings({ qrUrl, accountName })
      toast.success('บันทึกสำเร็จ')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-700 leading-relaxed">
        <p className="font-semibold mb-1">วิธีได้รับ Merchant QR</p>
        <ol className="list-decimal list-inside flex flex-col gap-0.5">
          <li>สมัครโครงการไทยช่วยไทยพลัสกับธนาคารกรุงไทย</li>
          <li>กรุงไทยจะส่ง QR Code ประจำร้านให้ (ทาง email หรือ KTB Biz app)</li>
          <li>นำ QR รูปนั้นมาอัปโหลดที่นี่</li>
        </ol>
      </div>

      {/* QR preview / upload */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-600">Merchant QR Code (จากกรุงไทย)</label>
        {qrUrl ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative rounded-2xl border border-blue-200 bg-white p-3 w-fit">
              <Image src={qrUrl} alt="Thai Chang Thai QR" width={200} height={200} className="rounded-xl" />
            </div>
            <button
              type="button"
              onClick={() => setQrUrl('')}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
            >
              <Trash2 size={12} />
              เปลี่ยน QR
            </button>
          </div>
        ) : (
          <label className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-200 p-6 cursor-pointer transition-colors ${uploading ? 'opacity-60 pointer-events-none' : 'hover:bg-blue-50'}`}>
            <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={uploading} />
            {uploading ? (
              <Loader2 size={22} className="animate-spin text-blue-400" />
            ) : (
              <Upload size={22} className="text-blue-400" />
            )}
            <span className="text-sm font-medium text-blue-600">
              {uploading ? 'กำลังอัปโหลด...' : 'แตะเพื่อเลือกรูป QR'}
            </span>
            <span className="text-xs text-stone-400">รูป QR จาก KTB หรือ email ที่ได้รับ</span>
          </label>
        )}
      </div>

      <Input
        label="ชื่อร้านที่ลงทะเบียน (ไม่บังคับ)"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="เช่น ร้านมะขาม"
      />

      <Button onClick={handleSave} loading={saving} disabled={!qrUrl}>
        บันทึก
      </Button>
    </div>
  )
}
