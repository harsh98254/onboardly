import { useState, useEffect, useCallback } from 'react'
import AvailabilityDayRow, { type TimeRange } from './AvailabilityDayRow'
import TimezoneSelect from './TimezoneSelect'
import type { AvailabilitySchedule, AvailabilityRule } from '@/types'

interface DayState {
  enabled: boolean
  ranges: TimeRange[]
}

interface AvailabilityEditorProps {
  schedule: AvailabilitySchedule
  onSave: (scheduleId: string, rules: Omit<AvailabilityRule, 'id' | 'schedule_id' | 'created_at'>[]) => Promise<void>
  onUpdateSchedule: (id: string, updates: Partial<Pick<AvailabilitySchedule, 'name' | 'timezone'>>) => Promise<void>
}

const DEFAULT_RANGE: TimeRange = { start_time: '09:00', end_time: '17:00' }

function buildDayStates(rules: AvailabilityRule[] | undefined): Record<number, DayState> {
  const states: Record<number, DayState> = {}
  for (let i = 0; i < 7; i++) {
    states[i] = { enabled: false, ranges: [] }
  }

  if (!rules) return states

  for (const rule of rules) {
    if (rule.rule_type !== 'weekly' || rule.day_of_week === null) continue
    const day = rule.day_of_week
    if (rule.is_available) {
      states[day].enabled = true
      states[day].ranges.push({
        start_time: rule.start_time.slice(0, 5),
        end_time: rule.end_time.slice(0, 5),
      })
    }
  }

  // Ensure enabled days have at least one range
  for (let i = 0; i < 7; i++) {
    if (states[i].enabled && states[i].ranges.length === 0) {
      states[i].ranges = [{ ...DEFAULT_RANGE }]
    }
  }

  return states
}

export default function AvailabilityEditor({ schedule, onSave, onUpdateSchedule }: AvailabilityEditorProps) {
  const [dayStates, setDayStates] = useState<Record<number, DayState>>(() => buildDayStates(schedule.rules))
  const [timezone, setTimezone] = useState(schedule.timezone)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDayStates(buildDayStates(schedule.rules))
    setTimezone(schedule.timezone)
  }, [schedule])

  const handleToggle = useCallback((day: number, enabled: boolean) => {
    setDayStates((prev) => ({
      ...prev,
      [day]: {
        enabled,
        ranges: enabled && prev[day].ranges.length === 0 ? [{ ...DEFAULT_RANGE }] : prev[day].ranges,
      },
    }))
  }, [])

  const handleAddRange = useCallback((day: number) => {
    setDayStates((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        ranges: [...prev[day].ranges, { ...DEFAULT_RANGE }],
      },
    }))
  }, [])

  const handleRemoveRange = useCallback((day: number, index: number) => {
    setDayStates((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        ranges: prev[day].ranges.filter((_, i) => i !== index),
      },
    }))
  }, [])

  const handleChangeRange = useCallback((day: number, index: number, field: 'start_time' | 'end_time', value: string) => {
    setDayStates((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        ranges: prev[day].ranges.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
      },
    }))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      // Build rules from day states
      const rules: Omit<AvailabilityRule, 'id' | 'schedule_id' | 'created_at'>[] = []
      for (let day = 0; day < 7; day++) {
        const state = dayStates[day]
        if (state.enabled) {
          for (const range of state.ranges) {
            rules.push({
              rule_type: 'weekly',
              day_of_week: day,
              specific_date: null,
              start_time: range.start_time,
              end_time: range.end_time,
              is_available: true,
            })
          }
        }
      }

      if (timezone !== schedule.timezone) {
        await onUpdateSchedule(schedule.id, { timezone })
      }
      await onSave(schedule.id, rules)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
        <TimezoneSelect value={timezone} onChange={setTimezone} className="max-w-xs" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Weekly Hours</h3>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <AvailabilityDayRow
            key={day}
            dayOfWeek={day}
            enabled={dayStates[day].enabled}
            ranges={dayStates[day].ranges}
            onToggle={(enabled) => handleToggle(day, enabled)}
            onAddRange={() => handleAddRange(day)}
            onRemoveRange={(idx) => handleRemoveRange(day, idx)}
            onChangeRange={(idx, field, val) => handleChangeRange(day, idx, field, val)}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving...' : 'Save availability'}
        </button>
      </div>
    </div>
  )
}
