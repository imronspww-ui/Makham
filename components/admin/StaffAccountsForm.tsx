'use client'
import { useState, useEffect } from 'react'
import { UserPlus, Trash2, KeyRound, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { StaffAccountPublic } from '@/types'

export function StaffAccountsForm() {
  const [accounts, setAccounts]     = useState<StaffAccountPublic[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [changePinId, setChangePinId] = useState<string | null>(null)

  // Add form state
  const [newName, setNewName]       = useState('')
  const [newPin, setNewPin]         = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [showPin, setShowPin]       = useState(false)
  const [saving, setSaving]         = useState(false)

  // Change PIN state
  const [cpPin, setCpPin]           = useState('')
  const [cpConfirm, setCpConfirm]   = useState('')
  const [cpSaving, setCpSaving]     = useState(false)

  async function loadAccounts() {
    try {
      const res = await fetch('/api/auth/staff-accounts')
      const data = await res.json()
      setAccounts(Array.isArray(data) ? data : [])
    } catch {
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAccounts() }, [])

  async function handleAdd() {
    if (!newName.trim()) return toast.error('กรุณากรอกชื่อ')
    if (!/^\d{4,6}$/.test(newPin)) return toast.error('PIN ต้องเป็นตัวเลข 4-6 หลัก')
    if (newPin !== newPinConfirm) return toast.error('PIN ไม่ตรงกัน')
    setSaving(true)
    try {
      const res = await fetch('/api/auth/staff-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), pin: newPin, sortOrder: accounts.length }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`เพิ่ม "${newName}" สำเร็จ`)
      setNewName(''); setNewPin(''); setNewPinConfirm(''); setShowAdd(false)
      loadAccounts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เพิ่มไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await fetch(`/api/auth/staff-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      loadAccounts()
    } catch {
      toast.error('แก้ไขไม่สำเร็จ')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ยืนยันลบบัญชี "${name}"?`)) return
    try {
      await fetch(`/api/auth/staff-accounts/${id}`, { method: 'DELETE' })
      toast.success('ลบแล้ว')
      loadAccounts()
    } catch {
      toast.error('ลบไม่สำเร็จ')
    }
  }

  async function handleChangePin(id: string) {
    if (!/^\d{4,6}$/.test(cpPin)) return toast.error('PIN ต้องเป็นตัวเลข 4-6 หลัก')
    if (cpPin !== cpConfirm) return toast.error('PIN ไม่ตรงกัน')
    setCpSaving(true)
    try {
      const res = await fetch(`/api/auth/staff-accounts/${id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cpPin }),
      })
      if (!res.ok) throw new Error()
      toast.success('เปลี่ยน PIN สำเร็จ')
      setChangePinId(null); setCpPin(''); setCpConfirm('')
    } catch {
      toast.error('เปลี่ยน PIN ไม่สำเร็จ')
    } finally {
      setCpSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-400">กำลังโหลด...</p>

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-400 leading-relaxed">
        แต่ละคนมี PIN ส่วนตัว — หน้า Login แสดงรายชื่อ เลือกแล้วกด PIN เพื่อเข้าใช้งาน
        ออเดอร์จาก POS จะบันทึก <strong>ขายโดย: ชื่อพนักงาน</strong> อัตโนมัติ
      </p>

      {/* Account list */}
      {accounts.length > 0 && (
        <div className="flex flex-col gap-2">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${acc.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                  {acc.name}
                </p>
                <p className="text-xs text-gray-400">{acc.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</p>
              </div>
              <div className="flex items-center gap-1">
                {/* Toggle active */}
                <button
                  onClick={() => handleToggle(acc.id, !acc.isActive)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                  title={acc.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                >
                  {acc.isActive
                    ? <ToggleRight size={18} className="text-green-500" />
                    : <ToggleLeft size={18} />
                  }
                </button>
                {/* Change PIN */}
                <button
                  onClick={() => { setChangePinId(acc.id); setCpPin(''); setCpConfirm('') }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                  title="เปลี่ยน PIN"
                >
                  <KeyRound size={15} />
                </button>
                {/* Delete */}
                <button
                  onClick={() => handleDelete(acc.id, acc.name)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-400"
                  title="ลบ"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {accounts.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีบัญชีพนักงาน</p>
      )}

      {/* Change PIN inline form */}
      {changePinId && (
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-violet-700">
            เปลี่ยน PIN — {accounts.find((a) => a.id === changePinId)?.name}
          </p>
          <div className="relative">
            <Input
              label="PIN ใหม่ (4-6 หลัก)"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={6}
              value={cpPin}
              onChange={(e) => setCpPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button type="button" onClick={() => setShowPin((s) => !s)}
              className="absolute right-3 top-9 text-gray-400">
              {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Input
            label="ยืนยัน PIN"
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={6}
            value={cpConfirm}
            onChange={(e) => setCpConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={cpConfirm && cpPin !== cpConfirm ? 'PIN ไม่ตรงกัน' : undefined}
          />
          <div className="flex gap-2">
            <Button onClick={() => handleChangePin(changePinId)} loading={cpSaving}
              disabled={cpPin.length < 4 || cpPin !== cpConfirm} className="flex-1">
              บันทึก PIN
            </Button>
            <Button variant="outline" onClick={() => setChangePinId(null)}>ยกเลิก</Button>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd ? (
        <div className="rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">เพิ่มพนักงานใหม่</p>
          <Input label="ชื่อพนักงาน" value={newName}
            onChange={(e) => setNewName(e.target.value)} placeholder="เช่น นิ่ม, หนิง" />
          <div className="relative">
            <Input label="PIN (4-6 หลัก)" type={showPin ? 'text' : 'password'}
              inputMode="numeric" maxLength={6}
              value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button type="button" onClick={() => setShowPin((s) => !s)}
              className="absolute right-3 top-9 text-gray-400">
              {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Input label="ยืนยัน PIN" type={showPin ? 'text' : 'password'}
            inputMode="numeric" maxLength={6}
            value={newPinConfirm} onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={newPinConfirm && newPin !== newPinConfirm ? 'PIN ไม่ตรงกัน' : undefined}
          />
          <div className="flex gap-2">
            <Button onClick={handleAdd} loading={saving}
              disabled={!newName.trim() || newPin.length < 4 || newPin !== newPinConfirm}
              className="flex-1">
              เพิ่มพนักงาน
            </Button>
            <Button variant="outline" onClick={() => { setShowAdd(false); setNewName(''); setNewPin(''); setNewPinConfirm('') }}>
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)} className="self-start gap-2">
          <UserPlus size={15} />
          เพิ่มพนักงาน
        </Button>
      )}

      {accounts.length > 0 && (
        <a href="/admin/staff-login" target="_blank"
          className="text-xs text-orange-500 hover:text-orange-600 underline underline-offset-2 self-start">
          ทดสอบหน้าเข้าสู่ระบบพนักงาน →
        </a>
      )}
    </div>
  )
}
