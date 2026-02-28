import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { fetchBookingByUid, cancelBookingByUid } from '@/hooks/useBookings'
import { formatSlotDate, formatSlotTime } from '@/lib/utils'
import type { Booking } from '@/types'

export default function BookingCancel() {
  const { uid } = useParams<{ uid: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [cancelled, setCancelled] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!uid) return
    fetchBookingByUid(uid)
      .then(setBooking)
      .catch((err) => console.error('Failed to fetch booking:', err))
      .finally(() => setLoading(false))
  }, [uid])

  async function handleCancel() {
    if (!booking || !uid) return
    setSubmitting(true)
    try {
      await cancelBookingByUid(uid, reason || undefined)
      setCancelled(true)
    } catch (err) {
      console.error('Failed to cancel booking:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-500">This booking link is invalid.</p>
        </div>
      </div>
    )
  }

  if (cancelled || booking.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-md w-full p-8 text-center animate-[fadeInUp_0.4s_ease-out]">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-gray-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Cancelled</h1>
          <p className="text-sm text-gray-500">This booking has been cancelled successfully.</p>
        </div>
      </div>
    )
  }

  const eventType = booking.event_type as { title: string } | undefined

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-md w-full p-8 animate-[fadeInUp_0.3s_ease-out]">
        <div className="w-14 h-14 rounded-full bg-warning-100 flex items-center justify-center mx-auto mb-4 animate-[scaleIn_0.3s_ease-out]">
          <AlertTriangle size={28} className="text-warning-600" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Cancel Booking?</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Are you sure you want to cancel this booking?
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-gray-900">{eventType?.title || 'Meeting'}</p>
          <p className="text-sm text-gray-500 mt-1">
            {formatSlotDate(booking.start_time, booking.invitee_timezone)} at{' '}
            {formatSlotTime(booking.start_time, booking.invitee_timezone)}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for cancellation (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Let the host know why you're cancelling"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow placeholder:text-gray-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="w-full bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {submitting ? 'Cancelling...' : 'Cancel Booking'}
          </button>
          <Link
            to={`/booking/confirmation/${uid}`}
            className="w-full text-center py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Keep Booking
          </Link>
        </div>
      </div>
    </div>
  )
}
