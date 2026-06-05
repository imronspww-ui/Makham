'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Delete, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const PIN_LENGTH = { min: 4, max: 6 }

export default function StaffLoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม'

  // Auto-submit เมื่อกรอกครบ 6 หลัก
  useEffect(() => {
    if (pin.length === PIN_LENGTH.max) {
      handleSubmit(pin)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  function pressKey(key: string) {
    if (loading) return
    if (key === 'del') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (pin.length >= PIN_LENGTH.max) return
    setPin((p) => p + key)
  }

  async function handleSubmit(currentPin: string) {
    if (currentPin.length < PIN_LENGTH.min) {
      toast.error(`PIN ต้องอย่างน้อย ${PIN_LENGTH.min} หลัก`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin }),
      })
      const json = await res.json()
      if (!res.ok) {
        setPin('')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        toast.error(json.error ?? 'PIN ไม่ถูกต้อง')
        return
      }
      toast.success('เข้าสู่ระบบสำเร็จ')
      router.push('/admin/orders')
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-4">
      <div className="w-full max-w-xs flex flex-col items-center gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg">
            <Store size={28} />
          </div>
          <h1 className="text-xl font-bold text-white">เข้าสู่ระบบพนักงาน</h1>
          <p className="text-sm text-zinc-400">{storeName}</p>
        </div>

        {/* PIN dots */}
        <div className={`flex gap-3 transition-all ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? 'bg-orange-400 border-orange-400 scale-110'
                  : 'bg-transparent border-zinc-500'
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {keys.map((key, i) => {
            if (key === '') return <div key={i} />
            if (key === 'del') {
              return (
                <button
                  key={i}
                  onClick={() => pressKey('del')}
                  disabled={loading || pin.length === 0}
                  className="flex h-16 items-center justify-center rounded-2xl bg-zinc-700 text-zinc-200 text-xl font-medium active:scale-95 transition-all disabled:opacity-30"
                >
                  <Delete size={20} />
                </button>
              )
            }
            return (
              <button
                key={i}
                onClick={() => pressKey(key)}
                disabled={loading}
                className="flex h-16 items-center justify-center rounded-2xl bg-zinc-700 hover:bg-zinc-600 text-white text-2xl font-semibold active:scale-95 active:bg-zinc-500 transition-all disabled:opacity-50"
              >
                {key}
              </button>
            )
          })}
        </div>

        {/* Submit (สำหรับ PIN 4-5 หลักที่ต้องกด confirm เอง) */}
        {pin.length >= PIN_LENGTH.min && pin.length < PIN_LENGTH.max && (
          <button
            onClick={() => handleSubmit(pin)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-base transition-all disabled:opacity-60"
          >
            <ShieldCheck size={18} />
            {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน PIN'}
          </button>
        )}

        {/* Link ไป Admin login */}
        <a href="/admin/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          เข้าสู่ระบบผู้ดูแล →
        </a>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
