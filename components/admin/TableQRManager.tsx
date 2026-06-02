'use client'
/**
 * TableQRManager — สร้าง QR Code ประจำโต๊ะ พิมพ์ได้เลย
 * แปะที่โต๊ะ ลูกค้าสแกน → สั่งอาหารพร้อมระบุโต๊ะอัตโนมัติ
 */
import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Printer, Plus, Trash2, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

interface TableItem {
  id: string    // เช่น "1", "A1", "VIP"
  label: string // เช่น "โต๊ะ 1"
}

const DEFAULT_TABLES: TableItem[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  label: `โต๊ะ ${i + 1}`,
}))

const STORAGE_KEY = 'pos-tables'

function loadTables(): TableItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as TableItem[]
  } catch { /* ignore */ }
  return DEFAULT_TABLES
}

function saveTables(tables: TableItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables))
}

function getBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function TableQRManager() {
  const [tables,    setTables]    = useState<TableItem[]>([])
  const [newId,     setNewId]     = useState('')
  const [newLabel,  setNewLabel]  = useState('')
  const [qrUrls,    setQrUrls]    = useState<Record<string, string>>({})
  const [selected,  setSelected]  = useState<string[]>([])
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTables(loadTables())
  }, [])

  // สร้าง QR data URL สำหรับทุกโต๊ะ
  useEffect(() => {
    const base = getBaseUrl()
    Promise.all(
      tables.map(async (t) => {
        const url = `${base}/?table=${encodeURIComponent(t.id)}`
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
        return [t.id, dataUrl] as const
      })
    ).then((pairs) => setQrUrls(Object.fromEntries(pairs)))
  }, [tables])

  function addTable() {
    if (!newId.trim()) { toast.error('กรุณาระบุรหัสโต๊ะ'); return }
    if (tables.some((t) => t.id === newId.trim())) { toast.error('รหัสโต๊ะซ้ำ'); return }
    const updated = [...tables, { id: newId.trim(), label: newLabel.trim() || `โต๊ะ ${newId.trim()}` }]
    setTables(updated)
    saveTables(updated)
    setNewId('')
    setNewLabel('')
  }

  function removeTable(id: string) {
    const updated = tables.filter((t) => t.id !== id)
    setTables(updated)
    saveTables(updated)
    setSelected((s) => s.filter((x) => x !== id))
  }

  function toggleSelect(id: string) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  }

  function printSelected() {
    const toPrint = selected.length > 0 ? tables.filter((t) => selected.includes(t.id)) : tables
    if (toPrint.length === 0) { toast.error('ไม่มีโต๊ะให้พิมพ์'); return }

    const base = getBaseUrl()
    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>QR Code โต๊ะ</title>
      <style>
        body { font-family: sans-serif; margin: 0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; }
        .card { border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; page-break-inside: avoid; }
        .label { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
        .url { font-size: 9px; color: #9ca3af; margin-top: 6px; word-break: break-all; }
        img { width: 140px; height: 140px; }
        @media print { @page { margin: 8mm; } }
      </style></head><body>
      <div class="grid">
        ${toPrint.map((t) => `
          <div class="card">
            <div class="label">${t.label}</div>
            <img src="${qrUrls[t.id] ?? ''}" />
            <div class="url">${base}/?table=${t.id}</div>
          </div>`).join('')}
      </div>
      <script>window.onload=()=>{window.print();window.close()}<\/script>
    </body></html>`

    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) { toast.error('กรุณาอนุญาต Pop-up'); return }
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Add table */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          placeholder="รหัสโต๊ะ เช่น 9, A1, VIP"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 outline-none w-40"
          onKeyDown={(e) => e.key === 'Enter' && addTable()}
        />
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="ชื่อโต๊ะ (ไม่บังคับ)"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 outline-none w-40"
          onKeyDown={(e) => e.key === 'Enter' && addTable()}
        />
        <button onClick={addTable}
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-600 transition-colors">
          <Plus size={15} /> เพิ่มโต๊ะ
        </button>
        <button
          onClick={printSelected}
          className="flex items-center gap-1.5 rounded-xl border border-gray-300 text-gray-600 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ml-auto"
        >
          <Printer size={15} />
          {selected.length > 0 ? `พิมพ์ ${selected.length} โต๊ะ` : 'พิมพ์ทั้งหมด'}
        </button>
      </div>

      <p className="text-xs text-gray-400 -mt-3">
        คลิกที่การ์ดเพื่อเลือก → กด "พิมพ์ที่เลือก" เพื่อพิมพ์เฉพาะบางโต๊ะ
      </p>

      {/* QR grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {tables.map((t) => {
          const isSelected = selected.includes(t.id)
          return (
            <div
              key={t.id}
              onClick={() => toggleSelect(t.id)}
              className={[
                'relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 cursor-pointer transition-all select-none',
                isSelected
                  ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-100'
                  : 'border-gray-200 bg-white hover:border-orange-300',
              ].join(' ')}
            >
              {/* Delete */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTable(t.id) }}
                className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>

              {/* QR */}
              {qrUrls[t.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrUrls[t.id]} alt={`QR ${t.label}`} className="w-28 h-28" />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center text-gray-200">
                  <QrCode size={48} />
                </div>
              )}

              <p className="font-bold text-gray-800 text-sm text-center">{t.label}</p>
              {isSelected && (
                <span className="text-[10px] font-bold text-orange-600">✓ เลือกแล้ว</span>
              )}
            </div>
          )
        })}
      </div>

      {tables.length === 0 && (
        <div className="py-12 text-center text-gray-400">
          <QrCode size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">ยังไม่มีโต๊ะ กดเพิ่มโต๊ะด้านบน</p>
        </div>
      )}
    </div>
  )
}
