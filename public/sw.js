/**
 * Service Worker — Admin Order Notification
 * ทำงาน background poll ทุก 20 วินาที แม้ไม่ได้เปิดหน้า admin
 */
'use strict'

const POLL_INTERVAL_MS = 20_000        // 20 วินาที
const STATE_CACHE      = 'sw-order-v1'
const STATE_KEY        = '/sw-order-state'

// ─── Install / Activate ──────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => startPolling())
  )
})

// ─── Persist state via CacheStorage (ยังจำได้แม้ SW ถูก restart) ─────────────

async function loadState() {
  try {
    const cache = await caches.open(STATE_CACHE)
    const res   = await cache.match(STATE_KEY)
    if (!res) return { ids: [], initialized: false }
    return await res.json()
  } catch { return { ids: [], initialized: false } }
}

async function saveState(ids, initialized) {
  try {
    const cache = await caches.open(STATE_CACHE)
    await cache.put(STATE_KEY, new Response(JSON.stringify({ ids: [...ids], initialized }), {
      headers: { 'Content-Type': 'application/json' },
    }))
  } catch { /* ignore */ }
}

// ─── Polling ──────────────────────────────────────────────────────────────────

let _polling = false

function startPolling() {
  if (_polling) return
  _polling = true
  poll()                                // เริ่มทันที
  setInterval(poll, POLL_INTERVAL_MS)  // แล้ว repeat
}

async function poll() {
  try {
    const res = await fetch('/api/orders', { credentials: 'same-origin' })
    if (!res.ok) return

    const orders      = await res.json()
    const { ids: savedIds, initialized } = await loadState()
    const knownIds    = new Set(savedIds)

    if (!initialized) {
      // First run — บันทึก ID ทั้งหมดที่มีอยู่ ไม่แจ้งซ้ำ
      orders.forEach((o) => knownIds.add(o.id))
      await saveState(knownIds, true)
      return
    }

    // หาออเดอร์ใหม่ที่ยัง pending
    const freshPending = orders.filter(
      (o) => o.status === 'pending' && !knownIds.has(o.id)
    )

    // บันทึก ID ทั้งหมด (ทุก status) ไม่แจ้งซ้ำ
    orders.forEach((o) => knownIds.add(o.id))
    await saveState(knownIds, true)

    if (freshPending.length === 0) return

    // แสดง native notification สำหรับแต่ละออเดอร์ใหม่
    for (const order of freshPending) {
      const name  = order.customer?.name  || 'ลูกค้า'
      const total = (order.total ?? 0).toLocaleString('th-TH')
      const type  = order.orderType === 'delivery' ? '🚗 Delivery' : '🛍️ Pickup'

      await self.registration.showNotification(`📦 ออเดอร์ใหม่! #${order.orderNumber}`, {
        body:             `${name} · ฿${total} · ${type}`,
        icon:             '/favicon.ico',
        badge:            '/favicon.ico',
        tag:              `order-${order.id}`,     // แทนที่ notification เก่าของออเดอร์เดียวกัน
        requireInteraction: true,                  // ค้างจนกว่าจะปิด (desktop)
        data:             { url: '/admin/orders', orderId: order.id },
      })
    }
  } catch {
    /* network error — ลองใหม่รอบหน้า */
  }
}

// ─── Notification click → focus admin tab ────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/admin/orders'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // หา tab admin ที่เปิดอยู่
        const adminTab = clients.find((c) => c.url.includes('/admin'))
        if (adminTab && 'focus' in adminTab) {
          return adminTab.focus()
        }
        // ถ้าไม่มี → เปิด tab ใหม่
        return self.clients.openWindow(targetUrl)
      })
  )
})

// ─── Message จาก page (reset state เมื่อ login/logout) ──────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'RESET_STATE') {
    // logout หรือ admin สั่ง reset → ล้าง state เพื่อ re-initialize ครั้งถัดไป
    caches.open(STATE_CACHE).then((c) => c.delete(STATE_KEY)).catch(() => {})
  }
})
