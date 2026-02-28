import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, isBefore } from 'date-fns'

interface DatePickerProps {
  selected: Date | null
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  availableDates?: Set<string>
}

export default function DatePicker({ selected, onChange, minDate, maxDate, availableDates }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date())

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const result: Date[] = []
    let day = start
    while (day <= end) {
      result.push(day)
      day = addDays(day, 1)
    }
    return result
  }, [currentMonth])

  function isDisabled(date: Date) {
    if (minDate && isBefore(date, minDate) && !isSameDay(date, minDate)) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-xs uppercase font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const disabled = isDisabled(day) || !isSameMonth(day, currentMonth)
          const isSelected = selected && isSameDay(day, selected)
          const today = isToday(day)
          const dateKey = format(day, 'yyyy-MM-dd')
          const hasAvailability = availableDates ? availableDates.has(dateKey) : false

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onChange(day)}
              className={`
                w-full aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative
                ${disabled ? 'text-gray-300/60 cursor-not-allowed' : 'hover:bg-primary-50 cursor-pointer'}
                ${isSelected ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm' : ''}
                ${today && !isSelected ? 'font-bold text-primary-600 ring-1 ring-primary-200' : ''}
                ${!disabled && !isSelected && !today ? 'text-gray-700' : ''}
              `}
            >
              {format(day, 'd')}
              {hasAvailability && !isSelected && !disabled && (
                <span className="w-1 h-1 rounded-full bg-primary-500 absolute bottom-1" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
