'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Store, Lock } from 'lucide-react'
import { loginSchema, type LoginFormData } from '@/lib/utils/validation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'เข้าสู่ระบบไม่สำเร็จ')
        return
      }
      toast.success('เข้าสู่ระบบสำเร็จ')
      router.push('/admin/dashboard')
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg">
            <Store size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-sm text-gray-500">{process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม'}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Lock size={16} />
            <span className="text-sm font-medium">เข้าสู่ระบบ</span>
          </div>
          <Input
            label="อีเมล"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="admin@restaurant.com"
          />
          <Input
            label="รหัสผ่าน"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="••••••••"
          />
          <Button type="submit" fullWidth loading={loading} className="mt-2">
            เข้าสู่ระบบ
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          ค่าเริ่มต้น: ADMIN_EMAIL และ ADMIN_PASSWORD ใน .env.local
        </p>
      </div>
    </div>
  )
}
