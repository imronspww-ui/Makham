'use client'
import { useState, useEffect, useCallback } from 'react'
import { QrCode, Download, Share2, Plus, Minus, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

async function generateQr(url: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#1a0a00', light: '#fff8f0' },
  })
}

function TableQrCard({ tableNum, baseUrl }: { tableNum: number; baseUrl: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const url = `${baseUrl}/table/${tableNum}`

  useEffect(() => {
    generateQr(url).then(setQrDataUrl).catch(() => {})
  }, [url])

  function handleDownload() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-table-${tableNum}.png`
    a.click()
    toast.success(`ดาวน์โหลด QR โต๊ะ ${tableNum} แล้ว`)
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `QR โต๊ะ ${tableNum}`, url })
        return
      } catch { /* user cancelled */ }
    }
    // Fallback: copy URL
    await navigator.clipboard.writeText(url).catch(() => {})
    toast.success(`คัดลอก URL โต๊ะ ${tableNum} แล้ว`)
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm hover:shadow-md transition-all">
      {/* QR image */}
      <div className="rounded-2xl bg-orange-50 p-3 shadow-inner">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt={`QR โต๊ะ ${tableNum}`} className="w-36 h-36 rounded-xl" />
        ) : (
          <div className="w-36 h-36 rounded-xl bg-orange-100 flex items-center justify-center animate-pulse">
            <QrCode size={40} className="text-orange-300" />
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-base font-bold text-stone-800">โต๊ะ {tableNum}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-orange-500 hover:text-orange-700 mt-0.5"
        >
          <ExternalLink size={10} />
          ทดสอบลิงก์
        </a>
      </div>

      {/* Actions */}
      <div className="flex gap-2 w-full">
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-orange-200 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50 disabled:opacity-40 transition-colors"
        >
          <Download size={13} /> บันทึก
        </button>
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-600 py-2 text-xs font-bold text-white hover:bg-orange-500 transition-colors"
        >
          <Share2 size={13} /> แชร์
        </button>
      </div>
    </div>
  )
}

export default function TablesPage() {
  const [tableCount, setTableCount] = useState(8)
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">QR โต๊ะอาหาร</h1>
          <p className="text-sm text-gray-500 mt-0.5">ลูกค้าสแกน QR เพื่อสั่งอาหารจากโต๊ะของตัวเอง</p>
        </div>
        {/* Table count adjuster */}
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
          <span className="text-sm font-semibold text-gray-700">จำนวนโต๊ะ</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTableCount((v) => Math.max(1, v - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Minus size={13} />
            </button>
            <span className="w-8 text-center font-bold text-gray-800">{tableCount}</span>
            <button
              onClick={() => setTableCount((v) => Math.min(50, v + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-white hover:bg-orange-500 transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3 flex items-start gap-3">
        <QrCode size={18} className="text-orange-500 shrink-0 mt-0.5" />
        <div className="text-sm text-orange-800">
          <p className="font-semibold mb-0.5">วิธีใช้งาน</p>
          <ol className="text-xs text-orange-700 flex flex-col gap-0.5 list-decimal list-inside">
            <li>ปรับจำนวนโต๊ะให้ตรงกับร้าน แล้วบันทึก QR แต่ละโต๊ะ</li>
            <li>พิมพ์ QR ใส่กรอบหรือสติกเกอร์วางบนโต๊ะ</li>
            <li>ลูกค้าสแกน → เมนูเปิดพร้อมเลขโต๊ะ → สั่งอาหารได้เลย</li>
            <li>ออเดอร์จะแสดงเลขโต๊ะใน POS และหน้าออเดอร์อัตโนมัติ</li>
          </ol>
        </div>
      </div>

      {/* QR grid */}
      {baseUrl && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: tableCount }, (_, i) => (
            <TableQrCard key={i + 1} tableNum={i + 1} baseUrl={baseUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
