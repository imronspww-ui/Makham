'use client'
import { useState, useEffect } from 'react'
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOrders, deleteAllOrders } from '@/lib/services/orderService'

export function DangerZoneForm() {
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getOrders().then((orders) => setOrderCount(orders.length))
  }, [])

  const CONFIRM_WORD = 'ลบทั้งหมด'
  const canDelete = confirmText === CONFIRM_WORD

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    try {
      const count = await deleteAllOrders()
      toast.success(`ลบออเดอร์ทั้งหมด ${count} รายการสำเร็จ`)
      setOrderCount(0)
      setOpen(false)
      setConfirmText('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Info ── */}
      <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
        <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
        <div className="text-sm text-red-700">
          <p className="font-medium">ใช้ก่อน Go-Live เท่านั้น</p>
          <p className="text-xs text-red-500 mt-0.5">
            การลบเป็นการถาวร — ออเดอร์ที่ลบแล้วไม่สามารถกู้คืนได้
          </p>
        </div>
      </div>

      {/* ── Count + trigger ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">ออเดอร์ทั้งหมดในระบบ</p>
          <p className="text-2xl font-bold text-gray-800 mt-0.5">
            {orderCount === null ? '...' : orderCount}
            <span className="text-sm font-normal text-gray-400 ml-1">รายการ</span>
          </p>
        </div>
        <button
          onClick={() => { setOpen(true); setConfirmText('') }}
          disabled={orderCount === 0}
          className="flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 size={15} />
          ล้างข้อมูลทดสอบ
        </button>
      </div>

      {/* ── Confirm modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 flex flex-col gap-5">
            {/* header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <ShieldAlert size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-gray-800">ยืนยันการลบทั้งหมด</p>
                <p className="text-xs text-gray-400">จะลบออเดอร์ {orderCount} รายการ</p>
              </div>
            </div>

            {/* confirm input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-600">
                พิมพ์ <span className="font-bold text-red-600 select-none">{CONFIRM_WORD}</span> เพื่อยืนยัน
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoFocus
                className="rounded-xl border-2 border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
              />
            </div>

            {/* actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setOpen(false); setConfirmText('') }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    กำลังลบ...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    ลบทั้งหมด
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
