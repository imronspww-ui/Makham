/**
 * Service Worker — Order Notifications (Admin + Customer)
 *
 * Admin   : poll /api/orders ทุก 20 วิ → แจ้งออเดอร์ใหม่ pending
 * Customer: poll /api/orders/[id] สำหรับออเดอร์ที่ติดตาม → แจ้งเมื่อสถานะเปลี่ยน
 *
 * TTS: SW ไม่มี SpeechSynthesis → ส่ง { type:'SPEAK', text } ไปยัง tab ที่เปิดอยู่
 * แล้วให้ tab นั้นเล่นเสียงพูดแทน (useSWSpeak hook)
 */
'use strict'

const POLL_MS            = 10_000
const ADMIN_CACHE        = 'sw-admin-v1'
const ADMIN_STATE_KEY    = '/sw-admin-state'
const CUSTOMER_CACHE     = 'sw-customer-v1'
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

// ─── Broadcast SPEAK → tabs ───────────────────────────────────────────────────
/**
 * ส่ง message { type: 'SPEAK', text } ไปยัง tab ที่เปิดอยู่
 * filterFn: กรองว่า tab ไหนควรรับ (ถ้าไม่ระบุ = ทุก tab)
 * ส่งเฉพาะ tab แรกที่ match เพื่อไม่ให้เสียงซ้ำ
 */
async function broadcastSpeak(text, filterFn) {
  try {
    const all     = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const targets = filterFn ? all.filter(filterFn) : all
    const target  = targets[0] ?? all[0]   // prefer filtered, fallback any
    if (target) target.postMessage({ type: 'SPEAK', text })
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

    const state    = await readCache(ADMIN_CACHE, ADMIN_STATE_KEY) ?? { ids: [], initialized: false }
    const knownIds = new Set(state.ids)

    if (!state.initialized) {
      orders.forEach((o) => knownIds.add(o.id))
      await writeCache(ADMIN_CACHE, ADMIN_STATE_KEY, { ids: [...knownIds], initialized: true })
      return
    }

    const freshPending = orders.filter((o) => o.status === 'pending' && !knownIds.has(o.id))
    orders.forEach((o) => knownIds.add(o.id))
    await writeCache(ADMIN_CACHE, ADMIN_STATE_KEY, { ids: [...knownIds], initialized: true })

    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    // Tab "focused" = admin เห็นหน้าจออยู่ → foreground hook (Firestore) จัดการได้
    // Tab "background/hidden" = เสียง/notification จาก page script ใช้ไม่ได้ → SW ต้องทำแทน
    const hasFocusedAdminTab = allClients.some(
      (c) => c.url.includes('/admin') && c.focused,
    )

    for (const order of freshPending) {
      const name   = order.customer?.name || 'ลูกค้า'
      const total  = (order.total ?? 0).toLocaleString('th-TH')
      const type   = order.orderType === 'delivery' ? '🚗 Delivery' : '🛍️ Pickup'
      const extra  = freshPending.length > 1
        ? ` และอีก ${freshPending.length - 1} รายการ`
        : ''
      const speech = `มีออเดอร์ใหม่จาก${name} ยอด ${total} บาท${extra} กรุณาตรวจสอบด้วยครับ`

      if (hasFocusedAdminTab) {
        // Admin tab กำลัง focus อยู่ → Firestore hook ยิงทันที (< 2s) จัดการแล้ว
        // SW ช้ากว่า (10s poll) → skip เพื่อไม่ให้เสียงดังซ้ำ
        continue
      }

      // Admin tab อยู่ background หรือไม่มีเลย
      // → ยิง OS notification (ทำงานได้แม้ browser จะ minimize/background)
      await self.registration.showNotification(`📦 ออเดอร์ใหม่! #${order.orderNumber}`, {
        body:               `${name} · ฿${total} · ${type}`,
        icon:               '/icons/icon-192.png',
        badge:              '/icons/icon-192.png',
        tag:                `admin-order-${order.id}`,
        requireInteraction: true,
        data:               { type: 'admin', url: '/admin/orders' },
      })

      // ส่ง SPEAK + PLAY_ALARM ไปยัง admin tabs ที่เปิดอยู่ (background)
      // tabs จะเล่นเสียงทันทีที่ผู้ใช้กลับมาที่หน้าต่าง (queue ไว้)
      await broadcastSpeak(speech, (c) => c.url.includes('/admin'))

      // ส่ง PLAY_ALARM → tab เล่นเสียงกริ่งเมื่อได้ focus กลับมา
      try {
        const adminTabs = allClients.filter((c) => c.url.includes('/admin'))
        const target    = adminTabs[0]
        if (target) target.postMessage({ type: 'PLAY_ALARM' })
      } catch { /* ignore */ }
    }
  } catch { /* network error — retry next cycle */ }
}

// ══════════════════════════════════════════════════════════
// CUSTOMER — แจ้งเตือนสถานะออเดอร์ของลูกค้า
// ══════════════════════════════════════════════════════════

const CUSTOMER_STATUS_INFO = {
  cooking: {
    title:  'กำลังทำอาหาร! 👨‍🍳',
    body:   'ร้านรับออเดอร์และกำลังทำอาหารให้คุณแล้ว',
    speech: 'ร้านรับออเดอร์แล้วครับ กำลังทำอาหารให้คุณ รอสักครู่นะครับ',
  },
  delivering: {
    title:  'กำลังจัดส่ง! 🛵',
    body:   'อาหารของคุณกำลังเดินทางมาแล้ว',
    speech: 'อาหารของคุณกำลังส่งแล้วครับ รอรับได้เลยนะครับ',
  },
  completed: {
    title:  'พร้อมแล้ว! ✅',
    body:   'อาหารของคุณเสร็จแล้ว มารับได้เลย',
    speech: 'อาหารที่คุณสั่งเสร็จเรียบร้อยแล้วครับ มารับได้เลยนะครับ ขอบคุณที่ใช้บริการครับ',
  },
  cancelled: {
    title:  'ออเดอร์ถูกยกเลิก ❌',
    body:   'ออเดอร์ของคุณถูกยกเลิก กรุณาติดต่อร้าน',
    speech: 'ขออภัยครับ ออเดอร์ของคุณถูกยกเลิกแล้ว กรุณาติดต่อร้านครับ',
  },
}

const TERMINAL_STATUSES = new Set(['completed', 'cancelled'])
const MAX_TRACK_MS      = 24 * 60 * 60 * 1000   // 24 ชั่วโมง

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
        const msgInfo = CUSTOMER_STATUS_INFO[order.status]
        if (msgInfo) {
          const clients     = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          const onOrderPage = clients.some((c) => c.url.includes(`/order/${orderId}`))

          if (!onOrderPage) {
            // ── ลูกค้าอยู่ tab อื่น → แสดง notification + เล่นเสียงพูด ──
            await self.registration.showNotification(msgInfo.title, {
              body:               `ออเดอร์ #${info.orderNumber} · ${msgInfo.body}`,
              icon:               '/icons/icon-192.png',
              badge:              '/icons/icon-192.png',
              tag:                `customer-order-${orderId}`,
              requireInteraction: false,
              data:               { type: 'customer', url: `/order/${orderId}`, orderId },
            })

            // TTS ไปยัง tab ใดก็ได้ของเว็บไซต์ (ไม่ใช่ admin)
            await broadcastSpeak(
              msgInfo.speech,
              (c) => !c.url.includes('/admin'),
            )
          } else {
            // ── ลูกค้าอยู่หน้า order อยู่แล้ว → ส่ง message ให้ hook จัดการ (เสียง+TTS) ──
            for (const client of clients) {
              if (client.url.includes(`/order/${orderId}`)) {
                client.postMessage({ type: 'ORDER_STATUS_CHANGED', orderId, newStatus: order.status })
              }
            }
          }
        }

        updated[orderId] = { ...info, lastStatus: order.status }
        dirty = true

        // force expire รอบถัดไปหลัง terminal
        if (TERMINAL_STATUSES.has(order.status)) {
          updated[orderId].trackedAt = 0
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
      const { orderId, orderNumber, currentStatus } = event.data
      if (!orderId) return

      const state  = await readCache(CUSTOMER_CACHE, CUSTOMER_STATE_KEY) ?? { orders: {} }
      const orders = { ...state.orders }

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
        const match = clients.find((c) => c.url.includes(targetUrl))
        if (match && 'focus' in match) return match.focus()

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
