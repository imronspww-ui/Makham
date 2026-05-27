import { Badge } from '@/components/ui/Badge'
import type { OrderStatus } from '@/types'

const statusConfig: Record<OrderStatus, { label: string; color: 'gray' | 'orange' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' }> = {
  pending: { label: 'รอดำเนินการ', color: 'yellow' },
  cooking: { label: 'กำลังทำอาหาร', color: 'orange' },
  delivering: { label: 'กำลังจัดส่ง', color: 'blue' },
  completed: { label: 'เสร็จสิ้น', color: 'green' },
  cancelled: { label: 'ยกเลิก', color: 'red' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = statusConfig[status]
  return <Badge color={cfg.color}>{cfg.label}</Badge>
}

export { statusConfig }
