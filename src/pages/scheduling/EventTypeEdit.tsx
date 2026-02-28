import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import EventTypeForm from '@/components/scheduling/EventTypeForm'
import { useEventType, useEventTypes } from '@/hooks/useEventTypes'
import { useAvailability } from '@/hooks/useAvailability'
import type { EventTypeFormData } from '@/types'

export default function EventTypeEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { eventType, loading } = useEventType(id)
  const { updateEventType } = useEventTypes()
  const { schedules } = useAvailability()

  async function handleSubmit(data: EventTypeFormData) {
    if (!id) return
    await updateEventType(id, data)
    navigate('/scheduling/event-types')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!eventType) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Event type not found.</p>
        <Link to="/scheduling/event-types" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to event types
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/scheduling/event-types" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit: {eventType.title}</h1>
          <p className="text-gray-500 mt-1">Update your event type settings.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <EventTypeForm
          defaultValues={{
            title: eventType.title,
            slug: eventType.slug,
            description: eventType.description || '',
            duration: eventType.duration,
            scheduling_type: eventType.scheduling_type,
            location_type: eventType.location_type,
            location_value: eventType.location_value || '',
            color: eventType.color,
            availability_schedule_id: eventType.availability_schedule_id || '',
            min_notice: eventType.min_notice,
            max_future_days: eventType.max_future_days,
            slot_interval: eventType.slot_interval,
            buffer_before: eventType.buffer_before,
            buffer_after: eventType.buffer_after,
            price: eventType.price,
            currency: eventType.currency || 'USD',
            requires_confirmation: eventType.requires_confirmation,
            custom_questions: eventType.custom_questions,
            is_active: eventType.is_active,
            is_hidden: eventType.is_hidden,
          }}
          schedules={schedules}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
        />
      </div>
    </div>
  )
}
