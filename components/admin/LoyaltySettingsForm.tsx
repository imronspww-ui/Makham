'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Star, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMenuItems } from '@/lib/services/menuService'
import { updateLoyaltySettings } from '@/lib/services/settingsService'
import type { Settings, LoyaltySettings, RedeemableItem, MenuItem } from '@/types'

interface Props {
  settings: Settings
  onSaved: () => void
}

const DEFAULT_LOYALTY: LoyaltySettings = {
  enabled: false,
  pointsPer100Baht: 5,
  expiryMonths: 3,
  redeemableItems: [],
}

export function LoyaltySettingsForm({ settings, onSaved }: Props) {
  const loyalty = settings.loyalty ?? DEFAULT_LOYALTY

  const [enabled,          setEnabled]          = useState(loyalty.enabled)
  const [pointsPer100Baht, setPointsPer100Baht] = useState(loyalty.pointsPer100Baht)
  const [expiryMonths,     setExpiryMonths]     = useState(loyalty.expiryMonths)
  const [redeemableItems,  setRedeemableItems]  = useState<RedeemableItem[]>(loyalty.redeemableItems)
  const [menuItems,        setMenuItems]        = useState<MenuItem[]>([])
  const [saving,           setSaving]           = useState(false)

  // สำหรับเพิ่มแถวใหม่
  const [newMenuItemId, setNewMenuItemId] = useState('')
  const [newPointsCost, setNewPointsCost] = useState(20)

  // sync กับ settings ที่เปลี่ยน real-time
  useEffect(() => {
    const l = settings.loyalty ?? DEFAULT_LOYALTY
    setEnabled(l.enabled)
    setPointsPer100Baht(l.pointsPer100Baht)
    setExpiryMonths(l.expiryMonths)
    setRedeemableItems(l.redeemableItems)
  }, [settings])

  // โหลดเมนูทั้งหมดเพื่อให้เลือก redeemable items
  useEffect(() => {
    getMenuItems().then(setMenuItems).catch(() => {})
  }, [])

  const availableToAdd = menuItems.filter(
    (m) => m.isAvailable && !redeemableItems.some((r) => r.menuItemId === m.id),
  )

  function addRedeemable() {
    if (!newMenuItemId) { toast.error('เลือกเมนูก่อน'); return }
    const menuItem = menuItems.find((m) => m.id === newMenuItemId)
    if (!menuItem) return
    if (newPointsCost < 1) { toast.error('กรอกจำนวนแต้มให้ถูกต้อง'); return }
    setRedeemableItems((prev) => [
      ...prev,
      { menuItemId: newMenuItemId, menuItemName: menuItem.name, pointsCost: newPointsCost },
    ])
    setNewMenuItemId('')
    setNewPointsCost(20)
  }

  function removeRedeemable(menuItemId: string) {
    setRedeemableItems((prev) => prev.filter((r) => r.menuItemId !== menuItemId))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateLoyaltySettings({
        enabled,
        pointsPer100Baht: Number(pointsPer100Baht) || 5,
        expiryMonths:     Number(expiryMonths)     || 3,
        redeemableItems,
      })
      toast.success('บันทึกการตั้งค่าแต้มสะสมแล้ว ✅')
      onSaved()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">เปิดใช้ระบบสะสมแต้ม</p>
          <p className="text-xs text-gray-400 mt-0.5">ลูกค้ากรอกเบอร์โทรตอนสั่ง → สะสมและแลกแต้มได้</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            enabled ? 'bg-amber-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* อัตราสะสม */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                แต้มต่อทุก 100 บาท
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={pointsPer100Baht}
                onChange={(e) => setPointsPer100Baht(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-xs text-gray-400 mt-1">ซื้อ 100 บาท = {pointsPer100Baht} แต้ม</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                วันหมดอายุ (เดือน)
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={expiryMonths}
                onChange={(e) => setExpiryMonths(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-xs text-gray-400 mt-1">นับจากออเดอร์ล่าสุด</p>
            </div>
          </div>

          {/* Redeemable items */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">เมนูที่แลกแต้มได้</p>

            {redeemableItems.length > 0 ? (
              <div className="flex flex-col gap-2 mb-3">
                {redeemableItems.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Star size={13} className="text-amber-500" />
                      <span className="text-sm text-gray-700">{item.menuItemName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-amber-600">{item.pointsCost} แต้ม</span>
                      <button
                        type="button"
                        onClick={() => removeRedeemable(item.menuItemId)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-3">ยังไม่มีเมนูที่แลกแต้มได้ — เพิ่มด้านล่าง</p>
            )}

            {/* Add new redeemable row */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">เลือกเมนู</label>
                <select
                  value={newMenuItemId}
                  onChange={(e) => setNewMenuItemId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">-- เลือกเมนู --</option>
                  {availableToAdd.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-500 mb-1">จำนวนแต้ม</label>
                <input
                  type="number"
                  min={1}
                  value={newPointsCost}
                  onChange={(e) => setNewPointsCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                type="button"
                onClick={addRedeemable}
                disabled={!newMenuItemId}
                className="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-40 transition-colors"
              >
                <Plus size={14} />
                เพิ่ม
              </button>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
        บันทึก
      </button>
    </div>
  )
}
