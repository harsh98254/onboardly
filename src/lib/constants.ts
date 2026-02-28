import type { ProjectStatus, ProjectType, ChecklistItemType, BookingStatus, SchedulingType, LocationType } from '@/types'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  invited: 'Invited',
  onboarding: 'Onboarding',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
  archived: 'Archived',
}

export const STATUS_BADGE_STYLES: Record<ProjectStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  invited: { bg: 'bg-primary-100', text: 'text-primary-700' },
  onboarding: { bg: 'bg-warning-100', text: 'text-warning-700' },
  ready: { bg: 'bg-success-100', text: 'text-success-700' },
  in_progress: { bg: 'bg-purple-100', text: 'text-purple-700' },
  review: { bg: 'bg-orange-100', text: 'text-orange-700' },
  completed: { bg: 'bg-success-100', text: 'text-success-700' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500' },
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  website: 'Website Design',
  branding: 'Brand Identity',
  ui_ux: 'UI/UX Design',
  marketing: 'Marketing Design',
  other: 'Other',
}

export const CHECKLIST_TYPE_LABELS: Record<ChecklistItemType, string> = {
  form: 'Questionnaire',
  file: 'File Upload',
  contract: 'Contract',
  payment: 'Payment',
  task: 'Task',
  approval: 'Approval',
}

// Scheduling constants
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  no_show: 'No Show',
  completed: 'Completed',
}

export const BOOKING_STATUS_STYLES: Record<BookingStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500' },
  confirmed: { bg: 'bg-success-50', text: 'text-success-700', dot: 'bg-success-500' },
  cancelled: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
  rescheduled: { bg: 'bg-primary-50', text: 'text-primary-700', dot: 'bg-primary-500' },
  no_show: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  completed: { bg: 'bg-success-50', text: 'text-success-700', dot: 'bg-success-500' },
}

export const SCHEDULING_TYPE_LABELS: Record<SchedulingType, string> = {
  individual: 'One-on-One',
  round_robin: 'Round Robin',
  collective: 'Collective',
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  phone: 'Phone Call',
  in_person: 'In Person',
  custom: 'Custom',
  none: 'No Location',
}

export const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120]

export const EVENT_TYPE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

export const DEFAULT_CHECKLIST_ITEMS: Array<{ title: string; type: ChecklistItemType; description: string; config: Record<string, unknown> }> = [
  {
    title: 'Fill out project questionnaire',
    type: 'form',
    description: 'Help us understand your project needs',
    config: {
      fields: [
        { name: 'business_name', label: 'Business Name', type: 'text', required: true },
        { name: 'website', label: 'Current Website (if any)', type: 'url', required: false },
        { name: 'goals', label: 'Project Goals', type: 'textarea', required: true, placeholder: 'What do you want to achieve?' },
        { name: 'timeline', label: 'Timeline', type: 'text', required: false, placeholder: 'e.g. 4 weeks' },
        { name: 'budget', label: 'Budget Range', type: 'text', required: false, placeholder: 'e.g. $2,000 - $5,000' },
        { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
      ],
    },
  },
  {
    title: 'Upload brand assets',
    type: 'file',
    description: 'Upload your logo, brand guidelines, and any relevant files',
    config: { max_files: 10, max_size_mb: 50 },
  },
  {
    title: 'Sign contract',
    type: 'contract',
    description: 'Review and sign the project agreement',
    config: { provider: 'manual', description: 'Upload a signed copy of the contract' },
  },
  {
    title: 'Submit deposit payment',
    type: 'payment',
    description: 'Pay the project deposit to get started',
    config: { amount: 0, currency: 'USD' },
  },
]
