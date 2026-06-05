'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Delete, UserCircle, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import type { StaffAccountPublic } from '@/types'

const PIN_MAX = 6
const PIN_MIN = 4

export default function StaffLoginPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<StaffAccountPublic[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [selected, setSelected] = useState<StaffAccountPublic | null>(null)
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [shake, setShake] = useState(false)
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม'

  useEffect(() => {
    fetch('/api/auth/staff-accounts')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setAccounts(data) : [])
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false))
  }, [])

  // Auto-submit at PIN_MAX digits
  useEffect(() => {
    if (pin.length === PIN_MAX && selected) handleSubmit(pin)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  function pressKey(key: string) {
    if (submitting) return
    if (key === 'del') { setPin((p) => p.slice(0, -1)); return }
    if (pin.length >= PIN_MAX) return
    setPin((p) => p + key)
  }

  async function handleSubmit(currentPin: string) {
    if (!selected) return
    if (currentPin.length < PIN_MIN) { toast.error(`PIN อย่างน้อย ${PIN_MIN} หลัก`); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selected.id, pin: currentPin }),
      })
      const json = await res.json()
      if (!res.ok) {
        setPin('')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        toast.error(json.error ?? 'PIN ไม่ถูกต้อง')
        return
      }
      toast.success(`ยินดีต้อนรับ ${json.name ?? selected.name}!`)
      router.push('/admin/orders')
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setPin('')
    } finally {
      setSubmitting(false)
    }
  }

  const numKeys = ['1','2','3','4','5','6','7','8','9','','0','del']

  // ── Account picker ──────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 px-4 gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg">
            <Store size={28} />
          </div>
          <h1 className="text-xl font-bold text-white">เลือกพนักงาน</h1>
          <p className="text-sm text-zinc-400">{storeName}</p>
        </div>

        {loadingAccounts ? (
          <div className="flex gap-3">
            {[1,2,3].map((i) => (
              <div key={i} className="h-24 w-24 rounded-2xl bg-zinc-700 animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center text-zinc-400 text-sm">
            <p>ยังไม่มีบัญชีพนักงาน</p>
            <p className="text-xs mt-1 text-zinc-500">ให้ Admin ตั้งค่าใน Settings → พนักงาน</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3 max-w-sm">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => { setSelected(acc); setPin('') }}
                className="flex flex-col items-center gap-2 w-24 py-4 rounded-2xl bg-zinc-700 hover:bg-zinc-600 active:scale-95 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                  <UserCircle size={28} />
                </div>
                <span className="text-sm font-medium text-white truncate w-full text-center px-1">
                  {acc.name}
                </span>
              </button>
            ))}
          </div>
        )}

        <a href="/admin/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          เข้าสู่ระบบผู้ดูแล →
        </a>
      </div>
    )
  }

  // ── PIN pad ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 px-4 gap-6">
      {/* Back button */}
      <button
        onClick={() => { setSelected(null); setPin('') }}
        className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors self-start absolute top-6 left-6"
      >
        <ChevronLeft size={18} />
        <span className="text-sm">เปลี่ยนพนักงาน</span>
      </button>

      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
          <UserCircle size={36} />
        </div>
        <h1 className="text-xl font-bold text-white">{selected.name}</h1>
        <p className="text-sm text-zinc-400">กรอก PIN เพื่อเข้าสู่ระบบ</p>
      </div>

      {/* PIN dots */}
      <div className={`flex gap-3 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
        {Array.from({ length: PIN_MAX }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
              i < pin.length ? 'bg-orange-400 border-orange-400 scale-110' : 'bg-transparent border-zinc-500'
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {numKeys.map((key, i) => {
          if (key === '') return <div key={i} />
          if (key === 'del') return (
            <button
              key={i}
              onClick={() => pressKey('del')}
              disabled={submitting || pin.length === 0}
              className="flex h-16 items-center justify-center rounded-2xl bg-zinc-700 text-zinc-200 active:scale-95 transition-all disabled:opacity-30"
            >
              <Delete size={20} />
            </button>
          )
          return (
            <button
              key={i}
              onClick={() => pressKey(key)}
              disabled={submitting}
              className="flex h-16 items-center justify-center rounded-2xl bg-zinc-700 hover:bg-zinc-600 text-white text-2xl font-semibold active:scale-95 active:bg-zinc-500 transition-all disabled:opacity-50"
            >
              {key}
            </button>
          )
        })}
      </div>


      <style jsx global>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  )
}
