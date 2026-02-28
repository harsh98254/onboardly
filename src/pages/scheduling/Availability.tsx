import { useState, useEffect } from 'react'
import { Plus, Trash2, Star } from 'lucide-react'
import { useAvailability } from '@/hooks/useAvailability'
import AvailabilityEditor from '@/components/scheduling/AvailabilityEditor'

export default function Availability() {
  const { schedules, loading, createSchedule, updateSchedule, deleteSchedule, saveRules } = useAvailability()
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const activeSchedule = schedules.find((s) => s.id === activeScheduleId) || schedules[0] || null

  // Auto-select first schedule
  useEffect(() => {
    if (!activeScheduleId && schedules.length > 0) {
      setActiveScheduleId(schedules[0].id)
    }
  }, [activeScheduleId, schedules])

  async function handleCreate() {
    if (!newName.trim()) return
    const schedule = await createSchedule(newName.trim(), 'America/New_York')
    setActiveScheduleId(schedule.id)
    setNewName('')
    setCreating(false)
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
          <p className="text-gray-500 mt-1">Set your available hours for scheduling.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Schedule list sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {schedules.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                activeSchedule?.id === s.id
                  ? 'bg-primary-50 border-primary-300 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => setActiveScheduleId(s.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                  {s.is_default && <Star size={12} className="text-warning-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-400">{s.timezone.split('/').pop()?.replace(/_/g, ' ')}</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {!s.is_default && (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateSchedule(s.id, { is_default: true }) }}
                    className="p-1 rounded text-gray-400 hover:text-warning-500"
                    title="Set as default"
                  >
                    <Star size={14} />
                  </button>
                )}
                {schedules.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSchedule(s.id) }}
                    className="p-1 rounded text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {creating ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Schedule name"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 transition-shadow"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <button onClick={handleCreate} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 w-full p-3 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
            >
              <Plus size={16} /> New schedule
            </button>
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          {activeSchedule ? (
            <AvailabilityEditor
              schedule={activeSchedule}
              onSave={saveRules}
              onUpdateSchedule={updateSchedule}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Select or create a schedule to edit availability.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
