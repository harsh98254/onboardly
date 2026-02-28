import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { TimeSlot } from '@/types'

export function useAvailableSlots(
  eventTypeId: string | undefined,
  date: string | undefined,
  timezone: string = 'America/New_York'
) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSlots = useCallback(async () => {
    if (!eventTypeId || !date) {
      setSlots([])
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('get_available_slots', {
          p_event_type_id: eventTypeId,
          p_date: date,
          p_timezone: timezone,
        })
      if (error) throw error
      setSlots(
        (data ?? []).map((row: { slot_start: string; slot_end: string }) => ({
          start: row.slot_start,
          end: row.slot_end,
        }))
      )
    } catch (err) {
      console.error('Failed to fetch available slots:', err)
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [eventTypeId, date, timezone])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  return { slots, loading, refetch: fetchSlots }
}
