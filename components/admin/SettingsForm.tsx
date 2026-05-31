'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { promptpaySettingsSchema, deliverySettingsSchema, storeSettingsSchema, type PromptPayFormData, type DeliverySettingsFormData, type StoreSettingsFormData } from '@/lib/utils/validation'
import { updatePromptPaySettings, updateDeliverySettings, updateStoreSettings, toggleDeliveryEnabled } from '@/lib/services/settingsService'
import { generatePromptPayQR } from '@/lib/utils/promptpay'
import type { Settings } from '@/types'
import Image from 'next/image'

interface Props {
  settings: Settings
  onSaved: () => void
}

export function PromptPaySettingsForm({ settings, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [previewQr, setPreviewQr] = useState<string | null>(null)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PromptPayFormData>({
    resolver: zodResolver(promptpaySettingsSchema),
    defaultValues: settings.promptpay,
  })
  const phone = watch('phone')

  useEffect(() => {
    if (phone && phone.length >= 10) {
      generatePromptPayQR(phone, 0).then(setPreviewQr).catch(() => setPreviewQr(null))
    }
  }, [phone])

  async function onSubmit(data: PromptPayFormData) {
    setSaving(true)
    try {
      await updatePromptPaySettings(data)
      toast.success('บันทึกข้อมูล PromptPay สำเร็จ')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          <Input label="เบอร์พร้อมเพย์ *" {...register('phone')} error={errors.phone?.message} placeholder="0812345678" />
          <Input label="ชื่อบัญชี *" {...register('accountName')} error={errors.accountName?.message} placeholder="ชื่อบัญชีธนาคาร" />
        </div>
        {previewQr && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400">ตัวอย่าง QR Code</p>
            <Image src={previewQr} alt="QR Preview" width={150} height={150} className="rounded-xl border border-gray-200" />
          </div>
        )}
      </div>
      <Button type="submit" loading={saving} className="self-start">บันทึกข้อมูล PromptPay</Button>
    </form>
  )
}

export function DeliverySettingsForm({ settings, onSaved }: Props) {
  const [saving,    setSaving]    = useState(false)
  const [toggling,  setToggling]  = useState(false)
  const [enabled,   setEnabled]   = useState(settings.delivery.enabled ?? true)

  const { register, handleSubmit, formState: { errors } } = useForm<DeliverySettingsFormData>({
    resolver: zodResolver(deliverySettingsSchema),
    defaultValues: settings.delivery,
  })

  async function handleToggle() {
    setToggling(true)
    try {
      const next = !enabled
      await toggleDeliveryEnabled(next)
      setEnabled(next)
      toast.success(next ? '🟢 เปิดบริการจัดส่งแล้ว' : '🔴 ปิดบริการจัดส่งชั่วคราวแล้ว')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setToggling(false)
    }
  }

  async function onSubmit(data: DeliverySettingsFormData) {
    setSaving(true)
    try {
      await updateDeliverySettings({ ...data, enabled })
      toast.success('บันทึกการตั้งค่าจัดส่งสำเร็จ')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ── Toggle เปิด/ปิดบริการ ── */}
      <div className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-colors ${
        enabled ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
      }`}>
        <div>
          <p className={`font-semibold text-sm ${enabled ? 'text-green-700' : 'text-red-600'}`}>
            {enabled ? '🟢 เปิดให้บริการจัดส่ง' : '🔴 ปิดให้บริการชั่วคราว'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {enabled
              ? 'ลูกค้าสามารถเลือก "จัดส่ง" ได้ในหน้าตะกร้า'
              : 'ปุ่มจัดส่งในหน้าตะกร้าจะถูกปิด ลูกค้าเลือกได้เฉพาะ "รับหน้าร้าน"'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 ${
            enabled
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {toggling
            ? <span className="animate-spin">⏳</span>
            : enabled ? 'ปิดชั่วคราว' : 'เปิดบริการ'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">ราคาต่อกิโลเมตร (บาท)</label>
          <input type="number" step="0.5" {...register('pricePerKm', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.pricePerKm && <p className="text-xs text-red-500">{errors.pricePerKm.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">ค่าส่งขั้นต่ำ (บาท)</label>
          <input type="number" {...register('minFee', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.minFee && <p className="text-xs text-red-500">{errors.minFee.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">ระยะทางขั้นต่ำ (กม.)</label>
          <input type="number" step="0.5" {...register('minDistance', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.minDistance && <p className="text-xs text-red-500">{errors.minDistance.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">ระยะทางสูงสุด (กม.)</label>
          <input type="number" {...register('maxDistance', { valueAsNumber: true })}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
          {errors.maxDistance && <p className="text-xs text-red-500">{errors.maxDistance.message}</p>}
        </div>
      </div>
      <Button type="submit" loading={saving} className="self-start">บันทึกการตั้งค่าจัดส่ง</Button>
    </form>
  )
}

export function StoreSettingsForm({ settings, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState(settings.store.logoUrl ?? '')
  const [bgPreview, setBgPreview] = useState(settings.store.bgImageUrl ?? '')

  const { register, handleSubmit, watch, formState: { errors } } = useForm<StoreSettingsFormData>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      name: settings.store.name,
      logoUrl: settings.store.logoUrl ?? '',
      bgImageUrl: settings.store.bgImageUrl ?? '',
    },
  })

  const logoVal = watch('logoUrl')
  const bgVal = watch('bgImageUrl')

  useEffect(() => { setLogoPreview(logoVal ?? '') }, [logoVal])
  useEffect(() => { setBgPreview(bgVal ?? '') }, [bgVal])

  async function onSubmit(data: StoreSettingsFormData) {
    setSaving(true)
    try {
      await updateStoreSettings({
        ...settings.store,
        name: data.name,
        logoUrl: data.logoUrl || undefined,
        bgImageUrl: data.bgImageUrl || undefined,
      })
      toast.success('บันทึกข้อมูลร้านสำเร็จ')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="ชื่อร้าน *"
        {...register('name')}
        error={errors.name?.message}
        placeholder="ร้านมะขาม"
      />

      {/* Logo URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">URL โลโก้</label>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <input
              {...register('logoUrl')}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">วาง URL รูปภาพโลโก้ร้าน (แนะนำสี่เหลี่ยมจัตุรัส)</p>
          </div>
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="logo preview"
              className="h-12 w-12 rounded-xl object-cover border border-gray-200 flex-shrink-0"
              onError={() => setLogoPreview('')} />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex-shrink-0 flex items-center justify-center text-gray-300 text-xs">โลโก้</div>
          )}
        </div>
      </div>

      {/* Background URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">URL รูปพื้นหลัง</label>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <input
              {...register('bgImageUrl')}
              placeholder="https://example.com/background.jpg"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">วาง URL รูปภาพพื้นหลัง (ถ้าไม่ใส่จะใช้ gradient สีส้ม-เขียว)</p>
          </div>
          {bgPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bgPreview} alt="bg preview"
              className="h-12 w-20 rounded-xl object-cover border border-gray-200 flex-shrink-0"
              onError={() => setBgPreview('')} />
          ) : (
            <div className="h-12 w-20 rounded-xl flex-shrink-0 border border-dashed border-gray-300"
              style={{ background: 'linear-gradient(160deg, #fef6e4 0%, #f0faf4 40%, #fdf2e9 100%)' }} />
          )}
        </div>
      </div>

      <Button type="submit" loading={saving} className="self-start">บันทึกข้อมูลร้าน</Button>
    </form>
  )
}
