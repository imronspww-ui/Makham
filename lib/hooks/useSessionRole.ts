'use client'
import { useEffect, useState } from 'react'

export type SessionRole = 'admin' | 'staff' | null

interface SessionState {
  role: SessionRole
  staffName: string | null
  loading: boolean
}

function readHintCookies(): { role: SessionRole; staffName: string | null } {
  if (typeof document === 'undefined') return { role: null, staffName: null }
  const cookieStr = document.cookie
  const roleMatch = cookieStr.match(/(?:^|;\s*)_role=([^;]*)/)
  const nameMatch = cookieStr.match(/(?:^|;\s*)_staff_name=([^;]*)/)
  const role = roleMatch?.[1] === 'admin' || roleMatch?.[1] === 'staff' ? roleMatch[1] as SessionRole : null
  const staffName = nameMatch?.[1] ? decodeURIComponent(nameMatch[1]) : null
  return { role, staffName }
}

export function useSessionRole(): SessionState {
  const [state, setState] = useState<SessionState>(() => ({
    ...readHintCookies(),
    loading: true,
  }))

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const role: SessionRole = d.role === 'admin' || d.role === 'staff' ? d.role : null
        setState({ role, staffName: d.staffName ?? null, loading: false })
      })
      .catch(() => setState((s) => ({ ...s, loading: false })))
  }, [])

  return state
}
