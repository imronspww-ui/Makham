'use client'
/**
 * StarRatingForm — กรอกดาวรีวิวหลังรับออเดอร์เสร็จ
 */
import { useState } from 'react'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { addReview } from '@/lib/services/reviewService'
import type { OrderItem } from '@/types'

interface Props {
  orderId:     string
  orderNumber: string
  items:       OrderItem[]
  onDone:      () => void
}

export function StarRatingForm({ orderId, orderNumber, items, onDone }: Props) {
  // rateableItems = ไม่ใช่เมนูแลกแต้ม
  const rateableItems = items.filter((i) => !i.isRedeemed)
  const [ratings,   setRatings]   = useState<Record<string, number>>({})
  const [comments,  setComments]  = useState<Record<string, string>>({})
  const [saving,    setSaving]    = useState(false)

  function setRating(menuItemId: string, stars: number) {
    setRatings((r) => ({ ...r, [menuItemId]: stars }))
  }

  async function handleSubmit() {
    const toReview = rateableItems.filter((i) => ratings[i.menuItemId])
    if (toReview.length === 0) { toast.error('กรุณาให้ดาวอย่างน้อย 1 เมนู'); return }
    setSaving(true)
    try {
      await Promise.all(
        toReview.map((i) =>
          addReview({
            menuItemId:   i.menuItemId,
            menuItemName: i.name,
            orderId,
            orderNumber,
            rating:       ratings[i.menuItemId],
            ...(comments[i.menuItemId]?.trim() ? { comment: comments[i.menuItemId].trim() } : {}),
          })
        )
      )
      toast.success('ขอบคุณสำหรับรีวิว! ⭐')
      onDone()
    } catch {
      toast.error('บันทึกรีวิวไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-yellow-100 p-4 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Star size={18} className="text-yellow-400 fill-yellow-400" />
        <h2 className="font-bold text-gray-800">รีวิวเมนูที่สั่ง</h2>
      </div>

      {rateableItems.map((item) => {
        const stars = ratings[item.menuItemId] ?? 0
        return (
          <div key={item.menuItemId} className="flex flex-col gap-2 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name}
                  className="h-10 w-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
              ) : null}
              <p className="text-sm font-medium text-gray-800 flex-1">{item.name}</p>
            </div>

            {/* Stars */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(item.menuItemId, n)}
                  className="transition-transform active:scale-110"
                >
                  <Star
                    size={28}
                    className={n <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
                  />
                </button>
              ))}
              {stars > 0 && (
                <span className="ml-2 text-sm text-gray-400 self-center">
                  {['', 'แย่มาก', 'พอได้', 'ดี', 'ดีมาก', 'ยอดเยี่ยม'][stars]}
                </span>
              )}
            </div>

            {/* Comment (optional) */}
            {stars > 0 && (
              <input
                type="text"
                placeholder="ความคิดเห็น (ไม่บังคับ)"
                value={comments[item.menuItemId] ?? ''}
                onChange={(e) => setComments((c) => ({ ...c, [item.menuItemId]: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs focus:border-orange-400 outline-none"
              />
            )}
          </div>
        )
      })}

      <div className="flex gap-2">
        <button onClick={onDone}
          className="flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50">
          ข้าม
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 rounded-xl bg-yellow-400 text-white py-2 text-sm font-bold hover:bg-yellow-500 disabled:opacity-60 transition-colors"
        >
          {saving ? 'กำลังบันทึก...' : '⭐ ส่งรีวิว'}
        </button>
      </div>
    </div>
  )
}

