'use client'
/**
 * ChoiceSoldOutModal — จัดการสถานะ "หมด" ระดับตัวเลือกย่อย (OptionChoice)
 * เช่น ยำวุ้นเส้น → กลุ่ม "โปรตีน" → ไก่ยอ หมด
 */
import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { toggleChoiceSoldOut } from '@/lib/services/menuService'
import type { MenuItem } from '@/types'

interface Props {
  item:    MenuItem
  onClose: () => void
  onDone:  () => void   // reload menu หลังเปลี่ยน
}

export function ChoiceSoldOutModal({ item, onClose, onDone }: Props) {
  const [loading, setLoading] = useState<string | null>(null)  // choiceId ที่กำลัง toggle

  const groups = item.optionGroups ?? []

  async function handleToggle(groupId: string, choiceId: string, currentSoldOut: boolean) {
    const key = `${groupId}-${choiceId}`
    setLoading(key)
    try {
      await toggleChoiceSoldOut(item.id, groupId, choiceId, !currentSoldOut)
      onDone()
      // อย่า close — ให้ admin toggle ได้ต่อเนื่อง
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">{item.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">กดเพื่อสลับสถานะ หมด / มีสินค้า</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Option groups */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
          {groups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">เมนูนี้ไม่มีตัวเลือกย่อย</p>
          ) : (
            groups.map((group) => (
              <div key={group.id}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {group.name}
                  {group.required && <span className="ml-1 text-red-400">*</span>}
                </p>
                <div className="flex flex-col gap-1.5">
                  {group.choices.map((choice) => {
                    const soldOut = choice.isSoldOut === true
                    const key     = `${group.id}-${choice.id}`
                    const busy    = loading === key
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => handleToggle(group.id, choice.id, soldOut)}
                        disabled={busy}
                        className={[
                          'flex items-center justify-between rounded-xl px-3 py-2.5 border-2 text-sm font-medium transition-all active:scale-95',
                          busy ? 'opacity-50 cursor-wait' : '',
                          soldOut
                            ? 'border-red-300 bg-red-50 text-red-600'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-2">
                          {/* Status dot */}
                          <div className={[
                            'h-2.5 w-2.5 rounded-full flex-shrink-0',
                            soldOut ? 'bg-red-400' : 'bg-green-400',
                          ].join(' ')} />
                          <span className={soldOut ? 'line-through text-red-400' : ''}>
                            {choice.name}
                          </span>
                          {choice.extraPrice > 0 && (
                            <span className="text-xs text-gray-400">(+{choice.extraPrice}฿)</span>
                          )}
                        </div>

                        {/* Badge */}
                        <span className={[
                          'text-xs font-bold rounded-full px-2.5 py-0.5',
                          soldOut
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-700',
                        ].join(' ')}>
                          {busy ? '...' : soldOut ? '🔴 หมด' : '✅ มี'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
