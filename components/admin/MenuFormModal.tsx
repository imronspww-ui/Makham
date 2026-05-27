'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { menuItemSchema, type MenuItemFormData } from '@/lib/utils/validation'
import { createMenuItem, updateMenuItem } from '@/lib/services/menuService'
import { uploadImage } from '@/lib/firebase/storage'
import type { MenuItem, Category } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editItem?: MenuItem | null
  categories: Category[]
}

export function MenuFormModal({ open, onClose, onSaved, editItem, categories }: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const isEdit = !!editItem

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: { isAvailable: true, isSoldOut: false, description: '', imageUrl: '' },
  })

  const imageUrl = watch('imageUrl')

  useEffect(() => {
    if (editItem) {
      reset({
        name: editItem.name,
        description: editItem.description,
        price: editItem.price,
        categoryId: editItem.categoryId,
        imageUrl: editItem.imageUrl,
        isAvailable: editItem.isAvailable,
        isSoldOut: editItem.isSoldOut,
      })
    } else {
      reset({ isAvailable: true, isSoldOut: false, description: '', imageUrl: '', price: 0, categoryId: '', name: '' })
    }
  }, [editItem, reset, open])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setValue('imageUrl', url)
      toast.success('อัปโหลดรูปสำเร็จ')
    } catch {
      toast.error('อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: MenuItemFormData) {
    setSaving(true)
    try {
      if (isEdit && editItem) {
        await updateMenuItem(editItem.id, data)
        toast.success('แก้ไขเมนูสำเร็จ')
      } else {
        await createMenuItem(data)
        toast.success('เพิ่มเมนูสำเร็จ')
      }
      onSaved()
      onClose()
    } catch {
      toast.error('บันทึกข้อมูลไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'แก้ไขเมนู' : 'เพิ่มเมนู'} maxWidth="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="ชื่อเมนู *" {...register('name')} error={errors.name?.message} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">คำอธิบาย</label>
          <textarea
            {...register('description')}
            rows={2}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            placeholder="คำอธิบายเมนู (ไม่บังคับ)"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">ราคา (บาท) *</label>
            <input
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">หมวดหมู่ *</label>
            <select
              {...register('categoryId')}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
            >
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">รูปภาพ</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="URL รูปภาพ หรืออัปโหลดด้านล่าง"
              {...register('imageUrl')}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              {uploading ? 'กำลังอัปโหลด...' : '📷 อัปโหลดรูป'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="preview" className="h-12 w-12 rounded-lg object-cover border border-gray-200" />
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isAvailable')} className="rounded accent-orange-500" />
            เปิดขาย
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isSoldOut')} className="rounded accent-orange-500" />
            สินค้าหมด
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">ยกเลิก</Button>
          <Button type="submit" loading={saving} className="flex-1">{isEdit ? 'บันทึก' : 'เพิ่มเมนู'}</Button>
        </div>
      </form>
    </Modal>
  )
}
