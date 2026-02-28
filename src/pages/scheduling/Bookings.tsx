import { useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { useBookings } from '@/hooks/useBookings'
import BookingCard from '@/components/scheduling/BookingCard'

const TABS = [
  { id: 'upcoming', label: 'Upcoming', status: ['confirmed', 'pending'], upcoming: true },
  { id: 'unconfirmed', label: 'Unconfirmed', status: ['pending'], upcoming: true },
  { id: 'past', label: 'Past', status: ['confirmed', 'completed', 'no_show'], past: true },
  { id: 'cancelled', label: 'Cancelled', status: ['cancelled'], past: false },
] as const

export default function Bookings() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const tab = TABS.find((t) => t.id === activeTab) || TABS[0]

  const { bookings, loading, confirmBooking, cancelBooking, markNoShow, markCompleted } = useBookings({
    status: [...tab.status],
    upcoming: tab.id === 'upcoming' || tab.id === 'unconfirmed' ? true : undefined,
    past: tab.id === 'past' ? true : undefined,
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500 mt-1">Manage your scheduled meetings and appointments.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === t.id
                ? 'bg-white text-gray-900 font-semibold shadow-sm'
                : 'text-gray-500 hover:text-gray-700 font-medium'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <CalendarCheck size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No {activeTab} bookings
          </h3>
          <p className="text-gray-500 mt-1">
            {activeTab === 'upcoming'
              ? 'Your upcoming bookings will appear here.'
              : activeTab === 'unconfirmed'
              ? 'No bookings waiting for confirmation.'
              : activeTab === 'past'
              ? 'Past bookings will appear here.'
              : 'No cancelled bookings.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onConfirm={confirmBooking}
              onCancel={(id) => cancelBooking(id)}
              onNoShow={markNoShow}
              onComplete={markCompleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}
