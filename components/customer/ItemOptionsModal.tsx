'use client'
import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import type { MenuItem, SelectedOption } from '@/types'

interface Props {
  item: MenuItem
  onClose: () => void
  onAdd: (selectedOptions: SelectedOption[], itemNote: string, qty: number) => void
  /** Pre-filled selections for edit mode (groupId → choiceId[]) */
  initialSelections?: Record<string, string[]>
  /** Pre-filled note for edit mode */
  initialNote?: string
  /** When true: hides qty selector and changes button label to "บันทึกตัวเลือก" */
  isEdit?: boolean
}

export function ItemOptionsModal({ item, onClose, onAdd, initialSelections = {}, initialNote = '', isEdit = false }: Props) {
  // { [groupId]: choiceId[] }
  const [selections, setSelections] = useState<Record<string, string[]>>(initialSelections)
  const [itemNote, setItemNote] = useState(initialNote)
  const [qty, setQty] = useState(1)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  function toggleChoice(groupId: string, choiceId: string, multiSelect: boolean) {
    setSelections((prev) => {
      const current = prev[groupId] ?? []
      if (multiSelect) {
        return {
          ...prev,
          [groupId]: current.includes(choiceId)
            ? current.filter((id) => id !== choiceId)
            : [...current, choiceId],
        }
      } else {
        return { ...prev, [groupId]: current[0] === choiceId ? [] : [choiceId] }
      }
    })
    // Clear error for this group when user makes a selection
    setErrors((prev) => ({ ...prev, [groupId]: false }))
  }

  function handleAdd() {
    // Validate required groups
    const newErrors: Record<string, boolean> = {}
    let hasError = false
    for (const group of item.optionGroups ?? []) {
      if (group.required && !(selections[group.id]?.length > 0)) {
        newErrors[group.id] = true
        hasError = true
      }
    }
    if (hasError) {
      setErrors(newErrors)
      return
    }

    // Build SelectedOption array
    const selected: SelectedOption[] = []
    for (const group of item.optionGroups ?? []) {
      for (const choiceId of selections[group.id] ?? []) {
        const choice = group.choices.find((c) => c.id === choiceId)
        if (choice) {
          selected.push({
            groupId: group.id,
            groupName: group.name,
            choiceId: choice.id,
            choiceName: choice.name,
            extraPrice: choice.extraPrice,
          })
        }
      }
    }
    onAdd(selected, itemNote, qty)
  }

  // Calculate extra price
  const extraTotal = Object.entries(selections).reduce((sum, [groupId, choiceIds]) => {
    const group = (item.optionGroups ?? []).find((g) => g.id === groupId)
    if (!group) return sum
    return sum + choiceIds.reduce((s, cid) => {
      const ch = group.choices.find((c) => c.id === cid)
      return s + (ch?.extraPrice ?? 0)
    }, 0)
  }, 0)
  const unitPrice = item.price + extraTotal
  const totalPrice = unitPrice * qty

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">{item.name}</h2>
            <p className="text-sm text-orange-500 font-semibold">{formatCurrency(item.price)}</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable options */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {(item.optionGroups ?? []).map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-700 text-sm">{group.name}</h3>
                {group.required && (
                  <span className="text-xs bg-red-50 text-red-500 border border-red-100 rounded-full px-2 py-0.5">จำเป็น</span>
                )}
                {group.multiSelect && (
                  <span className="text-xs bg-blue-50 text-blue-500 border border-blue-100 rounded-full px-2 py-0.5">เลือกได้หลาย</span>
                )}
              </div>
              {errors[group.id] && (
                <p className="text-xs text-red-500 mb-2">กรุณาเลือก{group.name}</p>
              )}
              <div className="flex flex-col gap-1.5">
                {group.choices.map((choice) => {
                  const isSelected = (selections[group.id] ?? []).includes(choice.id)
                  const soldOut = choice.isSoldOut === true
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => !soldOut && toggleChoice(group.id, choice.id, group.multiSelect)}
                      disabled={soldOut}
                      className={[
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm text-left transition-all',
                        soldOut
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                          : isSelected
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 text-gray-600 hover:border-orange-200',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2">
                        <div className={[
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          soldOut ? 'border-gray-200 bg-gray-100'
                            : isSelected ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-300',
                        ].join(' ')}>
                          {isSelected && !soldOut && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={soldOut ? 'line-through text-gray-300' : ''}>{choice.name}</span>
                        {soldOut && (
                          <span className="text-[10px] font-semibold text-red-400 bg-red-50 border border-red-100 rounded-full px-1.5 py-0.5">หมด</span>
                        )}
                      </div>
                      {choice.extraPrice > 0 && !soldOut && (
                        <span className="text-xs text-orange-500 font-medium">+{formatCurrency(choice.extraPrice)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Per-item note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">หมายเหตุ (ไม่บังคับ)</label>
            <textarea
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              rows={2}
              placeholder="เช่น ไม่ใส่ผัก, ไม่ใส่น้ำแข็ง"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex flex-col gap-3">
          {/* Qty selector — hidden in edit mode */}
          {!isEdit && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">จำนวน</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold text-gray-800">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          <Button fullWidth size="lg" onClick={handleAdd}>
            {isEdit ? `บันทึกตัวเลือก` : `เพิ่มลงตะกร้า ${formatCurrency(totalPrice)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
