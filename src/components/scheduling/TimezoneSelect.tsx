import { Globe, ChevronDown } from 'lucide-react'

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
]

function formatTzLabel(tz: string) {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(now)
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value || ''
    const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz
    return `(${offset}) ${city}`
  } catch {
    return tz
  }
}

interface TimezoneSelectProps {
  value: string
  onChange: (tz: string) => void
  className?: string
}

export default function TimezoneSelect({ value, onChange, className = '' }: TimezoneSelectProps) {
  return (
    <div className={`relative ${className}`}>
      <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer transition-colors"
      >
        {COMMON_TIMEZONES.map((tz) => (
          <option key={tz} value={tz}>
            {formatTzLabel(tz)}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}
