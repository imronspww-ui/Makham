'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, TrendingDown, Package, Zap, Flame, PiggyBank } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdminMenu } from '@/lib/hooks/useMenu'
import { useSettings } from '@/lib/hooks/useSettings'
import { updateMenuItem } from '@/lib/services/menuService'
import { updateStoreCosts, updateReservePercent } from '@/lib/services/settingsService'
import { formatCurrency } from '@/lib/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import type { CostItem } from '@/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function costPerUnit(costPerPack?: number, packSize?: number): number | null {
  if (!costPerPack || !packSize || packSize === 0) return null
  return costPerPack / packSize
}

function margin(price: number, cpu: number | null): number | null {
  if (cpu === null) return null
  return ((price - cpu) / price) * 100
}

// ─── Menu cost table ──────────────────────────────────────────────────────────

function MenuCostRow({ item, onSaved }: {
  item: import('@/types').MenuItem
  onSaved: () => void
}) {
  const [cost, setCost] = useState(String(item.costPerPack ?? ''))
  const [saving, setSaving] = useState(false)

  const cpu    = costPerUnit(Number(cost) || undefined, item.packSize)
  const mgn    = margin(item.price, cpu)

  async function handleSave() {
    const val = parseFloat(cost)
    setSaving(true)
    try {
      await updateMenuItem(item.id, { costPerPack: isNaN(val) || val <= 0 ? undefined : val })
      toast.success('บันทึกแล้ว')
      onSaved()
    } catch { toast.error('บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {item.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.imageUrl} alt={item.name} className="h-8 w-8 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
            : <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">🍽️</div>
          }
          <div>
            <p className="text-sm font-medium text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-400">ราคาขาย {formatCurrency(item.price)}{item.packSize ? ` · ${item.packSize} ชิ้น/แพ็ค` : ''}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <input
            type="number" min="0" step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0.00"
            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <span className="text-xs text-gray-400">บาท/แพ็ค</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {cpu !== null ? formatCurrency(cpu) : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3">
        {mgn !== null ? (
          <span className={`text-sm font-semibold ${mgn >= 50 ? 'text-green-600' : mgn >= 30 ? 'text-amber-600' : 'text-red-500'}`}>
            {mgn.toFixed(1)}%
          </span>
        ) : <span className="text-gray-300 text-sm">—</span>}
      </td>
      <td className="px-4 py-3">
        {cpu !== null ? (
          <span className="text-sm font-semibold text-blue-600">
            {formatCurrency(item.price - cpu)}
          </span>
        ) : <span className="text-gray-300 text-sm">—</span>}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          <Save size={11} />
          {saving ? '...' : 'บันทึก'}
        </button>
      </td>
    </tr>
  )
}

// ─── Store costs form ─────────────────────────────────────────────────────────

const PRESET_COSTS = [
  { name: 'ค่าไฟ',       icon: <Zap  size={13} /> },
  { name: 'ค่าแก๊ส',     icon: <Flame size={13} /> },
  { name: 'ค่าเช่าร้าน', icon: null },
  { name: 'ค่าน้ำ',      icon: null },
]

function StoreCostsForm({ initial, onSaved }: { initial: CostItem[]; onSaved: () => void }) {
  const [costs,   setCosts]   = useState<CostItem[]>(initial)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { setCosts(initial) }, [initial])

  function addCost(type: 'fixed' | 'variable', name = '') {
    setCosts((c) => [...c, { id: uid(), name, amount: 0, type }])
  }

  function updateCost(id: string, field: keyof CostItem, value: string | number) {
    setCosts((c) => c.map((x) => x.id === id ? { ...x, [field]: value } : x))
  }

  function removeCost(id: string) {
    setCosts((c) => c.filter((x) => x.id !== id))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateStoreCosts(costs)
      toast.success('บันทึกค่าใช้จ่ายแล้ว')
      onSaved()
    } catch { toast.error('บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  const fixed    = costs.filter((c) => c.type === 'fixed')
  const variable = costs.filter((c) => c.type === 'variable')
  const totalFixed    = fixed.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const totalVariable = variable.reduce((s, c) => s + (Number(c.amount) || 0), 0)

  function CostSection({ items, type, label }: { items: CostItem[]; type: 'fixed' | 'variable'; label: string }) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
          <button
            onClick={() => addCost(type)}
            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700"
          >
            <Plus size={13} /> เพิ่มรายการ
          </button>
        </div>

        {/* Preset shortcuts */}
        {type === 'variable' && (
          <div className="flex gap-2 flex-wrap">
            {PRESET_COSTS.map((p) => (
              <button
                key={p.name}
                onClick={() => addCost('variable', p.name)}
                className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                {p.icon}{p.name}
              </button>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-xs text-gray-300 py-2">ยังไม่มีรายการ</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => updateCost(c.id, 'name', e.target.value)}
                  placeholder="ชื่อรายการ"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <input
                  type="number" min="0" step="1"
                  value={c.amount || ''}
                  onChange={(e) => updateCost(c.id, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="จำนวนเงิน"
                  className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <span className="text-xs text-gray-400 shrink-0">บาท/เดือน</span>
                <button onClick={() => removeCost(c.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-500 font-medium text-right">
              รวม: <span className="text-gray-800 font-bold">{formatCurrency(type === 'fixed' ? totalFixed : totalVariable)}</span>/เดือน
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <CostSection items={fixed}    type="fixed"    label="ค่าใช้จ่ายคงที่ (Fixed)" />
      <div className="border-t border-gray-100" />
      <CostSection items={variable} type="variable" label="ค่าใช้จ่ายผันแปร (Variable)" />
      <div className="border-t border-gray-100" />
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          รวมทั้งหมด: <span className="text-orange-600">{formatCurrency(totalFixed + totalVariable)}</span>/เดือน
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <Save size={14} />
          {saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Reserve % form ───────────────────────────────────────────────────────────

function ReserveForm({ initial, onSaved }: { initial: number; onSaved: () => void }) {
  const [pct,    setPct]    = useState(String(initial))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setPct(String(initial)) }, [initial])

  async function handleSave() {
    const val = parseFloat(pct)
    if (isNaN(val) || val < 0 || val > 100) { toast.error('กรอก 0-100'); return }
    setSaving(true)
    try {
      await updateReservePercent(val)
      toast.success('บันทึกแล้ว')
      onSaved()
    } catch { toast.error('บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <input
          type="number" min="0" max="100" step="1"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <span className="text-sm text-gray-500">% ของกำไรสุทธิ/เดือน</span>
      </div>
      <div className="flex gap-2">
        {[10, 20, 30].map((p) => (
          <button
            key={p}
            onClick={() => setPct(String(p))}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              pct === String(p) ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-500 hover:border-orange-300'
            }`}
          >
            {p}%
          </button>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        <Save size={13} />
        {saving ? '...' : 'บันทึก'}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CostsPage() {
  const { items, loading: menuLoading, reload } = useAdminMenu()
  const { settings, loading: settingsLoading, reload: reloadSettings } = useSettings()

  if (menuLoading || settingsLoading) return <Spinner text="กำลังโหลด..." />

  const totalMonthCost   = (settings?.costs ?? []).reduce((s, c) => s + c.amount, 0)
  const reservePct       = settings?.reservePercent ?? 20

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">ต้นทุน & กำไร</h1>
        <p className="text-sm text-gray-400 mt-0.5">จัดการต้นทุนวัตถุดิบและค่าใช้จ่ายร้าน</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <TrendingDown size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totalMonthCost)}</p>
            <p className="text-xs text-gray-400">ค่าใช้จ่ายร้าน/เดือน</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
            <Package size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">
              {items.filter((i) => i.costPerPack).length}/{items.length}
            </p>
            <p className="text-xs text-gray-400">เมนูที่ตั้งต้นทุนแล้ว</p>
          </div>
        </div>
      </div>

      {/* Menu cost table */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">ต้นทุนต่อเมนู</h2>
          <p className="text-xs text-gray-400 mt-0.5">กรอกราคาซื้อต่อแพ็ค — ระบบคำนวณต้นทุน/ชิ้นและกำไรให้อัตโนมัติ</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['เมนู', 'ต้นทุน/แพ็ค', 'ต้นทุน/ชิ้น', '%กำไร', 'กำไร/ชิ้น', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <MenuCostRow key={item.id} item={item} onSaved={reload} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Store costs */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
        <div className="mb-5">
          <h2 className="font-semibold text-gray-700">ค่าใช้จ่ายร้านรายเดือน</h2>
          <p className="text-xs text-gray-400 mt-0.5">ค่าคงที่ เช่น ค่าเช่า / ค่าผันแปร เช่น ค่าไฟ ค่าแก๊ส</p>
        </div>
        <StoreCostsForm
          initial={settings?.costs ?? []}
          onSaved={reloadSettings}
        />
      </div>

      {/* Reserve % */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank size={18} className="text-pink-500" />
          <div>
            <h2 className="font-semibold text-gray-700">เงินสำรองร้าน</h2>
            <p className="text-xs text-gray-400">% ที่กันไว้จากกำไรสุทธิรายเดือน ส่วนที่เหลือคือเงินเก็บส่วนตัว</p>
          </div>
        </div>
        <ReserveForm
          initial={reservePct}
          onSaved={reloadSettings}
        />
      </div>

      {/* โครงสร้างกำไร (อธิบาย) */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-5 text-white">
        <p className="text-sm font-semibold mb-3 text-gray-300">โครงสร้างกำไร (ตัวอย่าง)</p>
        {[
          { label: 'รายได้รวม',                     color: 'bg-green-400',  sign: '' },
          { label: '− ต้นทุนวัตถุดิบ',              color: 'bg-red-400',    sign: '' },
          { label: '= กำไรขั้นต้น',                  color: 'bg-blue-400',   sign: '' },
          { label: '− ค่าใช้จ่ายร้าน (ไฟ/แก๊ส/เช่า)', color: 'bg-orange-400', sign: '' },
          { label: '= กำไรสุทธิ',                    color: 'bg-purple-400', sign: '' },
          { label: `− เงินสำรองร้าน (${reservePct}%)`, color: 'bg-pink-400',   sign: '' },
          { label: '= เงินเก็บส่วนตัว 💰',           color: 'bg-yellow-400', sign: '' },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-2 py-1.5 border-b border-white/10 last:border-0">
            <div className={`h-2 w-2 rounded-full ${r.color} shrink-0`} />
            <span className="text-sm text-gray-200">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
