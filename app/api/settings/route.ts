import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/services/settingsService'

export async function GET() {
  try {
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'โหลดการตั้งค่าไม่สำเร็จ' }, { status: 500 })
  }
}
