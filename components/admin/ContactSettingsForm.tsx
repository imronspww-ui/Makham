'use client'
import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { updateStoreSettings } from '@/lib/services/settingsService'
import type { Settings, StoreSettings } from '@/types'

interface Props {
  settings: Settings
  onSaved: () => void
}

type FormData = Pick<StoreSettings,
  'phoneContact' | 'lineId' | 'facebookUrl' | 'instagramUrl' | 'tiktokUrl' | 'websiteUrl' | 'additionalLinks'
>

export function ContactSettingsForm({ settings, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const store = settings.store

  const { register, handleSubmit, control } = useForm<FormData>({
    defaultValues: {
      phoneContact:   store.phoneContact   ?? '',
      lineId:         store.lineId         ?? '',
      facebookUrl:    store.facebookUrl    ?? '',
      instagramUrl:   store.instagramUrl   ?? '',
      tiktokUrl:      store.tiktokUrl      ?? '',
      websiteUrl:     store.websiteUrl     ?? '',
      additionalLinks: store.additionalLinks ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'additionalLinks' })

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      // merge กับ store settings เดิม
      await updateStoreSettings({ ...store, ...data })
      toast.success('บันทึกช่องทางติดต่อสำเร็จ')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="เบอร์โทรร้าน"
          {...register('phoneContact')}
          placeholder="0812345678"
        />
        <Input
          label="LINE ID / LINE OA URL"
          {...register('lineId')}
          placeholder="@makham หรือ https://line.me/..."
        />
        <Input
          label="Facebook Page URL"
          {...register('facebookUrl')}
          placeholder="https://facebook.com/makham"
        />
        <Input
          label="Instagram URL"
          {...register('instagramUrl')}
          placeholder="https://instagram.com/makham"
        />
        <Input
          label="TikTok URL"
          {...register('tiktokUrl')}
          placeholder="https://tiktok.com/@makham"
        />
        <Input
          label="เว็บไซต์"
          {...register('websiteUrl')}
          placeholder="https://makham.com"
        />
      </div>

      {/* ลิงก์เพิ่มเติม */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">ลิงก์เพิ่มเติม</p>
          <button
            type="button"
            onClick={() => append({ label: '', url: '' })}
            className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            <Plus size={14} /> เพิ่มลิงก์
          </button>
        </div>
        {fields.length === 0 && (
          <p className="text-xs text-gray-400">ยังไม่มีลิงก์เพิ่มเติม — กด "เพิ่มลิงก์" เพื่อใส่ลิงก์ Shopee, Lazada, Google Maps ฯลฯ</p>
        )}
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-end">
            <Input
              label={i === 0 ? 'ชื่อที่แสดง' : undefined}
              {...register(`additionalLinks.${i}.label`)}
              placeholder="เช่น Shopee, Google Maps"
              className="w-36 shrink-0"
            />
            <Input
              label={i === 0 ? 'URL' : undefined}
              {...register(`additionalLinks.${i}.url`)}
              placeholder="https://..."
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" loading={saving}>บันทึกช่องทางติดต่อ</Button>
      </div>
    </form>
  )
}
