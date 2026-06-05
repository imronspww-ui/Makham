'use client'
import { useEffect, useState } from 'react'

export type SessionRole = 'admin' | 'staff' | null

export function useSessionRole(): { role: SessionRole; loading: boolean } {
  const [role, setRole] = useState<SessionRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setRole(d.role ?? null))
      .catch(() => setRole(null))
      .finally(() => setLoading(false))
  }, [])

  return { role, loading }
}
