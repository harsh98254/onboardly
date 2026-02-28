import { Calendar, Clock, MapPin, User, MoreVertical, Check, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { formatSlotTime, formatSlotDate, getDurationLabel } from '@/lib/utils'
import { LOCATION_TYPE_LABELS } from '@/lib/constants'
import BookingStatusBadge from './BookingStatusBadge'
import type { Booking, BookingStatus } from '@/types'

interface BookingCardProps {
  booking: Booking
  onConfirm?: (id: string) => void
  onCancel?: (id: string) => void
  onNoShow?: (id: string) => void
  onComplete?: (id: string) => void
}

export default function BookingCard({ booking, onConfirm, onCancel, onNoShow, onComplete }: BookingCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const eventType = booking.event_type as { title: string; duration: number; color: string; location_type: string } | undefined

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isPast = new Date(booking.start_time) < new Date()
  const isActionable = booking.status === 'confirmed' || booking.status === 'pending'

  const initials = booking.invitee_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="flex">
        {eventType && (
          <div
            className="w-1.5 flex-shrink-0"
            style={{ backgroundColor: eventType.color }}
          />
        )}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {eventType?.title || 'Event'}
                  </h3>
                  <BookingStatusBadge status={booking.status as BookingStatus} />
                </div>

                <div className="space-y-1 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="flex-shrink-0" />
                    <span className="truncate">{booking.invitee_name} ({booking.invitee_email})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="flex-shrink-0" />
                    <span>{formatSlotDate(booking.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="flex-shrink-0" />
                    <span>
                      {formatSlotTime(booking.start_time)} - {formatSlotTime(booking.end_time)}
                      {eventType && <span className="text-gray-400 ml-1">({getDurationLabel(eventType.duration)})</span>}
                    </span>
                  </div>
                  {eventType && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="flex-shrink-0" />
                      <span>{LOCATION_TYPE_LABELS[eventType.location_type as keyof typeof LOCATION_TYPE_LABELS] || eventType.location_type}</span>
                    </div>
                  )}
                </div>

                {booking.invitee_notes && (
                  <p className="mt-2 text-sm text-gray-500 italic bg-gray-50/70 rounded-lg p-2 border border-gray-100">
                    "{booking.invitee_notes}"
                  </p>
                )}
              </div>
            </div>

            {isActionable && (
              <div className="relative ml-3 flex-shrink-0" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-10 py-1 animate-[fadeIn_0.15s_ease-out]">
                    {booking.status === 'pending' && onConfirm && (
                      <button
                        onClick={() => { onConfirm(booking.id); setMenuOpen(false) }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-success-700 hover:bg-success-50 w-full text-left"
                      >
                        <Check size={14} /> Confirm
                      </button>
                    )}
                    {isPast && booking.status === 'confirmed' && onComplete && (
                      <button
                        onClick={() => { onComplete(booking.id); setMenuOpen(false) }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-success-700 hover:bg-success-50 w-full text-left"
                      >
                        <CheckCircle size={14} /> Mark Completed
                      </button>
                    )}
                    {isPast && booking.status === 'confirmed' && onNoShow && (
                      <button
                        onClick={() => { onNoShow(booking.id); setMenuOpen(false) }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-warning-700 hover:bg-warning-50 w-full text-left"
                      >
                        <AlertTriangle size={14} /> No Show
                      </button>
                    )}
                    {onCancel && (
                      <button
                        onClick={() => { onCancel(booking.id); setMenuOpen(false) }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <X size={14} /> Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
