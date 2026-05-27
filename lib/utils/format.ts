export function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} ม.`
  return `${km.toFixed(1)} กม.`
}

export function generateOrderNumber(): string {
  const now = new Date()
  const ymd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `ORD-${ymd}-${rand}`
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}
