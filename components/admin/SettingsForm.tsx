'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { promptpaySettingsSchema, deliverySettingsSchema, type PromptPayFormData, type DeliverySettingsFormData } from '@/lib/utils/validation'
import { updatePromptPaySettings, updateDeliverySettings } from '@/lib/services/settingsService'
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
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<DeliverySettingsFormData>({
    resolver: zodResolver(deliverySettingsSchema),
    defaultValues: settings.delivery,
  })

  async function onSubmit(data: DeliverySettingsFormData) {
    setSaving(true)
    try {
      await updateDeliverySettings(data)
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
