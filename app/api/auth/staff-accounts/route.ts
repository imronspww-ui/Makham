import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, hashStaffPin } from '@/lib/auth'
import { getActiveStaffAccountsPublic, getStaffAccounts, createStaffAccount } from '@/lib/services/staffService'

/** GET — list active accounts (no pinHash) — public, used by staff-login page */
export async function GET(request: NextRequest) {
  const isAdmin = !(await requireAdmin(request))
  if (isAdmin) {
    // admin gets full list including inactive
    const accounts = await getStaffAccounts()
    return NextResponse.json(accounts.map(({ pinHash: _, ...rest }) => rest))
  }
  // public: active only, no pinHash
  const accounts = await getActiveStaffAccountsPublic()
  return NextResponse.json(accounts)
}

/** POST — create staff account (admin only) */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { name, pin, sortOrder } = await request.json() as {
      name?: string; pin?: string; sortOrder?: number
    }

    if (!name?.trim()) return NextResponse.json({ error: 'ต้องระบุชื่อ' }, { status: 400 })
    if (!pin || !/^\d{4,6}$/.test(pin))
      return NextResponse.json({ error: 'PIN ต้องเป็นตัวเลข 4-6 หลัก' }, { status: 400 })

    const pinHash = await hashStaffPin(pin)
    const id = await createStaffAccount({
      name: name.trim(),
      pinHash,
      sortOrder: sortOrder ?? 0,
    })
    return NextResponse.json({ id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'สร้างบัญชีไม่สำเร็จ' }, { status: 500 })
  }
}
