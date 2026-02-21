import type { ProjectStatus, ProjectType, ChecklistItemType } from '@/types'

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
