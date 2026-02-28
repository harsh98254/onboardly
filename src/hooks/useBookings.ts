import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Booking, BookingFormData } from '@/types'

interface BookingFilters {
  status?: string[]
  upcoming?: boolean
  past?: boolean
  limit?: number
}

export function useBookings(filters?: BookingFilters) {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchBookings = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let query = supabase
        .from('bookings')
        .select('*, event_type:event_types(id, title, slug, duration, color, location_type)')
        .eq('host_id', user.id)

      if (filters?.status?.length) {
        query = query.in('status', filters.status)
      }

      const now = new Date().toISOString()
      if (filters?.upcoming) {
        query = query.gte('start_time', now).order('start_time', { ascending: true })
      } else if (filters?.past) {
        query = query.lt('start_time', now).order('start_time', { ascending: false })
      } else {
        query = query.order('start_time', { ascending: false })
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query
      if (error) throw error
      setBookings(data ?? [])
    } catch (err) {
      console.error('Failed to fetch bookings:', err)
    } finally {
      setLoading(false)
    }
  }, [user, filters?.status, filters?.upcoming, filters?.past, filters?.limit])

  useEffect(() => {
    if (!user) return
    fetchBookings()

    // Realtime subscription for bookings
    const channel = supabase
      .channel(`bookings:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `host_id=eq.${user.id}`,
        },
        () => {
          // Refetch on any change to keep joined data fresh
          fetchBookings()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, fetchBookings])

  const updateBookingStatus = useCallback(
    async (bookingId: string, status: string, extra?: Record<string, unknown>) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('bookings')
        .update({ status, ...extra })
        .eq('id', bookingId)
        .eq('host_id', user.id)
      if (error) throw error
    },
    [user]
  )

  const confirmBooking = useCallback(
    (bookingId: string) => updateBookingStatus(bookingId, 'confirmed'),
    [updateBookingStatus]
  )

  const cancelBooking = useCallback(
    (bookingId: string, reason?: string) =>
      updateBookingStatus(bookingId, 'cancelled', {
        cancellation_reason: reason,
        cancelled_by: 'host',
      }),
    [updateBookingStatus]
  )

  const markNoShow = useCallback(
    (bookingId: string) => updateBookingStatus(bookingId, 'no_show'),
    [updateBookingStatus]
  )

  const markCompleted = useCallback(
    (bookingId: string) => updateBookingStatus(bookingId, 'completed'),
    [updateBookingStatus]
  )

  return {
    bookings,
    loading,
    confirmBooking,
    cancelBooking,
    markNoShow,
    markCompleted,
    refetch: fetchBookings,
  }
}

// Public booking creation via edge function (no auth required)
export async function createPublicBooking(data: BookingFormData & { event_type_id: string; host_id?: string }) {
  const { data: result, error } = await supabase.functions.invoke('booking-handler', {
    body: {
      action: 'create',
      event_type_id: data.event_type_id,
      invitee_name: data.invitee_name,
      invitee_email: data.invitee_email,
      invitee_timezone: data.invitee_timezone,
      invitee_notes: data.invitee_notes,
      start_time: data.start_time,
      end_time: data.end_time,
      responses: data.responses,
    },
  })

  if (error) throw error
  if (result?.error) throw new Error(result.error)
  return result.booking as Booking
}

// Fetch booking by UID via edge function (public, uid is unguessable token)
export async function fetchBookingByUid(uid: string) {
  const { data: result, error } = await supabase.functions.invoke('booking-handler', {
    body: { action: 'lookup', booking_uid: uid },
  })

  if (error) throw error
  if (result?.error) throw new Error(result.error)
  return result.booking as Booking & { host: { full_name: string; email: string; business_name: string } }
}

// Cancel booking by UID via edge function (invitee cancellation, public)
export async function cancelBookingByUid(uid: string, reason?: string) {
  const { data: result, error } = await supabase.functions.invoke('booking-handler', {
    body: {
      action: 'cancel_by_uid',
      booking_uid: uid,
      cancellation_reason: reason || null,
    },
  })

  if (error) throw error
  if (result?.error) throw new Error(result.error)
  return result.booking as Booking
}
