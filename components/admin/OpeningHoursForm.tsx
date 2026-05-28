'use client'
import { useState } from 'react'
import { Clock, Power, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { updateOpeningHoursSettings } from '@/lib/services/settingsService'
import { computeIsOpen } from '@/lib/hooks/useStoreHours'
import type { Settings, OpeningHoursSettings, DaySchedule } from '@/types'

const DAY_LABELS: Record<string, string> = {
  '1': 'จันทร์', '2': 'อังคาร', '3': 'พุธ',
  '4': 'พฤหัสฯ', '5': 'ศุกร์', '6': 'เสาร์', '0': 'อาทิตย์',
}
const DAY_ORDER = ['1', '2', '3', '4', '5', '6', '0']

const DEFAULT_DAY: DaySchedule = { isOff: false, open: '09:00', close: '21:00' }

function buildDefaultHours(): OpeningHoursSettings {
  const schedule: Record<string, DaySchedule> = {}
  DAY_ORDER.forEach((d) => { schedule[d] = { ...DEFAULT_DAY } })
  return { enabled: false, manualOverride: 'auto', schedule }
}

function mergeHours(existing?: OpeningHoursSettings): OpeningHoursSettings {
  const base = buildDefaultHours()
  if (!existing) return base
  const schedule: Record<string, DaySchedule> = {}
  DAY_ORDER.forEach((d) => {
    schedule[d] = existing.schedule?.[d] ?? { ...DEFAULT_DAY }
  })
  return { ...base, ...existing, schedule }
}

interface Props { settings: Settings }

export function OpeningHoursForm({ settings }: Props) {
  const [hours, setHours] = useState<OpeningHoursSettings>(() => mergeHours(settings.openingHours))
  const [saving, setSaving] = useState(false)

  const isOpen = computeIsOpen({ ...settings, openingHours: hours })

  function setOverride(v: OpeningHoursSettings['manualOverride']) {
    setHours((h) => ({ ...h, manualOverride: v, enabled: true }))
  }

  function toggleEnabled(v: boolean) {
    setHours((h) => ({ ...h, enabled: v }))
  }

  function updateDay(day: string, patch: Partial<DaySchedule>) {
    setHours((h) => ({
      ...h,
      schedule: { ...h.schedule, [day]: { ...h.schedule[day], ...patch } },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateOpeningHoursSettings(hours)
      toast.success('บันทึกเวลาเปิด-ปิดสำเร็จ')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── สถานะปัจจุบัน ── */}
      <div className={[
        'flex items-center justify-between rounded-xl px-4 py-3 border',
        isOpen ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
      ].join(' ')}>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className={`text-sm font-semibold ${isOpen ? 'text-green-700' : 'text-red-700'}`}>
            {isOpen ? 'ร้านเปิดให้บริการอยู่' : 'ร้านปิดให้บริการ'}
          </span>
        </div>
        <span className="text-xs text-gray-400">สถานะที่ลูกค้าเห็น</span>
      </div>

      {/* ── สวิตช์หลัก: เปิด/ปิดระบบเวลา ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">เปิดใช้ระบบควบคุมเวลา</p>
          <p className="text-xs text-gray-400">ปิด = เปิดร้านตลอด 24 ชั่วโมง</p>
        </div>
        <button
          type="button"
          onClick={() => toggleEnabled(!hours.enabled)}
          className={[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            hours.enabled ? 'bg-orange-500' : 'bg-gray-300',
          ].join(' ')}
        >
          <span className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            hours.enabled ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')} />
        </button>
      </div>

      {hours.enabled && (
        <>
          {/* ── Manual override buttons ── */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ควบคุมด่วน</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'open'   as const, label: '🟢 เปิดร้านทันที',   cls: 'border-green-300 bg-green-50 text-green-700' },
                { value: 'closed' as const, label: '🔴 ปิดร้านทันที',   cls: 'border-red-300 bg-red-50 text-red-700'       },
                { value: 'auto'   as const, label: '📅 ตามตาราง',       cls: 'border-blue-300 bg-blue-50 text-blue-700'    },
              ].map(({ value, label, cls }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOverride(value)}
                  className={[
                    'rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all',
                    hours.manualOverride === value
                      ? cls + ' shadow-sm'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── ตารางเวลารายวัน (ใช้เมื่อ auto) ── */}
          {hours.manualOverride === 'auto' && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <CalendarDays size={13} />
                ตารางเวลารายสัปดาห์
              </p>
              <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {DAY_ORDER.map((day) => {
                  const s = hours.schedule[day]
                  return (
                    <div key={day} className={[
                      'flex items-center gap-3 px-4 py-2.5',
                      s.isOff ? 'bg-gray-50 opacity-60' : 'bg-white',
                    ].join(' ')}>
                      {/* วันในสัปดาห์ */}
                      <span className="w-16 text-sm font-medium text-gray-700 shrink-0">
                        {DAY_LABELS[day]}
                      </span>

                      {/* toggle หยุด */}
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={s.isOff}
                          onChange={(e) => updateDay(day, { isOff: e.target.checked })}
                          className="rounded accent-red-500"
                        />
                        หยุด
                      </label>

                      {/* เวลาเปิด-ปิด */}
                      {!s.isOff && (
                        <div className="flex items-center gap-2 ml-auto">
                          <Clock size={12} className="text-gray-400" />
                          <input
                            type="time"
                            value={s.open}
                            onChange={(e) => updateDay(day, { open: e.target.value })}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-orange-400"
                          />
                          <span className="text-xs text-gray-400">–</span>
                          <input
                            type="time"
                            value={s.close}
                            onChange={(e) => updateDay(day, { close: e.target.value })}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-orange-400"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <Button onClick={handleSave} loading={saving} className="self-start">
        <Power size={14} />
        บันทึกการตั้งค่า
      </Button>
    </div>
  )
}
