'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createCategory, updateCategory } from '@/lib/services/categoryService'
import type { Category, OptionGroup, OptionChoice } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  category: Category | null   // null = create mode
  defaultSortOrder?: number
}

function uid() { return Math.random().toString(36).slice(2) }

export function CategoryFormModal({ open, onClose, onSaved, category, defaultSortOrder = 0 }: Props) {
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (category) {
      setName(category.name)
      setSortOrder(category.sortOrder)
      setIsActive(category.isActive)
      setOptionGroups(category.optionGroups ?? [])
      setExpandedGroups(new Set((category.optionGroups ?? []).map((g) => g.id)))
    } else {
      setName('')
      setSortOrder(defaultSortOrder)
      setIsActive(true)
      setOptionGroups([])
      setExpandedGroups(new Set())
    }
  }, [category, open, defaultSortOrder])

  // ─── Option group helpers ─────────────────────────────────────────────────
  function addGroup() {
    const id = uid()
    setOptionGroups((prev) => [...prev, { id, name: '', required: false, multiSelect: false, choices: [] }])
    setExpandedGroups((prev) => new Set([...prev, id]))
  }
  function removeGroup(gid: string) { setOptionGroups((prev) => prev.filter((g) => g.id !== gid)) }
  function updateGroup<K extends keyof OptionGroup>(gid: string, field: K, value: OptionGroup[K]) {
    setOptionGroups((prev) => prev.map((g) => g.id === gid ? { ...g, [field]: value } : g))
  }
  function addChoice(gid: string) {
    setOptionGroups((prev) => prev.map((g) =>
      g.id === gid ? { ...g, choices: [...g.choices, { id: uid(), name: '', extraPrice: 0 }] } : g,
    ))
  }
  function removeChoice(gid: string, cid: string) {
    setOptionGroups((prev) => prev.map((g) =>
      g.id === gid ? { ...g, choices: g.choices.filter((c) => c.id !== cid) } : g,
    ))
  }
  function updateChoice<K extends keyof OptionChoice>(gid: string, cid: string, field: K, value: OptionChoice[K]) {
    setOptionGroups((prev) => prev.map((g) =>
      g.id === gid ? { ...g, choices: g.choices.map((c) => c.id === cid ? { ...c, [field]: value } : c) } : g,
    ))
  }
  function toggleExpand(gid: string) {
    setExpandedGroups((prev) => { const s = new Set(prev); s.has(gid) ? s.delete(gid) : s.add(gid); return s })
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim()) { toast.error('กรุณากรอกชื่อหมวดหมู่'); return }
    setSaving(true)
    try {
      const data = { name: name.trim(), sortOrder, isActive, optionGroups }
      if (category) {
        await updateCategory(category.id, data)
        toast.success('บันทึกหมวดหมู่สำเร็จ')
      } else {
        await createCategory(data)
        toast.success('เพิ่มหมวดหมู่สำเร็จ')
      }
      onSaved()
      onClose()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={category ? `แก้ไขหมวดหมู่: ${category.name}` : 'เพิ่มหมวดหมู่'}
      maxWidth="lg">
      <div className="flex flex-col gap-4">
        {/* Name */}
        <Input label="ชื่อหมวดหมู่ *" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ลูกชิ้น" />

        {/* Sort + active */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">ลำดับ</label>
            <input type="number" value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-24 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <label className="flex items-center gap-2 text-sm mt-5 cursor-pointer">
            <input type="checkbox" checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded accent-orange-500" />
            เปิดใช้งาน
          </label>
        </div>

        {/* Category-level option groups */}
        <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">ตัวเลือกประจำหมวดหมู่</p>
              <p className="text-xs text-gray-400 mt-0.5">
                ลูกค้าเลือก <span className="font-medium">1 ครั้งต่อออเดอร์</span> เมื่อมีสินค้าหมวดนี้ในตะกร้า
              </p>
              <p className="text-xs text-orange-500">เช่น น้ำจิ้มสำหรับลูกชิ้น</p>
            </div>
            <button type="button" onClick={addGroup}
              className="flex items-center gap-1.5 rounded-xl border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors">
              <Plus size={12} /> เพิ่มกลุ่ม
            </button>
          </div>

          {optionGroups.map((group, gIdx) => (
            <div key={group.id} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
                <button type="button" onClick={() => toggleExpand(group.id)} className="text-gray-400 hover:text-gray-600">
                  {expandedGroups.has(group.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <input value={group.name}
                  onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                  placeholder={`กลุ่มที่ ${gIdx + 1} เช่น น้ำจิ้ม`}
                  className="flex-1 text-sm font-medium bg-transparent outline-none placeholder-gray-300" />
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={group.required}
                    onChange={(e) => updateGroup(group.id, 'required', e.target.checked)}
                    className="accent-orange-500 rounded" /> จำเป็น
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={group.multiSelect}
                    onChange={(e) => updateGroup(group.id, 'multiSelect', e.target.checked)}
                    className="accent-orange-500 rounded" /> เลือกได้หลาย
                </label>
                <button type="button" onClick={() => removeGroup(group.id)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
              {expandedGroups.has(group.id) && (
                <div className="p-3 flex flex-col gap-2">
                  {group.choices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-2">
                      <input value={choice.name}
                        onChange={(e) => updateChoice(group.id, choice.id, 'name', e.target.value)}
                        placeholder="ชื่อตัวเลือก เช่น น้ำจิ้มรสแซ่บ"
                        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-orange-400 bg-white" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">+฿</span>
                        <input type="number" min="0" step="1" value={choice.extraPrice}
                          onChange={(e) => updateChoice(group.id, choice.id, 'extraPrice', Number(e.target.value) || 0)}
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center outline-none focus:border-orange-400 bg-white" />
                      </div>
                      <button type="button" onClick={() => removeChoice(group.id, choice.id)}
                        className="p-1 text-red-400 hover:text-red-600 rounded transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addChoice(group.id)}
                    className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-700 mt-1 transition-colors">
                    <Plus size={12} /> เพิ่มตัวเลือก
                  </button>
                </div>
              )}
            </div>
          ))}

          {optionGroups.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              ยังไม่มีตัวเลือก — กด "เพิ่มกลุ่ม" เพื่อเพิ่ม
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">ยกเลิก</Button>
          <Button type="button" loading={saving} onClick={handleSave} className="flex-1">
            {category ? 'บันทึก' : 'เพิ่มหมวดหมู่'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
