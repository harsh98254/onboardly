import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { event_type_id, start_date, end_date, timezone = 'America/New_York' } = await req.json()

    if (!event_type_id || !start_date || !end_date) {
      return new Response(
        JSON.stringify({ error: 'event_type_id, start_date, and end_date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Generate slots for each date in range
    const slots: { date: string; slots: { start: string; end: string }[] }[] = []
    const start = new Date(start_date)
    const end = new Date(end_date)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const { data, error } = await supabase
        .rpc('get_available_slots', {
          p_event_type_id: event_type_id,
          p_date: dateStr,
          p_timezone: timezone,
        })

      if (error) {
        console.error(`Error fetching slots for ${dateStr}:`, error)
        continue
      }

      if (data && data.length > 0) {
        slots.push({
          date: dateStr,
          slots: data.map((row: { slot_start: string; slot_end: string }) => ({
            start: row.slot_start,
            end: row.slot_end,
          })),
        })
      }
    }

    return new Response(
      JSON.stringify({ slots }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Availability engine error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
