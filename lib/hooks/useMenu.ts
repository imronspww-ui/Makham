'use client'
import { useState, useEffect, useCallback } from 'react'
import { getMenuItems } from '@/lib/services/menuService'
import { getCategories } from '@/lib/services/categoryService'
import type { MenuItem, Category } from '@/types'

export function useMenu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [menuData, catData] = await Promise.all([getMenuItems(), getCategories()])
      setItems(menuData)
      setCategories(catData.filter((c) => c.isActive))
    } catch {
      setError('ไม่สามารถโหลดเมนูได้')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { items, categories, loading, error, reload: load }
}

export function useAdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [menuData, catData] = await Promise.all([getMenuItems(), getCategories()])
      setItems(menuData)
      setCategories(catData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { items, categories, loading, reload: load }
}
