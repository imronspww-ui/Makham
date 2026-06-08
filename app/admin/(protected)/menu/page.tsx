'use client'
import { useState } from 'react'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Tag, Settings2, PackageX, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdminMenu } from '@/lib/hooks/useMenu'
import { deleteMenuItem, updateMenuItem } from '@/lib/services/menuService'
import { deleteCategory } from '@/lib/services/categoryService'
import { MenuFormModal } from '@/components/admin/MenuFormModal'
import { CategoryFormModal } from '@/components/admin/CategoryFormModal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { FirebaseBanner } from '@/components/admin/FirebaseBanner'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils/format'
import type { Category, MenuItem } from '@/types'

export default function MenuPage() {
  const { items, categories, loading, reload } = useAdminMenu()
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editItem,     setEditItem]     = useState<MenuItem | null>(null)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
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

  async function handleTogglePopular(item: MenuItem) {
    try {
      await updateMenuItem(item.id, { isPopular: !item.isPopular })
      toast.success(item.isPopular ? 'ยกเลิกเมนูยอดนิยม' : '🔥 เพิ่มเป็นเมนูยอดนิยมแล้ว')
      reload()
    } catch { toast.error('อัปเดตไม่สำเร็จ') }
  }

  function openAddCategory() {
    setEditCategory(null)
    setCatModalOpen(true)
  }

  function openEditCategory(cat: Category) {
    setEditCategory(cat)
    setCatModalOpen(true)
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-orange-500" />
            <h2 className="font-semibold text-gray-700">หมวดหมู่ ({categories.length})</h2>
          </div>
          <Button size="sm" onClick={openAddCategory}><Plus size={14} />เพิ่มหมวดหมู่</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const hasOptions = (cat.optionGroups ?? []).length > 0
            return (
              <div key={cat.id} className={[
                'flex items-center gap-1.5 rounded-full border px-3 py-1',
                hasOptions ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50',
              ].join(' ')}>
                <span className="text-sm">{cat.name}</span>
                {hasOptions && (
                  <span className="text-[10px] text-orange-500 font-medium bg-orange-100 rounded-full px-1.5">
                    {cat.optionGroups!.length} ตัวเลือก
                  </span>
                )}
                <button onClick={() => openEditCategory(cat)}
                  className="text-gray-400 hover:text-orange-500 transition-colors ml-0.5">
                  <Settings2 size={12} />
                </button>
                <button onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="text-gray-400 hover:text-red-500 transition-colors">×</button>
              </div>
            )
          })}
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
                {['เมนู', 'หมวดหมู่', 'ราคา', 'ตัวเลือก', 'คะแนน', 'สินค้าหมด', 'สถานะ', 'จัดการ'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const cat = categories.find((c) => c.id === item.categoryId)
                return (
                  <tr key={item.id} className={[
                    'border-t border-gray-50 transition-colors',
                    item.isSoldOut ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-gray-50/50',
                  ].join(' ')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className={['font-medium', item.isSoldOut ? 'text-gray-400 line-through' : 'text-gray-800'].join(' ')}>{item.name}</p>
                            {item.isPopular && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5">🔥</span>
                            )}
                            {item.isSoldOut && (
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-1.5">หมด</span>
                            )}
                          </div>
                          {item.description && <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cat ? <Badge color="gray">{cat.name}</Badge> : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-orange-600">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3">
                      {(item.optionGroups ?? []).length > 0 ? (
                        <span className="text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5">
                          {item.optionGroups.length} กลุ่ม
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* ── ดาว Rating ── */}
                    <td className="px-4 py-3">
                      {item.avgRating ? (
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-xs font-semibold text-gray-700">{item.avgRating.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">({item.ratingCount})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* ── ปุ่มสินค้าหมด ── */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleSoldOut(item)}
                        className={[
                          'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95',
                          item.isSoldOut
                            ? 'bg-red-100 text-red-600 border border-red-300 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200',
                        ].join(' ')}
                        title={item.isSoldOut ? 'คลิกเพื่อรีเซ็ต (มีสินค้า)' : 'คลิกเพื่อตั้งเป็นสินค้าหมด'}
                      >
                        <PackageX size={13} />
                        {item.isSoldOut ? 'หมดแล้ว' : 'หมด?'}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleToggleAvailable(item)} className="flex items-center gap-1 text-xs">
                          {item.isAvailable ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} className="text-gray-300" />}
                          <span className={item.isAvailable ? 'text-green-600' : 'text-gray-400'}>{item.isAvailable ? 'เปิดขาย' : 'ปิดขาย'}</span>
                        </button>
                        <button onClick={() => handleTogglePopular(item)} className="flex items-center gap-1 text-xs">
                          {item.isPopular ? <ToggleRight size={16} className="text-amber-500" /> : <ToggleLeft size={16} className="text-gray-300" />}
                          <span className={item.isPopular ? 'text-amber-600 font-medium' : 'text-gray-400'}>{item.isPopular ? '🔥 ยอดนิยม' : 'ยอดนิยม'}</span>
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
      <CategoryFormModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        onSaved={reload}
        category={editCategory}
        defaultSortOrder={categories.length}
      />
    </div>
  )
}
