export type Feature =
  | 'calendar_connections'
  | 'custom_branding'
  | 'team_scheduling'
  | 'workflows'
  | 'routing_forms'
  | 'webhooks'
  | 'sms_notifications'
  | 'managed_events'
  | 'api_access'
  | 'sso'
  | 'audit_logs'

export type ResourceLimit =
  | 'event_types'
  | 'bookings_per_month'
  | 'calendar_connections'
  | 'teams'
  | 'workflows'
  | 'routing_forms'
  | 'webhooks'

export const FEATURE_LABELS: Record<Feature, string> = {
  calendar_connections: 'Calendar Connections',
  custom_branding: 'Custom Branding',
  team_scheduling: 'Team Scheduling',
  workflows: 'Workflows',
  routing_forms: 'Routing Forms',
  webhooks: 'Webhooks',
  sms_notifications: 'SMS Notifications',
  managed_events: 'Managed Events',
  api_access: 'API Access',
  sso: 'SSO',
  audit_logs: 'Audit Logs',
}

export const LIMIT_LABELS: Record<ResourceLimit, string> = {
  event_types: 'Event Types',
  bookings_per_month: 'Bookings / Month',
  calendar_connections: 'Calendar Connections',
  teams: 'Teams',
  workflows: 'Workflows',
  routing_forms: 'Routing Forms',
  webhooks: 'Webhooks',
}

export function formatLimit(value: number): string {
  if (value === -1) return 'Unlimited'
  return String(value)
}
