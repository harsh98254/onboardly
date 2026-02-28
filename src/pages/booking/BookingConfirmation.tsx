import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, User } from 'lucide-react'
import { fetchBookingByUid } from '@/hooks/useBookings'
import { formatSlotDate, formatSlotTime, getDurationLabel } from '@/lib/utils'
import { LOCATION_TYPE_LABELS } from '@/lib/constants'
import type { Booking } from '@/types'

function AnimatedCheckmark() {
  return (
    <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4 animate-[checkmark_0.4s_ease-out]">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-success-600">
        <path
          d="M7 14.5L11.5 19L21 9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: 30,
            animation: 'checkDraw 0.4s ease-out 0.3s forwards',
          }}
        />
      </svg>
    </div>
  )
}

function buildCalendarUrl(type: 'google' | 'outlook', booking: Booking & { host: { full_name: string; email: string } }) {
  const eventType = booking.event_type as { title: string; location_type: string } | undefined
  const title = encodeURIComponent(eventType?.title || 'Meeting')
  const start = new Date(booking.start_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = new Date(booking.end_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const details = encodeURIComponent(`Booking with ${booking.host?.full_name || booking.host?.email}`)

  if (type === 'google') {
    return `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`
  }
  return `https://outlook.live.com/calendar/0/action/compose?subject=${title}&startdt=${booking.start_time}&enddt=${booking.end_time}&body=${details}`
}

export default function BookingConfirmation() {
  const { uid } = useParams<{ uid: string }>()
  const [booking, setBooking] = useState<(Booking & { host: { full_name: string; email: string } }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    fetchBookingByUid(uid)
      .then(setBooking)
      .catch((err) => console.error('Failed to fetch booking:', err))
      .finally(() => setLoading(false))
  }, [uid])

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
          <p className="text-gray-500">This booking link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  const eventType = booking.event_type as { title: string; duration: number; color: string; location_type: string } | undefined

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-md w-full p-8 text-center animate-[fadeInUp_0.4s_ease-out]">
        <AnimatedCheckmark />

        <h1 className="text-xl font-bold text-gray-900 mb-1">Booking Confirmed!</h1>
        <p className="text-sm text-gray-500 mb-6">
          You're all set. A confirmation has been sent to {booking.invitee_email}.
        </p>

        <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-6">
          <h3 className="text-base font-semibold text-gray-900">
            {eventType?.title || 'Meeting'}
          </h3>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <span>with {booking.host?.full_name || booking.host?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400 flex-shrink-0" />
              <span>{formatSlotDate(booking.start_time, booking.invitee_timezone)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400 flex-shrink-0" />
              <span>
                {formatSlotTime(booking.start_time, booking.invitee_timezone)} - {formatSlotTime(booking.end_time, booking.invitee_timezone)}
                {eventType && <span className="text-gray-400 ml-1">({getDurationLabel(eventType.duration)})</span>}
              </span>
            </div>
            {eventType && (
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                <span>{LOCATION_TYPE_LABELS[eventType.location_type as keyof typeof LOCATION_TYPE_LABELS]}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <a
            href={buildCalendarUrl('google', booking)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Google Calendar
          </a>
          <a
            href={buildCalendarUrl('outlook', booking)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Outlook
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            to={`/booking/cancel/${booking.uid}`}
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            Cancel or reschedule
          </Link>
        </div>
      </div>
    </div>
  )
}
