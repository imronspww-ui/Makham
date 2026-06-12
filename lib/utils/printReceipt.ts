/**
 * printReceipt — เปิด print window และพิมพ์ใบเสร็จ POS
 * รองรับ thermal printer 58mm / 80mm
 */

import { formatCurrency } from './format'
import type { ReceiptSettings, StoreSettings } from '@/types'

export interface ReceiptItem {
  name: string
  price: number
  qty: number
  options?: string
  note?: string
}

export interface ReceiptData {
  orderNumber:       string
  paidAt:            Date
  orderType?:        'pickup' | 'delivery' | 'dine-in'
  paymentMethod?:    'cash' | 'promptpay' | 'thaichangthai'
  items:             ReceiptItem[]
  subtotal:          number
  discountAmount:    number
  discountLabel:     string
  total:             number
  cashPaid:          number
  change:            number
  // member
  memberName?:       string
  pointsEarned?:     number
  memberTotalPoints?: number
  memberPointsExpiry?: Date
  // staff
  soldBy?:           string
}

const DEFAULT_FOOTER = 'ขอบคุณที่ใช้บริการ 🙏'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function divider() {
  return '<div class="div">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>'
}

function orderTypeLabel(t?: string) {
  if (t === 'delivery')  return 'จัดส่ง'
  if (t === 'dine-in')   return 'ทานที่ร้าน'
  return 'รับที่ร้าน'
}

function paymentLabel(m?: string) {
  if (m === 'promptpay') return 'พร้อมเพย์'
  if (m === 'thaichangthai') return 'ไทยช่วยไทยพลัส 60/40'
  return 'เงินสด'
}

function generateReceiptHtml(
  data:      ReceiptData,
  storeName: string,
  store?:    Pick<StoreSettings, 'logoUrl' | 'address'>,
  receipt?:  ReceiptSettings,
): string {
  const {
    orderNumber, paidAt, orderType, paymentMethod,
    items, subtotal, discountAmount, discountLabel,
    total, cashPaid, change,
    memberName, pointsEarned, memberTotalPoints, memberPointsExpiry,
    soldBy,
  } = data

  const dateStr = paidAt.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
  const timeStr = paidAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  const logoUrl   = (receipt?.showLogo && store?.logoUrl) ? store.logoUrl : ''
  const showAddr  = receipt?.showAddress && store?.address
  const phone     = receipt?.phone?.trim() ?? ''
  const taxId     = receipt?.taxId?.trim() ?? ''
  const footerMsg = receipt?.footerMessage?.trim() || DEFAULT_FOOTER
  const noteLines = (receipt?.noteLines ?? '')
    .split('\n').map((l) => l.trim()).filter(Boolean)

  // ── รายการสินค้า ──
  const itemRows = items.map((item) => {
    const lineTotal = formatCurrency(item.price * item.qty)
    const unitLabel = item.qty > 1 ? `${item.qty} x ${formatCurrency(item.price)}` : ''
    return `
      <tr>
        <td class="item-name">${escHtml(item.name)}</td>
        <td class="item-qty">${item.qty}</td>
        <td class="item-price">${lineTotal}</td>
      </tr>
      ${unitLabel ? `<tr><td class="sub" colspan="3">&nbsp;&nbsp;&nbsp;(${unitLabel})</td></tr>` : ''}
      ${item.options ? `<tr><td class="sub opt" colspan="3">&nbsp;&nbsp;&nbsp;└ ${escHtml(item.options)}</td></tr>` : ''}
      ${item.note   ? `<tr><td class="sub" colspan="3">&nbsp;&nbsp;&nbsp;หมายเหตุ: ${escHtml(item.note)}</td></tr>` : ''}
    `
  }).join('')

  // ── member block ──
  const expiryStr = memberPointsExpiry
    ? memberPointsExpiry.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })
    : ''
  const memberBlock = memberName ? `
    ${divider()}
    <div class="member-box">
      <div class="member-title">★ สมาชิก: ${escHtml(memberName)}</div>
      ${(pointsEarned ?? 0) > 0 ? `<div class="member-row"><span>แต้มที่ได้วันนี้</span><span class="green">+${pointsEarned} แต้ม</span></div>` : ''}
      ${memberTotalPoints != null ? `<div class="member-row"><span>แต้มสะสมรวม</span><span>${memberTotalPoints} แต้ม</span></div>` : ''}
      ${expiryStr ? `<div class="member-row"><span>หมดอายุ</span><span>${expiryStr}</span></div>` : ''}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>ใบเสร็จ ${orderNumber}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Sarabun', sans-serif;
    font-size: 14px;
    width: 80mm;
    max-width: 80mm;
    padding: 4mm 3mm;
    color: #000;
    line-height: 1.5;
  }
  .center  { text-align: center; }
  .right   { text-align: right; }
  .bold    { font-weight: 700; }
  .store-name { font-size: 18px; font-weight: 700; text-align: center; margin: 3px 0; }
  .store-sub  { font-size: 13px; text-align: center; color: #333; }
  .div { text-align: center; font-size: 11px; color: #888; margin: 5px 0; letter-spacing: -0.5px; }
  .info-row { display: flex; gap: 6px; font-size: 13px; margin: 1px 0; }
  .info-label { color: #555; min-width: 42px; }
  .info-val   { font-weight: 600; }

  table.items { width: 100%; border-collapse: collapse; margin: 4px 0; }
  .items th { font-size: 12px; color: #555; font-weight: 600; padding: 2px 0; }
  .items td { padding: 2px 0; vertical-align: top; }
  .item-name  { font-size: 14px; font-weight: 600; }
  .item-qty   { text-align: center; width: 28px; font-size: 13px; }
  .item-price { text-align: right; width: 40px; font-size: 14px; font-weight: 700; white-space: nowrap; }
  .sub { font-size: 12px; color: #555; }
  .opt { color: #333; }

  .summary { width: 100%; margin: 4px 0; }
  .summary td { padding: 2px 0; font-size: 14px; }
  .summary .s-label { color: #555; }
  .summary .s-val   { text-align: right; font-weight: 600; }
  .summary .discount { color: #c00; }
  .total-row td { font-size: 17px; font-weight: 700; padding-top: 3px; }
  .payment-row td { font-size: 13px; color: #444; }
  .change-row td  { font-size: 16px; font-weight: 700; }

  .member-box { background: #f9f9f9; border: 1px dashed #ccc; border-radius: 4px; padding: 6px 8px; margin: 2px 0; }
  .member-title { font-weight: 700; font-size: 13px; margin-bottom: 3px; }
  .member-row { display: flex; justify-content: space-between; font-size: 13px; color: #333; }
  .green { color: #196; font-weight: 700; }

  .footer { text-align: center; margin-top: 6px; font-size: 13px; }
  .footer-note { text-align: center; font-size: 12px; color: #555; }

  @media print {
    body { margin: 0; padding: 2mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head>
<body>

  ${divider()}
  ${logoUrl ? `<img style="display:block;max-width:28mm;max-height:16mm;object-fit:contain;margin:0 auto 4px" src="${escHtml(logoUrl)}" alt="logo" />` : ''}
  <div class="store-name">${escHtml(storeName)}</div>
  ${showAddr ? `<div class="store-sub">${escHtml(store!.address)}</div>` : ''}
  ${phone    ? `<div class="store-sub">โทร ${escHtml(phone)}</div>` : ''}
  ${taxId    ? `<div class="store-sub">เลขผู้เสียภาษี: ${escHtml(taxId)}</div>` : ''}
  ${divider()}

  <div class="info-row"><span class="info-label">เลขที่</span><span class="info-val">${escHtml(orderNumber)}</span></div>
  <div class="info-row"><span class="info-label">วันที่</span><span class="info-val">${dateStr} &nbsp;${timeStr}</span></div>
  <div class="info-row"><span class="info-label">ประเภท</span><span class="info-val">${orderTypeLabel(orderType)}</span></div>

  ${divider()}

  <table class="items">
    <thead>
      <tr>
        <th style="text-align:left">รายการ</th>
        <th style="text-align:center;width:28px">จำนวน</th>
        <th style="text-align:right;width:40px">ราคา</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  ${divider()}

  <table class="summary">
    <tr>
      <td class="s-label">รวมสินค้า</td>
      <td class="s-val">${formatCurrency(subtotal)}</td>
    </tr>
    ${discountAmount > 0 ? `
    <tr class="discount">
      <td class="s-label discount">ส่วนลด ${escHtml(discountLabel)}</td>
      <td class="s-val discount">-${formatCurrency(discountAmount)}</td>
    </tr>` : ''}
  </table>

  ${divider()}

  <table class="summary">
    <tr class="total-row">
      <td>ยอดสุทธิ</td>
      <td class="s-val">${formatCurrency(total)}</td>
    </tr>
    <tr class="payment-row">
      <td>ชำระด้วย</td>
      <td class="s-val">${paymentLabel(paymentMethod)}</td>
    </tr>
    ${paymentMethod !== 'promptpay' && cashPaid > 0 ? `
    <tr class="payment-row">
      <td>รับเงินมา</td>
      <td class="s-val">${formatCurrency(cashPaid)}</td>
    </tr>
    <tr class="change-row">
      <td>เงินทอน</td>
      <td class="s-val">${formatCurrency(change)}</td>
    </tr>` : ''}
    ${soldBy ? `
    <tr class="payment-row">
      <td>ผู้ดำเนินการ</td>
      <td class="s-val">${escHtml(soldBy)}</td>
    </tr>` : ''}
  </table>

  ${memberBlock}

  ${divider()}
  <div class="footer">${escHtml(footerMsg)}</div>
  ${noteLines.map((l) => `<div class="footer-note">${escHtml(l)}</div>`).join('')}
  ${divider()}

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
  const win  = window.open('', '_blank', 'width=420,height=700,toolbar=0,menubar=0')
  if (!win) {
    alert('กรุณาอนุญาต Pop-up เพื่อพิมพ์ใบเสร็จ')
    return
  }
  win.document.write(html)
  win.document.close()
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.print()
      win.close()
    }, 800)
  })
}
