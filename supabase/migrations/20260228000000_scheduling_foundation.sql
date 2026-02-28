-- ============================================================================
-- Scheduling Foundation Migration
-- Adds: subscription_tiers, user_subscriptions, availability_schedules,
--        availability_rules, event_types, bookings, booking_attendees
-- ============================================================================

-- Required for the exclusion constraint on bookings (prevents double-booking at DB level)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =========================
-- 1. SUBSCRIPTION TIERS
-- =========================
CREATE TABLE public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  annual_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_subscription_tiers_updated_at
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default tiers
INSERT INTO public.subscription_tiers (slug, name, monthly_price, annual_price, features, limits, sort_order) VALUES
  ('free', 'Free', 0, 0,
    '{"calendar_connections": true, "custom_branding": false, "team_scheduling": false, "workflows": false, "routing_forms": false, "webhooks": false, "sms_notifications": false, "managed_events": false, "api_access": false, "sso": false, "audit_logs": false}'::jsonb,
    '{"event_types": 3, "bookings_per_month": 100, "calendar_connections": 1, "teams": 0, "workflows": 0, "routing_forms": 0, "webhooks": 0}'::jsonb,
    0),
  ('teams', 'Teams', 15, 144,
    '{"calendar_connections": true, "custom_branding": true, "team_scheduling": true, "workflows": true, "routing_forms": true, "webhooks": true, "sms_notifications": false, "managed_events": false, "api_access": false, "sso": false, "audit_logs": false}'::jsonb,
    '{"event_types": 10, "bookings_per_month": 500, "calendar_connections": 3, "teams": 3, "workflows": 5, "routing_forms": 3, "webhooks": 3}'::jsonb,
    1),
  ('orgs', 'Organizations', 37, 360,
    '{"calendar_connections": true, "custom_branding": true, "team_scheduling": true, "workflows": true, "routing_forms": true, "webhooks": true, "sms_notifications": true, "managed_events": true, "api_access": true, "sso": false, "audit_logs": false}'::jsonb,
    '{"event_types": -1, "bookings_per_month": -1, "calendar_connections": 5, "teams": -1, "workflows": 20, "routing_forms": -1, "webhooks": 10}'::jsonb,
    2),
  ('enterprise', 'Enterprise', 0, 0,
    '{"calendar_connections": true, "custom_branding": true, "team_scheduling": true, "workflows": true, "routing_forms": true, "webhooks": true, "sms_notifications": true, "managed_events": true, "api_access": true, "sso": true, "audit_logs": true}'::jsonb,
    '{"event_types": -1, "bookings_per_month": -1, "calendar_connections": -1, "teams": -1, "workflows": -1, "routing_forms": -1, "webhooks": -1}'::jsonb,
    3);

-- =========================
-- 2. USER SUBSCRIPTIONS
-- =========================
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.subscription_tiers(id),
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================
-- 3. AVAILABILITY SCHEDULES
-- =========================
CREATE TABLE public.availability_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Working Hours',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_availability_schedules_user_id ON public.availability_schedules(user_id);

CREATE TRIGGER update_availability_schedules_updated_at
  BEFORE UPDATE ON public.availability_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================
-- 4. AVAILABILITY RULES
-- =========================
CREATE TABLE public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.availability_schedules(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL DEFAULT 'weekly' CHECK (rule_type IN ('weekly', 'date_override')),
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_rule_type CHECK (
    (rule_type = 'weekly' AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (rule_type = 'date_override' AND specific_date IS NOT NULL AND day_of_week IS NULL)
  )
);

CREATE INDEX idx_availability_rules_schedule_id ON public.availability_rules(schedule_id);

-- =========================
-- 5. EVENT TYPES
-- =========================
CREATE TABLE public.event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  duration INT NOT NULL DEFAULT 30,
  scheduling_type TEXT NOT NULL DEFAULT 'individual' CHECK (scheduling_type IN ('individual', 'round_robin', 'collective')),
  location_type TEXT NOT NULL DEFAULT 'google_meet' CHECK (location_type IN ('google_meet', 'zoom', 'phone', 'in_person', 'custom', 'none')),
  location_value TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  availability_schedule_id UUID REFERENCES public.availability_schedules(id) ON DELETE SET NULL,
  min_notice INT NOT NULL DEFAULT 60,
  max_future_days INT NOT NULL DEFAULT 60,
  slot_interval INT,
  buffer_before INT NOT NULL DEFAULT 0,
  buffer_after INT NOT NULL DEFAULT 0,
  price NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  requires_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  custom_questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE INDEX idx_event_types_user_id ON public.event_types(user_id);
CREATE INDEX idx_event_types_slug ON public.event_types(slug);
CREATE INDEX idx_event_types_is_active ON public.event_types(is_active);

CREATE TRIGGER update_event_types_updated_at
  BEFORE UPDATE ON public.event_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================
-- 6. BOOKINGS
-- =========================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  event_type_id UUID NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  invitee_notes TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'rescheduled', 'no_show', 'completed')),
  cancellation_reason TEXT,
  cancelled_by TEXT CHECK (cancelled_by IS NULL OR cancelled_by IN ('host', 'invitee')),
  rescheduled_from UUID REFERENCES public.bookings(id),
  location TEXT,
  meeting_url TEXT,
  payment_status TEXT CHECK (payment_status IS NULL OR payment_status IN ('pending', 'paid', 'refunded')),
  payment_amount NUMERIC(10, 2),
  responses JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'booking_page',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_event_type_id ON public.bookings(event_type_id);
CREATE INDEX idx_bookings_host_id ON public.bookings(host_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX idx_bookings_uid ON public.bookings(uid);
CREATE INDEX idx_bookings_invitee_email ON public.bookings(invitee_email);

-- Prevent double-booking at database level (requires btree_gist extension)
-- Only active bookings (confirmed/pending) participate in the constraint
ALTER TABLE public.bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    host_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status IN ('confirmed', 'pending'));

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================
-- 7. BOOKING ATTENDEES
-- =========================
CREATE TABLE public.booking_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN ('host', 'attendee', 'optional')),
  response_status TEXT NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_attendees_booking_id ON public.booking_attendees(booking_id);

-- =========================
-- HELPER FUNCTIONS
-- =========================

-- Get user's tier features as JSONB
CREATE OR REPLACE FUNCTION public.get_user_tier_features(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT t.features
     FROM public.subscription_tiers t
     JOIN public.user_subscriptions s ON s.tier_id = t.id
     WHERE s.user_id = p_user_id AND s.status = 'active'
     LIMIT 1),
    (SELECT features FROM public.subscription_tiers WHERE slug = 'free'),
    '{}'::jsonb
  );
$$;

-- Check if user has a specific feature
CREATE OR REPLACE FUNCTION public.user_has_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (public.get_user_tier_features(p_user_id) ->> p_feature)::boolean,
    FALSE
  );
$$;

-- Get user's tier limits as JSONB
CREATE OR REPLACE FUNCTION public.get_user_tier_limits(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT t.limits
     FROM public.subscription_tiers t
     JOIN public.user_subscriptions s ON s.tier_id = t.id
     WHERE s.user_id = p_user_id AND s.status = 'active'
     LIMIT 1),
    (SELECT limits FROM public.subscription_tiers WHERE slug = 'free'),
    '{}'::jsonb
  );
$$;

-- Check if user is within a tier limit (-1 = unlimited)
CREATE OR REPLACE FUNCTION public.check_tier_limit(p_user_id UUID, p_resource TEXT, p_current_count INT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN (public.get_user_tier_limits(p_user_id) ->> p_resource)::int = -1 THEN TRUE
    WHEN p_current_count < (public.get_user_tier_limits(p_user_id) ->> p_resource)::int THEN TRUE
    ELSE FALSE
  END;
$$;

-- Get available slots for an event type on a given date
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_event_type_id UUID,
  p_date DATE,
  p_timezone TEXT DEFAULT 'America/New_York'
)
RETURNS TABLE (slot_start TIMESTAMPTZ, slot_end TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_event public.event_types%ROWTYPE;
  v_schedule_id UUID;
  v_duration INT;
  v_interval INT;
  v_buffer_before INT;
  v_buffer_after INT;
  v_day_of_week INT;
  v_now TIMESTAMPTZ;
BEGIN
  -- Fetch event type
  SELECT * INTO v_event FROM public.event_types WHERE id = p_event_type_id AND is_active = TRUE;
  IF NOT FOUND THEN RETURN; END IF;

  v_duration := v_event.duration;
  v_interval := COALESCE(v_event.slot_interval, v_event.duration);
  v_buffer_before := v_event.buffer_before;
  v_buffer_after := v_event.buffer_after;
  v_schedule_id := v_event.availability_schedule_id;
  v_now := NOW();
  v_day_of_week := EXTRACT(DOW FROM p_date);

  -- If no schedule assigned, use user's default
  IF v_schedule_id IS NULL THEN
    SELECT id INTO v_schedule_id
    FROM public.availability_schedules
    WHERE user_id = v_event.user_id AND is_default = TRUE
    LIMIT 1;
  END IF;

  IF v_schedule_id IS NULL THEN RETURN; END IF;

  -- Generate candidate slots from availability rules
  RETURN QUERY
  WITH availability AS (
    -- Check date overrides first
    SELECT ar.start_time, ar.end_time, ar.is_available
    FROM public.availability_rules ar
    WHERE ar.schedule_id = v_schedule_id
      AND ar.rule_type = 'date_override'
      AND ar.specific_date = p_date
    UNION ALL
    -- Fall back to weekly rules if no overrides
    SELECT ar.start_time, ar.end_time, ar.is_available
    FROM public.availability_rules ar
    WHERE ar.schedule_id = v_schedule_id
      AND ar.rule_type = 'weekly'
      AND ar.day_of_week = v_day_of_week
      AND NOT EXISTS (
        SELECT 1 FROM public.availability_rules ao
        WHERE ao.schedule_id = v_schedule_id
          AND ao.rule_type = 'date_override'
          AND ao.specific_date = p_date
      )
  ),
  available_windows AS (
    SELECT a.start_time AS win_start, a.end_time AS win_end
    FROM availability a
    WHERE a.is_available = TRUE
  ),
  candidate_slots AS (
    SELECT
      (p_date + gs.t)::timestamp AT TIME ZONE
        (SELECT timezone FROM public.availability_schedules WHERE id = v_schedule_id)
        AS s_start,
      (p_date + gs.t + (v_duration || ' minutes')::interval)::timestamp AT TIME ZONE
        (SELECT timezone FROM public.availability_schedules WHERE id = v_schedule_id)
        AS s_end
    FROM available_windows aw,
    LATERAL generate_series(
      aw.win_start,
      aw.win_end - (v_duration || ' minutes')::interval,
      (v_interval || ' minutes')::interval
    ) AS gs(t)
  ),
  booked AS (
    SELECT
      b.start_time - (v_buffer_before || ' minutes')::interval AS busy_start,
      b.end_time + (v_buffer_after || ' minutes')::interval AS busy_end
    FROM public.bookings b
    WHERE b.host_id = v_event.user_id
      AND b.status IN ('confirmed', 'pending')
      AND b.start_time::date = p_date
  )
  SELECT cs.s_start, cs.s_end
  FROM candidate_slots cs
  WHERE cs.s_start >= v_now + (v_event.min_notice || ' minutes')::interval
    AND cs.s_start::date <= CURRENT_DATE + v_event.max_future_days
    AND NOT EXISTS (
      SELECT 1 FROM booked bk
      WHERE cs.s_start < bk.busy_end AND cs.s_end > bk.busy_start
    )
  ORDER BY cs.s_start;
END;
$$;

-- =========================
-- ROW LEVEL SECURITY
-- =========================

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_attendees ENABLE ROW LEVEL SECURITY;

-- Subscription tiers: public read
CREATE POLICY "Anyone can view active tiers"
  ON public.subscription_tiers FOR SELECT
  USING (is_active = TRUE);

-- User subscriptions: read-only for users, writes only via service role (triggers/edge functions)
CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Availability schedules: owner CRUD
CREATE POLICY "Users can view own schedules"
  ON public.availability_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
  ON public.availability_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.availability_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON public.availability_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- Availability rules: via schedule ownership
CREATE POLICY "Users can view own schedule rules"
  ON public.availability_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules s
      WHERE s.id = schedule_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own schedule rules"
  ON public.availability_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.availability_schedules s
      WHERE s.id = schedule_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own schedule rules"
  ON public.availability_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules s
      WHERE s.id = schedule_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own schedule rules"
  ON public.availability_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules s
      WHERE s.id = schedule_id AND s.user_id = auth.uid()
    )
  );

-- Event types: public read for active, owner CRUD
CREATE POLICY "Anyone can view active event types"
  ON public.event_types FOR SELECT
  USING (is_active = TRUE AND is_hidden = FALSE);

CREATE POLICY "Owners can view all own event types"
  ON public.event_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own event types"
  ON public.event_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event types"
  ON public.event_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own event types"
  ON public.event_types FOR DELETE
  USING (auth.uid() = user_id);

-- Bookings: only via edge function (service role), host CRUD
-- No public INSERT — all booking creation goes through the booking-handler edge function
-- which uses the service role key and performs validation (conflict check, active event, etc.)

CREATE POLICY "Hosts can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can update own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = host_id);

-- Booking attendees: only via service role (edge functions), hosts can read
CREATE POLICY "Hosts can view booking attendees"
  ON public.booking_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.host_id = auth.uid()
    )
  );

-- =========================
-- Auto-assign free tier to new users
-- =========================
CREATE OR REPLACE FUNCTION public.assign_free_tier()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, tier_id)
  SELECT NEW.id, t.id
  FROM public.subscription_tiers t
  WHERE t.slug = 'free'
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_assign_tier
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION assign_free_tier();

-- =========================
-- Default availability schedule for new users
-- =========================
CREATE OR REPLACE FUNCTION public.create_default_availability()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_schedule_id UUID;
BEGIN
  -- Create default schedule
  INSERT INTO public.availability_schedules (user_id, name, timezone, is_default)
  VALUES (NEW.id, 'Working Hours', 'America/New_York', TRUE)
  RETURNING id INTO v_schedule_id;

  -- Add Mon-Fri 9am-5pm
  INSERT INTO public.availability_rules (schedule_id, rule_type, day_of_week, start_time, end_time)
  VALUES
    (v_schedule_id, 'weekly', 1, '09:00', '17:00'),
    (v_schedule_id, 'weekly', 2, '09:00', '17:00'),
    (v_schedule_id, 'weekly', 3, '09:00', '17:00'),
    (v_schedule_id, 'weekly', 4, '09:00', '17:00'),
    (v_schedule_id, 'weekly', 5, '09:00', '17:00');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_default_availability
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_availability();
