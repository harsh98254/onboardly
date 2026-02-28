// Scheduling status types
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'rescheduled' | 'no_show' | 'completed'
export type SchedulingType = 'individual' | 'round_robin' | 'collective'
export type LocationType = 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom' | 'none'
export type AvailabilityRuleType = 'weekly' | 'date_override'
export type BillingCycle = 'monthly' | 'annual'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'

// Subscription & billing
export interface SubscriptionTier {
  id: string
  slug: string
  name: string
  monthly_price: number
  annual_price: number
  stripe_monthly_price_id: string | null
  stripe_annual_price_id: string | null
  features: Record<string, boolean>
  limits: Record<string, number>
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  tier_id: string
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
  // Joined
  tier?: SubscriptionTier
}

// Availability
export interface AvailabilitySchedule {
  id: string
  user_id: string
  name: string
  timezone: string
  is_default: boolean
  created_at: string
  updated_at: string
  // Joined
  rules?: AvailabilityRule[]
}

export interface AvailabilityRule {
  id: string
  schedule_id: string
  rule_type: AvailabilityRuleType
  day_of_week: number | null
  specific_date: string | null
  start_time: string
  end_time: string
  is_available: boolean
  created_at: string
}

// Event types
export interface EventType {
  id: string
  user_id: string
  team_id: string | null
  title: string
  slug: string
  description: string | null
  duration: number
  scheduling_type: SchedulingType
  location_type: LocationType
  location_value: string | null
  color: string
  availability_schedule_id: string | null
  min_notice: number
  max_future_days: number
  slot_interval: number | null
  buffer_before: number
  buffer_after: number
  price: number | null
  currency: string | null
  requires_confirmation: boolean
  custom_questions: CustomQuestion[]
  is_active: boolean
  is_hidden: boolean
  project_id: string | null
  created_at: string
  updated_at: string
  // Joined
  user?: { full_name: string | null; email: string }
}

export interface CustomQuestion {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox'
  required: boolean
  options?: string[]
  placeholder?: string
}

// Bookings
export interface Booking {
  id: string
  uid: string
  event_type_id: string
  host_id: string
  invitee_name: string
  invitee_email: string
  invitee_timezone: string
  invitee_notes: string | null
  start_time: string
  end_time: string
  status: BookingStatus
  cancellation_reason: string | null
  cancelled_by: 'host' | 'invitee' | null
  rescheduled_from: string | null
  location: string | null
  meeting_url: string | null
  payment_status: 'pending' | 'paid' | 'refunded' | null
  payment_amount: number | null
  responses: Record<string, unknown>
  source: string
  project_id: string | null
  created_at: string
  updated_at: string
  // Joined
  event_type?: EventType
  host?: { full_name: string | null; email: string }
  attendees?: BookingAttendee[]
}

export interface BookingAttendee {
  id: string
  booking_id: string
  user_id: string | null
  email: string
  name: string
  role: 'host' | 'attendee' | 'optional'
  response_status: 'pending' | 'accepted' | 'declined' | 'tentative'
  created_at: string
}

// Slot types (from availability engine)
export interface TimeSlot {
  start: string
  end: string
}

// Form for creating/editing event types
export interface EventTypeFormData {
  title: string
  slug: string
  description: string
  duration: number
  scheduling_type: SchedulingType
  location_type: LocationType
  location_value: string
  color: string
  availability_schedule_id: string
  min_notice: number
  max_future_days: number
  slot_interval: number | null
  buffer_before: number
  buffer_after: number
  price: number | null
  currency: string
  requires_confirmation: boolean
  custom_questions: CustomQuestion[]
  is_active: boolean
  is_hidden: boolean
}

// Form for creating bookings
export interface BookingFormData {
  invitee_name: string
  invitee_email: string
  invitee_timezone: string
  invitee_notes: string
  start_time: string
  end_time: string
  responses: Record<string, unknown>
}
