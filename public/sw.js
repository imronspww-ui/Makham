/**
 * Service Worker — Order Notifications (Admin + Customer)
 *
 * Admin   : poll /api/orders ทุก 20 วิ → แจ้งออเดอร์ใหม่ pending
 * Customer: poll /api/orders/[id] สำหรับออเดอร์ที่ติดตาม → แจ้งเมื่อสถานะเปลี่ยน
 */
'use strict'

const POLL_MS           = 20_000
const ADMIN_CACHE       = 'sw-admin-v1'
const ADMIN_STATE_KEY   = '/sw-admin-state'
const CUSTOMER_CACHE    = 'sw-customer-v1'
const CUSTOMER_STATE_KEY = '/sw-customer-state'

// ─── Install / Activate ──────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim().then(() => startPolling()))
})

// ─── CacheStorage helpers ─────────────────────────────────────────────────────

async function readCache(cacheName, key) {
  try {
    const cache = await caches.open(cacheName)
    const res   = await cache.match(key)
    if (!res) return null
    return await res.json()
  } catch { return null }
}

async function writeCache(cacheName, key, data) {
  try {
    const cache = await caches.open(cacheName)
    await cache.put(key, new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    }))
  } catch { /* ignore */ }
}

// ─── Polling loop ─────────────────────────────────────────────────────────────

let _polling = false

function startPolling() {
  if (_polling) return
  _polling = true
  runAll()
  setInterval(runAll, POLL_MS)
}

async function runAll() {
  await Promise.allSettled([pollAdmin(), pollCustomerOrders()])
}

// ══════════════════════════════════════════════════════════
// ADMIN — แจ้งเตือนออเดอร์ใหม่
// ══════════════════════════════════════════════════════════

async function pollAdmin() {
  try {
    const res = await fetch('/api/orders', { credentials: 'same-origin' })
    if (!res.ok) return
    const orders = await res.json()

    const state      = await readCache(ADMIN_CACHE, ADMIN_STATE_KEY) ?? { ids: [], initialized: false }
    const knownIds   = new Set(state.ids)

    if (!state.initialized) {
      orders.forEach((o) => knownIds.add(o.id))
      await writeCache(ADMIN_CACHE, ADMIN_STATE_KEY, { ids: [...knownIds], initialized: true })
      return
    }

    const freshPending = orders.filter((o) => o.status === 'pending' && !knownIds.has(o.id))
    orders.forEach((o) => knownIds.add(o.id))
    await writeCache(ADMIN_CACHE, ADMIN_STATE_KEY, { ids: [...knownIds], initialized: true })

    for (const order of freshPending) {
      const name  = order.customer?.name || 'ลูกค้า'
      const total = (order.total ?? 0).toLocaleString('th-TH')
      const type  = order.orderType === 'delivery' ? '🚗 Delivery' : '🛍️ Pickup'
      await self.registration.showNotification(`📦 ออเดอร์ใหม่! #${order.orderNumber}`, {
        body:             `${name} · ฿${total} · ${type}`,
        icon:             '/favicon.ico',
        badge:            '/favicon.ico',
        tag:              `admin-order-${order.id}`,
        requireInteraction: true,
        data:             { type: 'admin', url: '/admin/orders' },
      })
    }
  } catch { /* network error — retry next cycle */ }
}

// ══════════════════════════════════════════════════════════
// CUSTOMER — แจ้งเตือนสถานะออเดอร์ของลูกค้า
// ══════════════════════════════════════════════════════════

const CUSTOMER_STATUS_MESSAGES = {
  cooking:    { title: 'กำลังทำอาหาร! 👨‍🍳', body: 'ร้านรับออเดอร์และกำลังทำอาหารให้คุณแล้ว' },
  delivering: { title: 'กำลังจัดส่ง! 🛵',   body: 'อาหารของคุณกำลังเดินทางมาแล้ว' },
  completed:  { title: 'พร้อมแล้ว! ✅',      body: 'อาหารของคุณเสร็จแล้ว มารับได้เลย' },
  cancelled:  { title: 'ออเดอร์ถูกยกเลิก ❌', body: 'ออเดอร์ของคุณถูกยกเลิก กรุณาติดต่อร้าน' },
}

const TERMINAL_STATUSES = new Set(['completed', 'cancelled'])
const MAX_TRACK_MS      = 24 * 60 * 60 * 1000  // 24 ชั่วโมง

async function pollCustomerOrders() {
  const state = await readCache(CUSTOMER_CACHE, CUSTOMER_STATE_KEY)
  if (!state?.orders || Object.keys(state.orders).length === 0) return

  const now     = Date.now()
  const updated = { ...state.orders }
  let   dirty   = false

  for (const [orderId, info] of Object.entries(state.orders)) {
    // หมดอายุแล้ว หรือสถานะ terminal → หยุด track
    if (now - info.trackedAt > MAX_TRACK_MS || TERMINAL_STATUSES.has(info.lastStatus)) {
      delete updated[orderId]
      dirty = true
      continue
    }

    try {
      const res = await fetch(`/api/orders/${orderId}`, { credentials: 'same-origin' })
      if (!res.ok) continue
      const order = await res.json()

      if (order.status !== info.lastStatus) {
        // สถานะเปลี่ยน → แจ้งเตือน (ถ้าลูกค้าไม่ได้อยู่หน้า order อยู่แล้ว)
        const msg = CUSTOMER_STATUS_MESSAGES[order.status]
        if (msg) {
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          const onOrderPage = clients.some((c) => c.url.includes(`/order/${orderId}`))

          if (!onOrderPage) {
            await self.registration.showNotification(`${msg.title}`, {
              body:             `ออเดอร์ #${info.orderNumber} · ${msg.body}`,
              icon:             '/favicon.ico',
              badge:            '/favicon.ico',
              tag:              `customer-order-${orderId}`,
              requireInteraction: order.status !== 'completed',
              data:             { type: 'customer', url: `/order/${orderId}`, orderId },
            })
          } else {
            // ลูกค้าอยู่ในหน้า order แล้ว → ส่ง message ให้หน้าจัดการเอง (hook จะทำงาน)
            for (const client of clients) {
              if (client.url.includes(`/order/${orderId}`)) {
                client.postMessage({ type: 'ORDER_STATUS_CHANGED', orderId, newStatus: order.status })
              }
            }
          }
        }

        updated[orderId] = { ...info, lastStatus: order.status }
        dirty = true

        // หยุด track หลังสถานะ terminal
        if (TERMINAL_STATUSES.has(order.status)) {
          // ยังเก็บ entry ไว้ รอรอบหน้าจะลบทิ้ง (เพื่อให้ notification แสดงก่อน)
          updated[orderId].trackedAt = 0  // force expire next cycle
        }
      }
    } catch { /* ignore — network error */ }
  }

  if (dirty) {
    await writeCache(CUSTOMER_CACHE, CUSTOMER_STATE_KEY, { orders: updated })
  }
}

// ─── Message จากหน้า web ─────────────────────────────────────────────────────

self.addEventListener('message', async (event) => {
  const { type } = event.data ?? {}

  switch (type) {
    case 'TRACK_ORDER': {
      // ลูกค้าสั่งอาหารหรือ open หน้า order → เริ่ม track
      const { orderId, orderNumber, currentStatus } = event.data
      if (!orderId) return

      const state   = await readCache(CUSTOMER_CACHE, CUSTOMER_STATE_KEY) ?? { orders: {} }
      const orders  = { ...state.orders }

      // ถ้ายัง track อยู่ไม่ต้อง reset (เก็บ status ที่รู้อยู่)
      if (!orders[orderId]) {
        orders[orderId] = {
          orderNumber: orderNumber || orderId,
          lastStatus:  currentStatus || 'pending',
          trackedAt:   Date.now(),
        }
        await writeCache(CUSTOMER_CACHE, CUSTOMER_STATE_KEY, { orders })
      }

      if (!_polling) startPolling()
      break
    }

    case 'UNTRACK_ORDER': {
      const { orderId } = event.data
      if (!orderId) return
      const state  = await readCache(CUSTOMER_CACHE, CUSTOMER_STATE_KEY) ?? { orders: {} }
      const orders = { ...state.orders }
      delete orders[orderId]
      await writeCache(CUSTOMER_CACHE, CUSTOMER_STATE_KEY, { orders })
      break
    }

    case 'RESET_ADMIN_STATE':
      await caches.open(ADMIN_CACHE).then((c) => c.delete(ADMIN_STATE_KEY)).catch(() => {})
      break
  }
})

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { type, url } = event.notification.data ?? {}
  const targetUrl = url || (type === 'admin' ? '/admin/orders' : '/')

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // หา tab ที่ตรงกับ URL ก่อน
        const match = clients.find((c) => c.url.includes(targetUrl))
        if (match && 'focus' in match) return match.focus()
        // หา tab ที่ใกล้เคียง
        const anyMatch = clients.find((c) =>
          type === 'admin' ? c.url.includes('/admin') : !c.url.includes('/admin')
        )
        if (anyMatch && 'focus' in anyMatch) {
          anyMatch.navigate?.(targetUrl) ?? anyMatch.focus()
          return anyMatch.focus()
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})
