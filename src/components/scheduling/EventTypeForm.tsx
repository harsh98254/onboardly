import { useForm } from 'react-hook-form'
import { generateSlug, getDurationLabel } from '@/lib/utils'
import { DURATION_OPTIONS, EVENT_TYPE_COLORS, LOCATION_TYPE_LABELS } from '@/lib/constants'
import type { EventTypeFormData, LocationType, AvailabilitySchedule } from '@/types'

interface EventTypeFormProps {
  defaultValues?: Partial<EventTypeFormData>
  schedules: AvailabilitySchedule[]
  onSubmit: (data: EventTypeFormData) => Promise<void>
  submitLabel?: string
}

export default function EventTypeForm({ defaultValues, schedules, onSubmit, submitLabel = 'Save' }: EventTypeFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<EventTypeFormData>({
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      duration: 30,
      scheduling_type: 'individual',
      location_type: 'google_meet',
      location_value: '',
      color: '#6366f1',
      availability_schedule_id: schedules.find((s) => s.is_default)?.id ?? '',
      min_notice: 60,
      max_future_days: 60,
      slot_interval: null,
      buffer_before: 0,
      buffer_after: 0,
      price: null,
      currency: 'USD',
      requires_confirmation: false,
      custom_questions: [],
      is_active: true,
      is_hidden: false,
      ...defaultValues,
    },
  })

  const title = watch('title')
  const color = watch('color')
  const locationType = watch('location_type')
  const requiresConfirmation = watch('requires_confirmation')

  function handleTitleBlur() {
    if (!defaultValues?.slug && title) {
      setValue('slug', generateSlug(title))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Basic Info</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            {...register('title', { required: 'Title is required' })}
            onBlur={handleTitleBlur}
            placeholder="e.g. 30 Minute Meeting"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow placeholder:text-gray-400"
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <span>/book/you/</span>
            <input
              {...register('slug')}
              placeholder="30-minute-meeting"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow placeholder:text-gray-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="A brief description of your event"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow placeholder:text-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <div className="flex gap-2">
            {EVENT_TYPE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('color', c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-gray-900 scale-110 ring-2 ring-offset-1 ring-gray-300' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Duration & Location */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duration & Location</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setValue('duration', d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  watch('duration') === d
                    ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm ring-1 ring-primary-200'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {getDurationLabel(d)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <select
            {...register('location_type')}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
          >
            {(Object.entries(LOCATION_TYPE_LABELS) as [LocationType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {(locationType === 'phone' || locationType === 'in_person' || locationType === 'custom') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {locationType === 'phone' ? 'Phone Number' : locationType === 'in_person' ? 'Address' : 'Location Details'}
            </label>
            <input
              {...register('location_value')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow placeholder:text-gray-400"
            />
          </div>
        )}
      </div>

      {/* Availability & Limits */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scheduling</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Availability Schedule</label>
          <select
            {...register('availability_schedule_id')}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
          >
            <option value="">Use default schedule</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (Default)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Notice (minutes)</label>
            <input
              type="number"
              {...register('min_notice', { valueAsNumber: true })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Future (days)</label>
            <input
              type="number"
              {...register('max_future_days', { valueAsNumber: true })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Before (min)</label>
            <input
              type="number"
              {...register('buffer_before', { valueAsNumber: true })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buffer After (min)</label>
            <input
              type="number"
              {...register('buffer_after', { valueAsNumber: true })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="hidden" {...register('requires_confirmation')} />
          <button
            type="button"
            role="switch"
            aria-checked={requiresConfirmation}
            onClick={() => setValue('requires_confirmation', !requiresConfirmation)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${requiresConfirmation ? 'bg-primary-600' : 'bg-gray-200'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${requiresConfirmation ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
            />
          </button>
          <label className="text-sm text-gray-700 cursor-pointer" onClick={() => setValue('requires_confirmation', !requiresConfirmation)}>
            Require host confirmation before booking is confirmed
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
