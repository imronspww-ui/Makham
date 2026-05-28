'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { menuItemSchema, type MenuItemFormData } from '@/lib/utils/validation'
import { createMenuItem, updateMenuItem } from '@/lib/services/menuService'
import { uploadImage } from '@/lib/firebase/storage'
import type { MenuItem, Category, OptionGroup, OptionChoice } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editItem?: MenuItem | null
  categories: Category[]
}

function uid() { return Math.random().toString(36).slice(2) }

export function MenuFormModal({ open, onClose, onSaved, editItem, categories }: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
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
        isPopular: editItem.isPopular ?? false,
      })
      setOptionGroups(editItem.optionGroups ?? [])
      setExpandedGroups(new Set((editItem.optionGroups ?? []).map((g) => g.id)))
    } else {
      reset({ isAvailable: true, isSoldOut: false, isPopular: false, description: '', imageUrl: '', price: 0, categoryId: '', name: '' })
      setOptionGroups([])
      setExpandedGroups(new Set())
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

  // ─── Option group helpers ─────────────────────────────────────────────────
  function addGroup() {
    const id = uid()
    const newGroup: OptionGroup = { id, name: '', required: false, multiSelect: false, choices: [] }
    setOptionGroups((prev) => [...prev, newGroup])
    setExpandedGroups((prev) => new Set([...prev, id]))
  }

  function removeGroup(groupId: string) {
    setOptionGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  function updateGroup<K extends keyof OptionGroup>(groupId: string, field: K, value: OptionGroup[K]) {
    setOptionGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, [field]: value } : g))
  }

  function addChoice(groupId: string) {
    const choice: OptionChoice = { id: uid(), name: '', extraPrice: 0 }
    setOptionGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, choices: [...g.choices, choice] } : g))
  }

  function removeChoice(groupId: string, choiceId: string) {
    setOptionGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, choices: g.choices.filter((c) => c.id !== choiceId) } : g))
  }

  function updateChoice<K extends keyof OptionChoice>(groupId: string, choiceId: string, field: K, value: OptionChoice[K]) {
    setOptionGroups((prev) => prev.map((g) =>
      g.id === groupId
        ? { ...g, choices: g.choices.map((c) => c.id === choiceId ? { ...c, [field]: value } : c) }
        : g,
    ))
  }

  function toggleGroupExpand(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(groupId) ? next.delete(groupId) : next.add(groupId)
      return next
    })
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function onSubmit(data: MenuItemFormData) {
    setSaving(true)
    try {
      const fullData = { ...data, optionGroups }
      if (isEdit && editItem) {
        await updateMenuItem(editItem.id, fullData)
        toast.success('แก้ไขเมนูสำเร็จ')
      } else {
        await createMenuItem(fullData)
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
          <textarea {...register('description')} rows={2}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            placeholder="คำอธิบายเมนู (ไม่บังคับ)" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">ราคา (บาท) *</label>
            <input type="number" step="0.01"
              {...register('price', { valueAsNumber: true })}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">หมวดหมู่ *</label>
            <select {...register('categoryId')}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
          </div>
        </div>

        {/* Image */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">รูปภาพ</label>
          <div className="flex gap-2">
            <input type="text" placeholder="URL รูปภาพ หรืออัปโหลดด้านล่าง"
              {...register('imageUrl')}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              {uploading ? 'กำลังอัปโหลด...' : '📷 อัปโหลดรูป'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="preview" className="h-12 w-12 rounded-lg object-cover border border-gray-200" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            )}
          </div>
        </div>

        {/* Availability + Popular */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isAvailable')} className="rounded accent-orange-500" />
            เปิดขาย
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isSoldOut')} className="rounded accent-orange-500" />
            สินค้าหมด
          </label>
          <label className="flex items-center gap-2 text-sm text-amber-700 font-medium">
            <input type="checkbox" {...register('isPopular')} className="rounded accent-amber-500" />
            🔥 เมนูยอดนิยม
          </label>
        </div>

        {/* ─── Option Groups ─────────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">ตัวเลือกเพิ่มเติม</p>
              <p className="text-xs text-gray-400">เช่น ระดับความเผ็ด, น้ำจิ้ม, ไม่ใส่ผัก</p>
            </div>
            <button type="button" onClick={addGroup}
              className="flex items-center gap-1.5 rounded-xl border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors">
              <Plus size={12} />
              เพิ่มกลุ่ม
            </button>
          </div>

          {optionGroups.map((group, gIdx) => (
            <div key={group.id} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
                <button type="button" onClick={() => toggleGroupExpand(group.id)} className="text-gray-400 hover:text-gray-600">
                  {expandedGroups.has(group.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <input
                  value={group.name}
                  onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                  placeholder={`กลุ่มที่ ${gIdx + 1} เช่น ระดับความเผ็ด`}
                  className="flex-1 text-sm font-medium bg-transparent outline-none placeholder-gray-300"
                />
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={group.required}
                    onChange={(e) => updateGroup(group.id, 'required', e.target.checked)}
                    className="accent-orange-500 rounded" />
                  จำเป็น
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={group.multiSelect}
                    onChange={(e) => updateGroup(group.id, 'multiSelect', e.target.checked)}
                    className="accent-orange-500 rounded" />
                  เลือกได้หลาย
                </label>
                <button type="button" onClick={() => removeGroup(group.id)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Choices */}
              {expandedGroups.has(group.id) && (
                <div className="p-3 flex flex-col gap-2">
                  {group.choices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-2">
                      <input
                        value={choice.name}
                        onChange={(e) => updateChoice(group.id, choice.id, 'name', e.target.value)}
                        placeholder="ชื่อตัวเลือก"
                        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-orange-400 bg-white"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">+฿</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={choice.extraPrice}
                          onChange={(e) => updateChoice(group.id, choice.id, 'extraPrice', Number(e.target.value) || 0)}
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center outline-none focus:border-orange-400 bg-white"
                        />
                      </div>
                      <button type="button" onClick={() => removeChoice(group.id, choice.id)}
                        className="p-1 text-red-400 hover:text-red-600 rounded transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addChoice(group.id)}
                    className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-700 transition-colors mt-1">
                    <Plus size={12} />
                    เพิ่มตัวเลือก
                  </button>
                </div>
              )}
            </div>
          ))}

          {optionGroups.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">ยังไม่มีตัวเลือก — กด "เพิ่มกลุ่ม" เพื่อเพิ่ม</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">ยกเลิก</Button>
          <Button type="submit" loading={saving} className="flex-1">{isEdit ? 'บันทึก' : 'เพิ่มเมนู'}</Button>
        </div>
      </form>
    </Modal>
  )
}
