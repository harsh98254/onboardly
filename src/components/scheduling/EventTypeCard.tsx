import { Link } from 'react-router-dom'
import { Clock, Copy, ExternalLink, MoreVertical, Eye, EyeOff, Trash2, Edit } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { getDurationLabel, getBookingUrl } from '@/lib/utils'
import { LOCATION_TYPE_LABELS } from '@/lib/constants'
import type { EventType } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

interface EventTypeCardProps {
  eventType: EventType
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
}

export default function EventTypeCard({ eventType, onToggle, onDelete }: EventTypeCardProps) {
  const { profile } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const username = profile?.email.split('@')[0] || ''
  const bookingUrl = getBookingUrl(username, eventType.slug)

  function handleCopyLink() {
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${!eventType.is_active ? 'opacity-60' : ''}`}>
      <div className="flex">
        <div
          className="w-1.5 flex-shrink-0 rounded-l-xl"
          style={{ backgroundColor: eventType.color }}
        />
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <Link to={`/scheduling/event-types/${eventType.id}`} className="text-base font-semibold text-gray-900 hover:text-primary-600 truncate block">
                {eventType.title}
              </Link>
              {eventType.description && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">{eventType.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-500">
                  <Clock size={12} />
                  {getDurationLabel(eventType.duration)}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-500">
                  {LOCATION_TYPE_LABELS[eventType.location_type]}
                </span>
                {!eventType.is_active && (
                  <span className="px-2 py-0.5 rounded-md bg-warning-50 text-xs text-warning-600 font-medium">Inactive</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Copy booking link"
              >
                {copied ? <span className="text-xs text-success-600">Copied!</span> : <Copy size={16} />}
              </button>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Preview booking page"
              >
                <ExternalLink size={16} />
              </a>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-10 py-1 animate-[fadeIn_0.15s_ease-out]">
                    <Link
                      to={`/scheduling/event-types/${eventType.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                    >
                      <Edit size={14} /> Edit
                    </Link>
                    <button
                      onClick={() => { onToggle(eventType.id, !eventType.is_active); setMenuOpen(false) }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      {eventType.is_active ? <><EyeOff size={14} /> Disable</> : <><Eye size={14} /> Enable</>}
                    </button>
                    <button
                      onClick={() => { onDelete(eventType.id); setMenuOpen(false) }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
