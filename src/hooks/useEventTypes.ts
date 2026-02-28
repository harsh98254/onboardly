import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { EventType, EventTypeFormData } from '@/types'
import { generateSlug } from '@/lib/utils'

export function useEventTypes() {
  const { user } = useAuth()
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEventTypes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setEventTypes(data ?? [])
    } catch (err) {
      console.error('Failed to fetch event types:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchEventTypes()
  }, [fetchEventTypes])

  const createEventType = useCallback(
    async (formData: EventTypeFormData) => {
      if (!user) throw new Error('Not authenticated')
      const slug = formData.slug || generateSlug(formData.title)
      const { data, error } = await supabase
        .from('event_types')
        .insert({
          user_id: user.id,
          ...formData,
          slug,
        })
        .select()
        .single()
      if (error) throw error
      setEventTypes((prev) => [data, ...prev])
      return data as EventType
    },
    [user]
  )

  const updateEventType = useCallback(
    async (id: string, updates: Partial<EventTypeFormData>) => {
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('event_types')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error
      setEventTypes((prev) => prev.map((et) => (et.id === id ? data : et)))
      return data as EventType
    },
    [user]
  )

  const deleteEventType = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('event_types')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
      setEventTypes((prev) => prev.filter((et) => et.id !== id))
    },
    [user]
  )

  const toggleEventType = useCallback(
    async (id: string, isActive: boolean) => {
      return updateEventType(id, { is_active: isActive } as Partial<EventTypeFormData>)
    },
    [updateEventType]
  )

  return { eventTypes, loading, createEventType, updateEventType, deleteEventType, toggleEventType, refetch: fetchEventTypes }
}

export function useEventType(id: string | undefined) {
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    supabase
      .from('event_types')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Failed to fetch event type:', error)
        setEventType(data)
        setLoading(false)
      })
  }, [id])

  return { eventType, loading }
}

export function usePublicEventType(username: string | undefined, slug: string | undefined) {
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [host, setHost] = useState<{ id: string; full_name: string | null; email: string; business_name: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username || !slug) { setLoading(false); return }

    async function fetch() {
      // Find user by email prefix or business_name slug
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, business_name')
        .or(`email.ilike.${username}@%,full_name.ilike.%${username}%`)
        .limit(1)
        .single()

      if (!profile) { setLoading(false); return }

      setHost(profile)

      const { data: et } = await supabase
        .from('event_types')
        .select('*')
        .eq('user_id', profile.id)
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      setEventType(et)
      setLoading(false)
    }

    fetch()
  }, [username, slug])

  return { eventType, host, loading }
}
