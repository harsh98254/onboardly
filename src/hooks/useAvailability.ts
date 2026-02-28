import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { AvailabilitySchedule, AvailabilityRule } from '@/types'

export function useAvailability() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<AvailabilitySchedule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSchedules = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('availability_schedules')
        .select('*, rules:availability_rules(*)')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
      if (error) throw error
      setSchedules(data ?? [])
    } catch (err) {
      console.error('Failed to fetch availability:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const createSchedule = useCallback(
    async (name: string, timezone: string) => {
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('availability_schedules')
        .insert({ user_id: user.id, name, timezone })
        .select()
        .single()
      if (error) throw error
      await fetchSchedules()
      return data as AvailabilitySchedule
    },
    [user, fetchSchedules]
  )

  const updateSchedule = useCallback(
    async (id: string, updates: Partial<Pick<AvailabilitySchedule, 'name' | 'timezone' | 'is_default'>>) => {
      if (!user) throw new Error('Not authenticated')
      // If setting as default, unset others first
      if (updates.is_default) {
        await supabase
          .from('availability_schedules')
          .update({ is_default: false })
          .eq('user_id', user.id)
      }
      const { error } = await supabase
        .from('availability_schedules')
        .update(updates)
        .eq('id', id)
      if (error) throw error
      await fetchSchedules()
    },
    [user, fetchSchedules]
  )

  const deleteSchedule = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('availability_schedules')
        .delete()
        .eq('id', id)
      if (error) throw error
      setSchedules((prev) => prev.filter((s) => s.id !== id))
    },
    []
  )

  const saveRules = useCallback(
    async (scheduleId: string, rules: Omit<AvailabilityRule, 'id' | 'schedule_id' | 'created_at'>[]) => {
      // Delete existing rules and re-insert
      const { error: delError } = await supabase
        .from('availability_rules')
        .delete()
        .eq('schedule_id', scheduleId)
      if (delError) throw delError

      if (rules.length > 0) {
        const { error: insError } = await supabase
          .from('availability_rules')
          .insert(
            rules.map((r) => ({
              schedule_id: scheduleId,
              rule_type: r.rule_type,
              day_of_week: r.day_of_week,
              specific_date: r.specific_date,
              start_time: r.start_time,
              end_time: r.end_time,
              is_available: r.is_available,
            }))
          )
        if (insError) throw insError
      }
      await fetchSchedules()
    },
    [fetchSchedules]
  )

  const defaultSchedule = schedules.find((s) => s.is_default) ?? schedules[0] ?? null

  return {
    schedules,
    defaultSchedule,
    loading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    saveRules,
    refetch: fetchSchedules,
  }
}
