import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import EventTypeForm from '@/components/scheduling/EventTypeForm'
import { useEventTypes } from '@/hooks/useEventTypes'
import { useAvailability } from '@/hooks/useAvailability'
import type { EventTypeFormData } from '@/types'

export default function EventTypeNew() {
  const navigate = useNavigate()
  const { createEventType } = useEventTypes()
  const { schedules } = useAvailability()

  async function handleSubmit(data: EventTypeFormData) {
    await createEventType(data)
    navigate('/scheduling/event-types')
  }

  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/scheduling/event-types" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Event Type</h1>
          <p className="text-gray-500 mt-1">Create a new booking event for your calendar.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <EventTypeForm
          schedules={schedules}
          onSubmit={handleSubmit}
          submitLabel="Create event type"
        />
      </div>
    </div>
  )
}
