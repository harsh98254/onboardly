import type { BookingStatus } from '@/types'
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from '@/lib/constants'

export default function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const style = BOOKING_STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {BOOKING_STATUS_LABELS[status]}
    </span>
  )
}
