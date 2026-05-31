'use client'
import { useEffect, useState } from 'react'
import { Users, Search, TrendingUp, Star, X, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { subscribeToCustomers, adjustCustomerPoints } from '@/lib/services/customerService'
import { formatCurrency } from '@/lib/utils/format'
import type { CustomerProfile } from '@/types'

// ─── Adjust Points Modal ──────────────────────────────────────────────────────

function AdjustModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: CustomerProfile
  onClose: () => void
  onSaved: () => void
}) {
  const [delta,   setDelta]   = useState(0)
  const [saving,  setSaving]  = useState(false)
  const [isAdd,   setIsAdd]   = useState(true)

  const effectiveDelta = isAdd ? Math.abs(delta) : -Math.abs(delta)
  const preview        = Math.max(0, customer.points + effectiveDelta)

  async function handleSave() {
    if (delta === 0) { toast.error('กรอกจำนวนแต้มก่อน'); return }
    setSaving(true)
    try {
      await adjustCustomerPoints(customer.phone, effectiveDelta)
      toast.success(`ปรับแต้ม ${customer.name} สำเร็จ`)
      onSaved()
      onClose()
    } catch {
      toast.error('ปรับแต้มไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">ปรับแต้ม</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="bg-amber-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">{customer.name}</p>
            <p className="text-xs text-gray-500">{customer.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-600">{customer.points.toLocaleString()}</p>
            <p className="text-xs text-gray-400">แต้มปัจจุบัน</p>
          </div>
        </div>

        {/* +/- toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsAdd(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
              isAdd ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-50 text-gray-500 border border-gray-200'
            }`}
          >
            <ChevronUp size={16} />
            เพิ่มแต้ม
          </button>
          <button
            type="button"
            onClick={() => setIsAdd(false)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
              !isAdd ? 'bg-red-100 text-red-600 border-2 border-red-300' : 'bg-gray-50 text-gray-500 border border-gray-200'
            }`}
          >
            <ChevronDown size={16} />
            หักแต้ม
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนแต้ม</label>
          <input
            type="number"
            min={0}
            value={delta === 0 ? '' : delta}
            onChange={(e) => setDelta(Math.abs(Number(e.target.value)))}
            placeholder="0"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {delta > 0 && (
            <p className={`text-xs mt-1 font-medium ${effectiveDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              หลังปรับ: {preview.toLocaleString()} แต้ม
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || delta === 0}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-800 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [search,    setSearch]    = useState('')
  const [adjusting, setAdjusting] = useState<CustomerProfile | null>(null)

  useEffect(() => {
    return subscribeToCustomers(setCustomers)
  }, [])

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  )

  // ── Summary stats
  const totalPoints = customers.reduce((s, c) => s + c.points, 0)
  const totalSpent  = customers.reduce((s, c) => s + c.totalSpent, 0)

  function isExpired(c: CustomerProfile) {
    return new Date(c.pointsExpireAt) < new Date()
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ลูกค้า</h1>
          <p className="text-sm text-gray-400 mt-0.5">{customers.length} คน ทั้งหมด</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
            <Users size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{customers.length}</p>
            <p className="text-xs text-gray-400">ลูกค้าทั้งหมด</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Star size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{totalPoints.toLocaleString()}</p>
            <p className="text-xs text-gray-400">แต้มสะสมรวม</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-gray-400">ยอดซื้อรวมทั้งหมด</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อหรือเบอร์โทร..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={14} className="text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
            <Users size={32} className="opacity-30" />
            <p className="text-sm">{search ? 'ไม่พบลูกค้า' : 'ยังไม่มีข้อมูลลูกค้า'}</p>
            {!search && (
              <p className="text-xs text-gray-300">ข้อมูลจะปรากฏหลังลูกค้าสั่งอาหารครั้งแรก</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ชื่อ / เบอร์</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">แต้ม</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">ยอดซื้อรวม</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">ออเดอร์</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">สั่งล่าสุด</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">หมดอายุ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => {
                  const expired = isExpired(c)
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold text-base ${expired ? 'text-gray-300' : 'text-amber-600'}`}>
                          {c.points.toLocaleString()}
                        </span>
                        {expired && (
                          <p className="text-xs text-red-400">หมดอายุ</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        {formatCurrency(c.totalSpent)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{c.totalOrders}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(c.lastOrderAt).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short', year: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={expired ? 'text-red-400' : 'text-gray-400'}>
                          {new Date(c.pointsExpireAt).toLocaleDateString('th-TH', {
                            day: 'numeric', month: 'short', year: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setAdjusting(c)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-amber-100 hover:text-amber-700 transition-colors whitespace-nowrap"
                        >
                          ปรับแต้ม
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust modal */}
      {adjusting && (
        <AdjustModal
          customer={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  )
}
