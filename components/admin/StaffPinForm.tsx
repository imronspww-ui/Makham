'use client'
import { useState, useEffect } from 'react'
import { KeyRound, Eye, EyeOff, Check, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function StaffPinForm() {
  const [pinSet, setPinSet]         = useState<boolean | null>(null)
  const [newPin, setNewPin]         = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPin, setShowPin]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    fetch('/api/auth/staff-pin')
      .then((r) => r.json())
      .then((d) => setPinSet(d.isSet))
      .catch(() => setPinSet(false))
  }, [])

  async function handleSave() {
    if (!/^\d{4,6}$/.test(newPin)) {
      toast.error('PIN ต้องเป็นตัวเลข 4-6 หลัก')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('PIN ไม่ตรงกัน')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/staff-pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      })
      if (!res.ok) throw new Error()
      toast.success('ตั้ง Staff PIN สำเร็จ')
      setPinSet(true)
      setNewPin('')
      setConfirmPin('')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('ยืนยันลบ Staff PIN? พนักงานจะไม่สามารถเข้าสู่ระบบได้')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/auth/staff-pin', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('ลบ Staff PIN สำเร็จ')
      setPinSet(false)
    } catch {
      toast.error('ลบไม่สำเร็จ')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${pinSet ? 'bg-green-100' : 'bg-zinc-100'}`}>
          {pinSet
            ? <Check size={12} className="text-green-600" />
            : <KeyRound size={12} className="text-zinc-400" />
          }
        </div>
        <p className="text-sm text-gray-600">
          {pinSet === null ? 'กำลังโหลด...' : pinSet ? 'ตั้ง PIN ไว้แล้ว — พนักงานสามารถเข้าสู่ระบบได้' : 'ยังไม่ได้ตั้ง PIN — พนักงานยังเข้าไม่ได้'}
        </p>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        พนักงานใช้ PIN นี้เข้าหน้า <strong>POS</strong> และ <strong>ออเดอร์</strong> เท่านั้น
        ไม่มีสิทธิ์จัดการเมนู, ตั้งค่า, หรือดูข้อมูลการเงิน
      </p>

      {/* PIN inputs */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Input
            label={pinSet ? 'เปลี่ยน PIN ใหม่ (4-6 หลัก)' : 'ตั้ง PIN ใหม่ (4-6 หลัก)'}
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="ตัวเลข 4-6 หลัก"
          />
          <button
            type="button"
            onClick={() => setShowPin((s) => !s)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          >
            {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <Input
          label="ยืนยัน PIN"
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="กรอก PIN อีกครั้ง"
          error={confirmPin && newPin !== confirmPin ? 'PIN ไม่ตรงกัน' : undefined}
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={newPin.length < 4 || newPin !== confirmPin}
          className="flex-1"
        >
          {pinSet ? 'เปลี่ยน PIN' : 'ตั้ง PIN พนักงาน'}
        </Button>

        {pinSet && (
          <Button
            variant="outline"
            onClick={handleDelete}
            loading={deleting}
            className="text-red-500 border-red-200 hover:bg-red-50"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      {/* Link ไปหน้า staff login */}
      {pinSet && (
        <a
          href="/admin/staff-login"
          target="_blank"
          className="text-xs text-orange-500 hover:text-orange-600 underline underline-offset-2 self-start"
        >
          ทดสอบหน้าเข้าสู่ระบบพนักงาน →
        </a>
      )}
    </div>
  )
}
