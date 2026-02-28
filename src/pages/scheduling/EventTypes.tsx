import { Link } from 'react-router-dom'
import { Plus, CalendarDays } from 'lucide-react'
import { useEventTypes } from '@/hooks/useEventTypes'
import EventTypeCard from '@/components/scheduling/EventTypeCard'

export default function EventTypes() {
  const { eventTypes, loading, toggleEventType, deleteEventType } = useEventTypes()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Types</h1>
          <p className="text-gray-500 mt-1">Create and manage your scheduling events.</p>
        </div>
        <Link
          to="/scheduling/event-types/new"
          className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 hover:shadow-md flex items-center gap-2 transition-all"
        >
          <Plus size={18} /> New event type
        </Link>
      </div>

      {eventTypes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No event types yet</h3>
          <p className="text-gray-500 mt-1 mb-6">Create your first event type so people can book time with you.</p>
          <Link
            to="/scheduling/event-types/new"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 hover:shadow-md transition-all"
          >
            <Plus size={18} /> New event type
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {eventTypes.map((et, index) => (
            <div
              key={et.id}
              className="animate-[fadeInUp_0.3s_ease-out_both]"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <EventTypeCard
                eventType={et}
                onToggle={toggleEventType}
                onDelete={deleteEventType}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
