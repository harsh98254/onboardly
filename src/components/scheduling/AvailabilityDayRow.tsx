import { Plus, Trash2 } from 'lucide-react'
import { DAYS_OF_WEEK } from '@/lib/constants'

export interface TimeRange {
  start_time: string
  end_time: string
}

interface AvailabilityDayRowProps {
  dayOfWeek: number
  enabled: boolean
  ranges: TimeRange[]
  onToggle: (enabled: boolean) => void
  onAddRange: () => void
  onRemoveRange: (index: number) => void
  onChangeRange: (index: number, field: 'start_time' | 'end_time', value: string) => void
}

export default function AvailabilityDayRow({
  dayOfWeek,
  enabled,
  ranges,
  onToggle,
  onAddRange,
  onRemoveRange,
  onChangeRange,
}: AvailabilityDayRowProps) {
  const day = DAYS_OF_WEEK[dayOfWeek]

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="w-24 flex items-center gap-3 pt-1.5">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-primary-600' : 'bg-gray-200'}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
          />
        </button>
        <span className={`text-sm font-medium ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>
          {day.short}
        </span>
      </div>

      <div className="flex-1">
        {!enabled ? (
          <p className="text-sm text-gray-400 italic pt-1.5">Unavailable</p>
        ) : (
          <div className="space-y-2">
            {ranges.map((range, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="time"
                  value={range.start_time}
                  onChange={(e) => onChangeRange(idx, 'start_time', e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
                <span className="text-gray-400 text-sm">-</span>
                <input
                  type="time"
                  value={range.end_time}
                  onChange={(e) => onChangeRange(idx, 'end_time', e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
                {ranges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveRange(idx)}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={onAddRange}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus size={12} /> Add time range
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
