import { NextResponse } from 'next/server'
import { clearStaffCookie } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  clearStaffCookie(response)
  return response
}
