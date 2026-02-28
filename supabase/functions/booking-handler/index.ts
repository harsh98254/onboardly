import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Extract and verify the authenticated user from the JWT in the Authorization header. */
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await supabaseAuth.auth.getUser()
  if (error || !user) return null
  return user
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, ...payload } = await req.json()

    switch (action) {
      case 'create': {
        const {
          event_type_id, invitee_name, invitee_email, invitee_timezone,
          invitee_notes, start_time, end_time, responses,
        } = payload

        // Fetch event type
        const { data: eventType, error: etError } = await supabase
          .from('event_types')
          .select('*')
          .eq('id', event_type_id)
          .eq('is_active', true)
          .single()

        if (etError || !eventType) {
          return new Response(
            JSON.stringify({ error: 'Event type not found or inactive' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check for double-booking (application-level check in addition to DB constraint)
        const { data: conflicts } = await supabase
          .from('bookings')
          .select('id')
          .eq('host_id', eventType.user_id)
          .in('status', ['confirmed', 'pending'])
          .lt('start_time', end_time)
          .gt('end_time', start_time)
          .limit(1)

        if (conflicts && conflicts.length > 0) {
          return new Response(
            JSON.stringify({ error: 'This time slot is no longer available' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create booking
        const status = eventType.requires_confirmation ? 'pending' : 'confirmed'
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            event_type_id,
            host_id: eventType.user_id,
            invitee_name,
            invitee_email,
            invitee_timezone: invitee_timezone || 'America/New_York',
            invitee_notes,
            start_time,
            end_time,
            status,
            responses: responses || {},
          })
          .select('*')
          .single()

        if (bookingError) throw bookingError

        // Create attendee records
        await supabase.from('booking_attendees').insert([
          {
            booking_id: booking.id,
            user_id: eventType.user_id,
            email: '',
            name: '',
            role: 'host',
            response_status: 'accepted',
          },
          {
            booking_id: booking.id,
            email: invitee_email,
            name: invitee_name,
            role: 'attendee',
            response_status: 'accepted',
          },
        ])

        // Trigger confirmation email (async, non-blocking)
        try {
          await supabase.functions.invoke('email-sender', {
            body: {
              type: 'booking_confirmation',
              booking_id: booking.id,
            },
          })
        } catch (emailErr) {
          console.error('Email send failed (non-blocking):', emailErr)
        }

        return new Response(
          JSON.stringify({ booking }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'cancel': {
        // Authenticated host cancellation — requires JWT
        const user = await getAuthenticatedUser(req)
        if (!user) {
          return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { booking_id, cancellation_reason } = payload

        const { data: booking, error } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_by: 'host',
            cancellation_reason,
          })
          .eq('id', booking_id)
          .eq('host_id', user.id) // Ensure the authenticated user is the host
          .in('status', ['confirmed', 'pending'])
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Booking not found or not authorized' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Trigger cancellation email
        try {
          await supabase.functions.invoke('email-sender', {
            body: { type: 'booking_cancellation', booking_id: booking.id },
          })
        } catch (emailErr) {
          console.error('Email send failed (non-blocking):', emailErr)
        }

        return new Response(
          JSON.stringify({ booking }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'cancel_by_uid': {
        // Invitee cancellation — uses booking uid as proof of identity (unguessable token)
        const { booking_uid, cancellation_reason } = payload

        if (!booking_uid || typeof booking_uid !== 'string') {
          return new Response(
            JSON.stringify({ error: 'booking_uid is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: booking, error } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_by: 'invitee',
            cancellation_reason,
          })
          .eq('uid', booking_uid)
          .in('status', ['confirmed', 'pending'])
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Booking not found or already cancelled' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Trigger cancellation email
        try {
          await supabase.functions.invoke('email-sender', {
            body: { type: 'booking_cancellation', booking_id: booking.id },
          })
        } catch (emailErr) {
          console.error('Email send failed (non-blocking):', emailErr)
        }

        return new Response(
          JSON.stringify({ booking }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'confirm': {
        // Authenticated host confirmation — requires JWT
        const user = await getAuthenticatedUser(req)
        if (!user) {
          return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { booking_id } = payload
        const { data: booking, error } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', booking_id)
          .eq('host_id', user.id) // Ensure the authenticated user is the host
          .eq('status', 'pending')
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Booking not found or not authorized' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ booking }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'lookup': {
        // Public booking lookup by uid (uid is an unguessable 64-bit token)
        const { booking_uid } = payload

        if (!booking_uid || typeof booking_uid !== 'string') {
          return new Response(
            JSON.stringify({ error: 'booking_uid is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: booking, error } = await supabase
          .from('bookings')
          .select('*, event_type:event_types(id, title, slug, duration, color, location_type), host:profiles!bookings_host_id_fkey(full_name, email, business_name)')
          .eq('uid', booking_uid)
          .single()

        if (error || !booking) {
          return new Response(
            JSON.stringify({ error: 'Booking not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ booking }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (err) {
    console.error('Booking handler error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
