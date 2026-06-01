/**
 * printReceipt — เปิด print window และพิมพ์ใบเสร็จ POS
 * รองรับ thermal printer 58mm / 80mm
 */

import { formatCurrency } from './format'

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

function padLine(left: string, right: string, width = 32): string {
  const pad = width - left.length - right.length
  return left + ' '.repeat(Math.max(1, pad)) + right
}

function generateReceiptHtml(data: ReceiptData, storeName: string): string {
  const { orderNumber, paidAt, items, subtotal, discountAmount, discountLabel, total, cashPaid, change } = data

  const dateStr = paidAt.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
  const timeStr = paidAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  const itemRows = items.map((item) => {
    const lineTotal = formatCurrency(item.price * item.qty)
    const unitStr   = item.qty > 1 ? `  ${item.qty} x ${formatCurrency(item.price)}` : ''
    const optStr    = item.options ? `  [${item.options}]` : ''
    const noteStr   = item.note   ? `  หมายเหตุ: ${item.note}` : ''
    return `
      <div class="row">
        <div class="name">${item.name}</div>
        <div class="amt">${lineTotal}</div>
      </div>
      ${unitStr  ? `<div class="sub">${unitStr}</div>`  : ''}
      ${optStr   ? `<div class="sub">${optStr}</div>`   : ''}
      ${noteStr  ? `<div class="sub">${noteStr}</div>`  : ''}
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
  .xl      { font-size: 19px; }
  .dash    { border-top: 1px dashed #000; margin: 5px 0; }
  .row     { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; margin: 2px 0; }
  .name    { flex: 1; word-break: break-all; }
  .amt     { white-space: nowrap; font-weight: bold; }
  .sub     { font-size: 11px; color: #555; margin: 0 0 2px 0; }
  .total-row { font-size: 16px; font-weight: bold; margin: 4px 0; }
  .change-row { font-size: 18px; font-weight: bold; }
  @media print {
    body { margin: 0; padding: 2mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head>
<body>

  <div class="center bold lg">${storeName}</div>
  <div class="center" style="font-size:11px; margin-top:2px">${dateStr} ${timeStr}</div>

  <div class="dash"></div>
  <div class="bold">เลขที่: ${orderNumber}</div>
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
  <div class="center" style="margin-top:4px">ขอบคุณที่ใช้บริการ 🙏</div>
  <div class="center" style="font-size:10px; margin-top:2px; color:#666">POS หน้าร้าน</div>

</body>
</html>`
}

export function printReceipt(data: ReceiptData, storeName: string) {
  const html = generateReceiptHtml(data, storeName)
  const win  = window.open('', '_blank', 'width=420,height=620,toolbar=0,menubar=0')
  if (!win) {
    alert('กรุณาอนุญาต Pop-up เพื่อพิมพ์ใบเสร็จ')
    return
  }
  win.document.write(html)
  win.document.close()
  // รอ fonts โหลดก่อน print
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.print()
      win.close()
    }, 250)
  })
}
