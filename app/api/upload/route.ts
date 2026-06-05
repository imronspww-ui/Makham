import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { requireAdmin } from '@/lib/auth'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Validate MIME type (from browser-reported type; also verified by magic bytes below)
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'อนุญาตเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP, GIF)' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'ไฟล์ใหญ่เกิน 5 MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Verify magic bytes (file signature) — prevent MIME spoofing
    if (!hasImageMagicBytes(buffer)) {
      return NextResponse.json({ error: 'ไฟล์ไม่ใช่รูปภาพจริง' }, { status: 400 })
    }

    const ext = MIME_TO_EXT[file.type]

    const apiKey = process.env.IMGBB_API_KEY
    if (apiKey) {
      const base64 = buffer.toString('base64')
      const body = new FormData()
      body.append('key', apiKey)
      body.append('image', base64)
      const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body })
      const data = await res.json()
      if (!data.success) throw new Error('ImgBB upload failed')
      return NextResponse.json({ url: data.data.url })
    }

    // Fallback: local storage (development only)
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'กรุณาตั้งค่า IMGBB_API_KEY สำหรับ production' }, { status: 500 })
    }

    // Use only crypto-random filename — never trust original filename
    const filename = `${crypto.randomUUID()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, filename), buffer)
    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

/** ตรวจ magic bytes ของไฟล์รูป */
function hasImageMagicBytes(buf: Buffer): boolean {
  if (buf.length < 4) return false
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf.length >= 12 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true
  return false
}
