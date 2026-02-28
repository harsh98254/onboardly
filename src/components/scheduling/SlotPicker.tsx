import { useState } from 'react'
import { formatSlotTime } from '@/lib/utils'
import type { TimeSlot } from '@/types'

interface SlotPickerProps {
  slots: TimeSlot[]
  selected: TimeSlot | null
  onSelect: (slot: TimeSlot) => void
  timezone: string
  loading?: boolean
}

function getHour(isoString: string, tz: string): number {
  const date = new Date(isoString)
  const hour = parseInt(
    date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }),
    10
  )
  return hour
}

function groupSlotsByPeriod(slots: TimeSlot[], tz: string) {
  const morning: TimeSlot[] = []
  const afternoon: TimeSlot[] = []
  const evening: TimeSlot[] = []

  for (const slot of slots) {
    const hour = getHour(slot.start, tz)
    if (hour < 12) morning.push(slot)
    else if (hour < 17) afternoon.push(slot)
    else evening.push(slot)
  }

  return [
    { label: 'Morning', slots: morning },
    { label: 'Afternoon', slots: afternoon },
    { label: 'Evening', slots: evening },
  ].filter((g) => g.slots.length > 0)
}

export default function SlotPicker({ slots, selected, onSelect, timezone, loading }: SlotPickerProps) {
  const [pendingSlot, setPendingSlot] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No available times for this date
      </p>
    )
  }

  const groups = groupSlotsByPeriod(slots, timezone)

  function handleClick(slot: TimeSlot) {
    if (pendingSlot === slot.start) {
      // Second click — confirm
      setPendingSlot(null)
      onSelect(slot)
    } else {
      // First click — select
      setPendingSlot(slot.start)
    }
  }

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
      {groups.map((group) => (
        <div key={group.label}>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {group.label}
          </h4>
          <div className="space-y-1.5">
            {group.slots.map((slot) => {
              const isPending = pendingSlot === slot.start
              const isSelected = selected?.start === slot.start
              return (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => handleClick(slot)}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm font-medium transition-all text-center ${
                    isPending
                      ? 'bg-primary-600 border-primary-600 text-white animate-[pulseOnce_0.5s_ease-out]'
                      : isSelected
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-primary-200 text-primary-700 hover:bg-primary-50 hover:border-primary-300'
                  }`}
                >
                  {isPending ? 'Confirm?' : formatSlotTime(slot.start, timezone)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
