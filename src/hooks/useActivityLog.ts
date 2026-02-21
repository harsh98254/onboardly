import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ActivityLog } from '@/types'

export function useActivityLog(projectId: string) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setActivities(data ?? [])
    } catch (err) {
      console.error('Failed to fetch activity log:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return { activities, loading }
}
