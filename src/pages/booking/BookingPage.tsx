import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, MapPin, Globe, ArrowLeft } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { usePublicEventType } from '@/hooks/useEventTypes'
import { useAvailableSlots } from '@/hooks/useAvailableSlots'
import { createPublicBooking } from '@/hooks/useBookings'
import { getDurationLabel, formatSlotDate } from '@/lib/utils'
import { LOCATION_TYPE_LABELS } from '@/lib/constants'
import DatePicker from '@/components/scheduling/DatePicker'
import SlotPicker from '@/components/scheduling/SlotPicker'
import TimezoneSelect from '@/components/scheduling/TimezoneSelect'
import type { TimeSlot } from '@/types'

type Step = 'select' | 'details' | 'submitting'

export default function BookingPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const navigate = useNavigate()
  const { eventType, host, loading } = usePublicEventType(username, slug)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  )
  const [step, setStep] = useState<Step>('select')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
  const { slots, loading: slotsLoading } = useAvailableSlots(eventType?.id, dateStr, timezone)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!eventType || !host) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Not Found</h1>
          <p className="text-gray-500">This booking page doesn't exist.</p>
        </div>
      </div>
    )
  }

  const hostInitials = (host.full_name || host.email)
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot || !eventType || !host) return
    setError('')
    setStep('submitting')

    try {
      const booking = await createPublicBooking({
        event_type_id: eventType.id,
        host_id: host.id,
        invitee_name: name,
        invitee_email: email,
        invitee_timezone: timezone,
        invitee_notes: notes,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        responses: {},
      })
      navigate(`/booking/confirmation/${booking.uid}`)
    } catch (err) {
      console.error('Booking failed:', err)
      setError('Failed to create booking. Please try again.')
      setStep('details')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-3xl w-full overflow-hidden animate-[scaleIn_0.3s_ease-out]">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Event info */}
          <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50/50">
            {step === 'details' && (
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                {hostInitials}
              </div>
              <div>
                <p className="text-sm text-gray-500">{host.full_name || host.email}</p>
                <h1 className="text-xl font-bold text-gray-900">{eventType.title}</h1>
              </div>
            </div>

            {eventType.description && (
              <p className="text-sm text-gray-600 mb-4">{eventType.description}</p>
            )}

            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Clock size={16} className="flex-shrink-0" />
                <span>{getDurationLabel(eventType.duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="flex-shrink-0" />
                <span>{LOCATION_TYPE_LABELS[eventType.location_type]}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={16} className="flex-shrink-0" />
                <span>{timezone.split('/').pop()?.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {selectedSlot && (
              <div className="mt-6 p-3 bg-primary-50 rounded-lg border border-primary-200 animate-[fadeInUp_0.3s_ease-out]">
                <p className="text-sm font-medium text-primary-700">
                  {formatSlotDate(selectedSlot.start, timezone)}
                </p>
                <p className="text-sm text-primary-600">
                  {new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })} - {new Date(selectedSlot.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })}
                </p>
              </div>
            )}
          </div>

          {/* Right: Date/time or form */}
          <div className="p-6 md:p-8">
            {step === 'select' ? (
              <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                <TimezoneSelect value={timezone} onChange={setTimezone} />

                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => { setSelectedDate(date); setSelectedSlot(null) }}
                  minDate={new Date()}
                  maxDate={addDays(new Date(), eventType.max_future_days)}
                />

                {selectedDate && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      {format(selectedDate, 'EEEE, MMMM d')}
                    </h3>
                    <SlotPicker
                      slots={slots}
                      selected={selectedSlot}
                      onSelect={(slot) => {
                        setSelectedSlot(slot)
                        setStep('details')
                      }}
                      timezone={timezone}
                      loading={slotsLoading}
                    />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 animate-[slideInRight_0.3s_ease-out]">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Your details</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Anything you'd like to share before the meeting"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow placeholder:text-gray-400"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={step === 'submitting'}
                  className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {step === 'submitting' ? 'Booking...' : 'Confirm Booking'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
