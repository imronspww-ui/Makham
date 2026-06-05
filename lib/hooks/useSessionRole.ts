'use client'
import { useEffect, useState } from 'react'

export type SessionRole = 'admin' | 'staff' | null

function readHintCookie(): SessionRole {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)_role=([^;]*)/)
  const val = match?.[1]
  if (val === 'admin' || val === 'staff') return val
  return null
}

export function useSessionRole(): { role: SessionRole; loading: boolean } {
  // อ่าน hint cookie ทันทีเพื่อไม่ให้ sidebar กระพริบ
  const [role, setRole] = useState<SessionRole>(readHintCookie)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ยืนยันกับ server ใน background (hint cookie อาจ stale หรือถูกแก้)
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const verified: SessionRole = d.role === 'admin' || d.role === 'staff' ? d.role : null
        setRole(verified)
      })
      .catch(() => {
        // ถ้า network fail ให้เชื่อ hint cookie ต่อไป
      })
      .finally(() => setLoading(false))
  }, [])

  return { role, loading }
}
