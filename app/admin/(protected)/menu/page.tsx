'use client'
import { useState } from 'react'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdminMenu } from '@/lib/hooks/useMenu'
import { deleteMenuItem, updateMenuItem } from '@/lib/services/menuService'
import { createCategory, updateCategory, deleteCategory } from '@/lib/services/categoryService'
import { MenuFormModal } from '@/components/admin/MenuFormModal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { FirebaseBanner } from '@/components/admin/FirebaseBanner'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils/format'
import type { MenuItem } from '@/types'

export default function MenuPage() {
  const { items, categories, loading, reload } = useAdminMenu()
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  function openAdd() { setEditItem(null); setModalOpen(true) }
  function openEdit(item: MenuItem) { setEditItem(item); setModalOpen(true) }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`ลบ "${item.name}" ใช่หรือไม่?`)) return
    try {
      await deleteMenuItem(item.id)
      toast.success('ลบเมนูสำเร็จ')
      reload()
    } catch {
      toast.error('ลบไม่สำเร็จ')
    }
  }

  async function handleToggleAvailable(item: MenuItem) {
    try {
      await updateMenuItem(item.id, { isAvailable: !item.isAvailable })
      toast.success(item.isAvailable ? 'ปิดเมนูแล้ว' : 'เปิดเมนูแล้ว')
      reload()
    } catch { toast.error('อัปเดตไม่สำเร็จ') }
  }

  async function handleToggleSoldOut(item: MenuItem) {
    try {
      await updateMenuItem(item.id, { isSoldOut: !item.isSoldOut })
      toast.success(item.isSoldOut ? 'มีสินค้าแล้ว' : 'ตั้งเป็นสินค้าหมด')
      reload()
    } catch { toast.error('อัปเดตไม่สำเร็จ') }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      await createCategory({ name: newCatName.trim(), sortOrder: categories.length, isActive: true })
      toast.success('เพิ่มหมวดหมู่สำเร็จ')
      setNewCatName('')
      reload()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'เพิ่มไม่สำเร็จ') }
    finally { setAddingCat(false) }
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`ลบหมวดหมู่ "${name}" ใช่หรือไม่?`)) return
    try {
      await deleteCategory(id)
      toast.success('ลบหมวดหมู่สำเร็จ')
      reload()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ') }
  }

  if (loading) return <Spinner text="กำลังโหลด..." />

  return (
    <div className="flex flex-col gap-6">
      <FirebaseBanner />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">จัดการเมนู</h1>
        <Button onClick={openAdd}><Plus size={16} />เพิ่มเมนู</Button>
      </div>

      {/* Categories */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={16} className="text-orange-500" />
          <h2 className="font-semibold text-gray-700">หมวดหมู่ ({categories.length})</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
              <span className="text-sm">{cat.name}</span>
              <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="ml-1 text-gray-400 hover:text-red-500">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="ชื่อหมวดหมู่ใหม่"
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 outline-none"
          />
          <Button size="sm" onClick={handleAddCategory} loading={addingCat}>เพิ่ม</Button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p>ยังไม่มีเมนู</p>
            <button onClick={openAdd} className="mt-2 text-sm text-orange-500 hover:underline">เพิ่มเมนูแรก</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['เมนู', 'หมวดหมู่', 'ราคา', 'สถานะ', 'จัดการ'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const cat = categories.find((c) => c.id === item.categoryId)
                return (
                  <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-lg object-cover border border-gray-100" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">🍽️</div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cat ? <Badge color="gray">{cat.name}</Badge> : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-orange-600">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleToggleAvailable(item)} className="flex items-center gap-1 text-xs">
                          {item.isAvailable ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} className="text-gray-300" />}
                          <span className={item.isAvailable ? 'text-green-600' : 'text-gray-400'}>{item.isAvailable ? 'เปิดขาย' : 'ปิดขาย'}</span>
                        </button>
                        <button onClick={() => handleToggleSoldOut(item)} className="flex items-center gap-1 text-xs">
                          {item.isSoldOut ? <ToggleRight size={16} className="text-red-500" /> : <ToggleLeft size={16} className="text-gray-300" />}
                          <span className={item.isSoldOut ? 'text-red-500' : 'text-gray-400'}>{item.isSoldOut ? 'สินค้าหมด' : 'มีสินค้า'}</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-500 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <MenuFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={reload}
        editItem={editItem}
        categories={categories}
      />
    </div>
  )
}
