import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const apiKey = process.env.IMGBB_API_KEY
    if (apiKey) {
      // อัปโหลดไปที่ ImgBB
      const base64 = buffer.toString('base64')
      const body = new FormData()
      body.append('key', apiKey)
      body.append('image', base64)
      const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body })
      const data = await res.json()
      if (!data.success) throw new Error('ImgBB upload failed')
      return NextResponse.json({ url: data.data.url })
    }

    // fallback: บันทึกในเครื่อง (development เท่านั้น)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, filename), buffer)
    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
