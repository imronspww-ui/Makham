/**
 * printReceipt — เปิด print window และพิมพ์ใบเสร็จ POS
 * รองรับ thermal printer 58mm / 80mm
 */

import { formatCurrency } from './format'
import type { ReceiptSettings, StoreSettings } from '@/types'

export interface ReceiptItem {
  name: string
  price: number     // unit price (รวม option แล้ว)
  qty: number
  options?: string  // ตัวเลือก เช่น "เผ็ดน้อย, ไม่ใส่ผัก"
  note?: string
}

export interface ReceiptData {
  orderNumber:    string
  paidAt:         Date
  items:          ReceiptItem[]
  subtotal:       number
  discountAmount: number
  discountLabel:  string   // เช่น "10%" หรือ "฿20"
  total:          number
  cashPaid:       number
  change:         number
}

// ค่าเริ่มต้นถ้าไม่ได้ตั้งค่า
const DEFAULT_FOOTER = 'ขอบคุณที่ใช้บริการ 🙏'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generateReceiptHtml(
  data:      ReceiptData,
  storeName: string,
  store?:    Pick<StoreSettings, 'logoUrl' | 'address'>,
  receipt?:  ReceiptSettings,
): string {
  const { orderNumber, paidAt, items, subtotal, discountAmount, discountLabel, total, cashPaid, change } = data

  const dateStr = paidAt.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
  const timeStr = paidAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  // ── ส่วนหัว ──
  const logoUrl   = (receipt?.showLogo && store?.logoUrl) ? store.logoUrl : ''
  const showAddr  = receipt?.showAddress && store?.address
  const phone     = receipt?.phone?.trim() ?? ''
  const taxId     = receipt?.taxId?.trim() ?? ''
  const footerMsg = receipt?.footerMessage?.trim() || DEFAULT_FOOTER
  const noteLines = (receipt?.noteLines ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  // ── รายการสินค้า ──
  const itemRows = items.map((item) => {
    const lineTotal = formatCurrency(item.price * item.qty)
    const unitStr   = item.qty > 1 ? `${item.qty} x ${formatCurrency(item.price)}` : ''
    const optStr    = item.options ? `[${item.options}]` : ''
    const noteStr   = item.note   ? `หมายเหตุ: ${item.note}` : ''
    return `
      <div class="row">
        <div class="name">${escHtml(item.name)}</div>
        <div class="amt">${lineTotal}</div>
      </div>
      ${unitStr ? `<div class="sub">&nbsp;&nbsp;${unitStr}</div>` : ''}
      ${optStr  ? `<div class="sub">&nbsp;&nbsp;${escHtml(optStr)}</div>` : ''}
      ${noteStr ? `<div class="sub">&nbsp;&nbsp;${escHtml(noteStr)}</div>` : ''}
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>ใบเสร็จ ${orderNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    width: 80mm;
    max-width: 80mm;
    padding: 4mm 3mm;
    color: #000;
  }
  .center  { text-align: center; }
  .right   { text-align: right; }
  .bold    { font-weight: bold; }
  .lg      { font-size: 15px; }
  .sub     { font-size: 11px; color: #555; margin: 0 0 2px 0; }
  .dash    { border-top: 1px dashed #000; margin: 5px 0; }
  .row     { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; margin: 2px 0; }
  .name    { flex: 1; word-break: break-all; }
  .amt     { white-space: nowrap; font-weight: bold; }
  .total-row  { font-size: 16px; font-weight: bold; margin: 4px 0; }
  .change-row { font-size: 18px; font-weight: bold; }
  .logo    { display: block; max-width: 28mm; max-height: 16mm; object-fit: contain; margin: 0 auto 4px; }
  @media print {
    body { margin: 0; padding: 2mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head>
<body>

  ${logoUrl ? `<img class="logo" src="${escHtml(logoUrl)}" alt="logo" />` : ''}
  <div class="center bold lg">${escHtml(storeName)}</div>
  ${showAddr ? `<div class="center sub">${escHtml(store!.address)}</div>` : ''}
  ${phone    ? `<div class="center sub">โทร ${escHtml(phone)}</div>` : ''}
  ${taxId    ? `<div class="center sub">เลขที่ผู้เสียภาษี: ${escHtml(taxId)}</div>` : ''}

  <div class="dash"></div>
  <div class="bold">เลขที่: ${orderNumber}</div>
  <div class="sub">${dateStr} ${timeStr}</div>
  <div class="dash"></div>

  ${itemRows}

  <div class="dash"></div>

  <div class="row">
    <div>รวมสินค้า</div>
    <div>${formatCurrency(subtotal)}</div>
  </div>

  ${discountAmount > 0 ? `
  <div class="row" style="color:#c00">
    <div>ส่วนลด (${discountLabel})</div>
    <div>-${formatCurrency(discountAmount)}</div>
  </div>` : ''}

  <div class="dash"></div>

  <div class="row total-row">
    <div>ยอดสุทธิ</div>
    <div>${formatCurrency(total)}</div>
  </div>

  <div class="row">
    <div>รับเงินมา</div>
    <div>${formatCurrency(cashPaid)}</div>
  </div>

  <div class="row change-row">
    <div>เงินทอน</div>
    <div>${formatCurrency(change)}</div>
  </div>

  <div class="dash"></div>
  <div class="center" style="margin-top:4px">${escHtml(footerMsg)}</div>
  ${noteLines.map((l) => `<div class="center sub">${escHtml(l)}</div>`).join('')}

</body>
</html>`
}

export function printReceipt(
  data:      ReceiptData,
  storeName: string,
  store?:    Pick<StoreSettings, 'logoUrl' | 'address'>,
  receipt?:  ReceiptSettings,
) {
  const html = generateReceiptHtml(data, storeName, store, receipt)
  const win  = window.open('', '_blank', 'width=420,height=680,toolbar=0,menubar=0')
  if (!win) {
    alert('กรุณาอนุญาต Pop-up เพื่อพิมพ์ใบเสร็จ')
    return
  }
  win.document.write(html)
  win.document.close()
  // รอ fonts + โลโก้โหลดก่อน print
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.print()
      win.close()
    }, receipt?.showLogo && store?.logoUrl ? 600 : 250)
  })
}
