/**
 * Server-side auth helpers — Edge-compatible (no Node.js Buffer/fs)
 * Uses HMAC-SHA-256 signed tokens stored in httpOnly cookies.
 *
 * Roles:
 *   admin — full access (admin_session cookie)
 *   staff — access to POS + Orders only (staff_session cookie)
 *
 * Token format:
 *   admin: `${uuid}.${hmac}`          (uuid has no prefix)
 *   staff: `staff:${uuid}.${hmac}`    ("staff:" prefix prevents cross-role reuse)
 */
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE = 'admin_session'
const STAFF_COOKIE = 'staff_session'
const HMAC_ALG = { name: 'HMAC', hash: 'SHA-256' }

export type SessionRole = 'admin' | 'staff' | null

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set')
  return s
}

async function importKey(keyMaterial: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(keyMaterial), HMAC_ALG, false, ['sign', 'verify'],
  )
}

function toBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return toBase64Url(sig)
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifyToken(token: string, requiredPrefix: '' | 'staff:'): Promise<boolean> {
  try {
    const secret = getSecret()
    const dotIdx = token.lastIndexOf('.')
    if (dotIdx === -1) return false
    const id = token.slice(0, dotIdx)
    const sig = token.slice(dotIdx + 1)
    // Enforce role separation via prefix
    if (requiredPrefix === 'staff:' && !id.startsWith('staff:')) return false
    if (requiredPrefix === '' && id.startsWith('staff:')) return false
    const expected = await signValue(id, secret)
    return constantTimeEqual(expected, sig)
  } catch {
    return false
  }
}

// ─── Admin session ────────────────────────────────────────────────────────────

export async function createSessionToken(): Promise<string> {
  const secret = getSecret()
  const id = crypto.randomUUID()            // no prefix → admin token
  const sig = await signValue(id, secret)
  return `${id}.${sig}`
}

export async function isValidSessionToken(token: string): Promise<boolean> {
  return verifyToken(token, '')
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' })
}

/** API route guard — admin only */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || !(await isValidSessionToken(token)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

// ─── Staff session ────────────────────────────────────────────────────────────

export async function createStaffToken(): Promise<string> {
  const secret = getSecret()
  const id = `staff:${crypto.randomUUID()}`  // prefix → staff token
  const sig = await signValue(id, secret)
  return `${id}.${sig}`
}

export async function isValidStaffToken(token: string): Promise<boolean> {
  return verifyToken(token, 'staff:')
}

export function setStaffCookie(response: NextResponse, token: string): void {
  response.cookies.set(STAFF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,  // 12 hours — กะทำงานหนึ่งกะ
    path: '/',
  })
}

export function clearStaffCookie(response: NextResponse): void {
  response.cookies.set(STAFF_COOKIE, '', { maxAge: 0, path: '/' })
}

/** API route guard — admin OR staff */
export async function requireStaffOrAdmin(request: NextRequest): Promise<NextResponse | null> {
  const adminToken = request.cookies.get(ADMIN_COOKIE)?.value
  if (adminToken && (await isValidSessionToken(adminToken))) return null

  const staffToken = request.cookies.get(STAFF_COOKIE)?.value
  if (staffToken && (await isValidStaffToken(staffToken))) return null

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/** ดึง role ปัจจุบันจาก request cookies */
export async function getSessionRole(request: NextRequest): Promise<SessionRole> {
  const adminToken = request.cookies.get(ADMIN_COOKIE)?.value
  if (adminToken && (await isValidSessionToken(adminToken))) return 'admin'

  const staffToken = request.cookies.get(STAFF_COOKIE)?.value
  if (staffToken && (await isValidStaffToken(staffToken))) return 'staff'

  return null
}

// ─── Staff PIN hashing ────────────────────────────────────────────────────────

/**
 * Hash a 4-6 digit PIN using HMAC-SHA-256.
 * Key material is derived from SESSION_SECRET + a fixed domain separator
 * so PIN hashes are distinct from session token signatures.
 */
export async function hashStaffPin(pin: string): Promise<string> {
  const secret = getSecret()
  return signValue(pin, secret + ':staff-pin-v1')
}

/** ตรวจสอบ PIN ที่ผู้ใช้กรอกกับ hash ที่เก็บไว้ */
export async function verifyStaffPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashStaffPin(pin)
  return constantTimeEqual(hash, storedHash)
}
