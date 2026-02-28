import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Escape HTML special characters to prevent XSS in email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    const { type, booking_id } = await req.json()

    // Fetch booking with related data
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        event_type:event_types(title, duration, location_type, location_value),
        host:profiles!bookings_host_id_fkey(full_name, email, business_name)
      `)
      .eq('id', booking_id)
      .single()

    if (error || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Escape all user-provided values before interpolating into HTML
    const eventTitle = escapeHtml(booking.event_type?.title || 'Meeting')
    const hostName = escapeHtml(booking.host?.full_name || booking.host?.email || 'Host')
    const inviteeName = escapeHtml(booking.invitee_name || '')
    const cancellationReason = booking.cancellation_reason
      ? escapeHtml(booking.cancellation_reason)
      : ''

    const startTime = new Date(booking.start_time).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: booking.invitee_timezone,
    })

    let subject = ''
    let htmlBody = ''

    switch (type) {
      case 'booking_confirmation':
        subject = `Confirmed: ${eventTitle} with ${hostName}`
        htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #111827;">Booking Confirmed!</h2>
            <p>Hi ${inviteeName},</p>
            <p>Your booking has been confirmed.</p>
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0;"><strong>${eventTitle}</strong></p>
              <p style="margin: 0 0 4px 0; color: #6b7280;">With: ${hostName}</p>
              <p style="margin: 0 0 4px 0; color: #6b7280;">When: ${startTime}</p>
              <p style="margin: 0; color: #6b7280;">Duration: ${booking.event_type?.duration || 30} minutes</p>
            </div>
            ${booking.meeting_url ? `<p><a href="${encodeURI(booking.meeting_url)}" style="color: #4f46e5;">Join Meeting</a></p>` : ''}
            <p style="color: #9ca3af; font-size: 14px;">
              Need to make changes? <a href="${Deno.env.get('SITE_URL') || ''}/booking/cancel/${encodeURIComponent(booking.uid)}" style="color: #4f46e5;">Cancel or reschedule</a>
            </p>
          </div>
        `
        break

      case 'booking_cancellation':
        subject = `Cancelled: ${eventTitle} with ${hostName}`
        htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #111827;">Booking Cancelled</h2>
            <p>Hi ${inviteeName},</p>
            <p>Your booking has been cancelled.</p>
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0;"><strong>${eventTitle}</strong></p>
              <p style="margin: 0 0 4px 0; color: #6b7280;">Was scheduled: ${startTime}</p>
              ${cancellationReason ? `<p style="margin: 0; color: #6b7280;">Reason: ${cancellationReason}</p>` : ''}
            </div>
          </div>
        `
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Send via SendGrid if API key is configured
    if (sendgridApiKey) {
      const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@onboardly.app'
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: booking.invitee_email }] }],
          from: { email: fromEmail, name: 'Onboardly' },
          subject,
          content: [{ type: 'text/html', value: htmlBody }],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('SendGrid error:', errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to send email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      console.log('SendGrid not configured. Email would have been sent:')
      console.log(`  To: ${booking.invitee_email}`)
      console.log(`  Subject: ${subject}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Email sender error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
