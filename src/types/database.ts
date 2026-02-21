export type UserRole = 'designer' | 'client'
export type ProjectStatus = 'draft' | 'invited' | 'onboarding' | 'ready' | 'in_progress' | 'review' | 'completed' | 'archived'
export type ProjectType = 'website' | 'branding' | 'ui_ux' | 'marketing' | 'other'
export type ChecklistItemType = 'form' | 'file' | 'contract' | 'payment' | 'task' | 'approval'
export type ContractStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined'
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
export type FileCategory = 'upload' | 'deliverable' | 'contract' | 'other'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  business_name: string | null
  phone: string | null
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  designer_id: string
  client_id: string | null
  client_email: string
  client_name: string | null
  name: string
  description: string | null
  project_type: ProjectType | null
  status: ProjectStatus
  magic_link_token: string
  progress_percentage: number
  deposit_amount: number | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  project_id: string
  title: string
  description: string | null
  type: ChecklistItemType
  config: Record<string, unknown>
  is_required: boolean
  is_completed: boolean
  sort_order: number
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
}

export interface FormResponse {
  id: string
  project_id: string
  checklist_item_id: string
  responses: Record<string, unknown>
  is_draft: boolean
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface FileRecord {
  id: string
  project_id: string
  checklist_item_id: string | null
  file_name: string
  file_url: string
  file_path: string
  file_size: number | null
  file_type: string | null
  uploaded_by: string
  category: FileCategory
  created_at: string
}

export interface Contract {
  id: string
  project_id: string
  checklist_item_id: string | null
  provider: string
  external_id: string | null
  template_id: string | null
  status: ContractStatus
  signed_at: string | null
  document_url: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  project_id: string
  checklist_item_id: string | null
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  amount: number
  currency: string
  status: PaymentStatus
  description: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  project_id: string
  sender_id: string
  content: string
  is_read: boolean
  attachment_url: string | null
  attachment_name: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  project_id: string | null
  type: string
  title: string
  body: string | null
  is_read: boolean
  action_url: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  project_id: string
  user_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
}

export interface ReminderLog {
  id: string
  project_id: string
  checklist_item_id: string | null
  recipient_email: string
  type: string
  sent_at: string
}

// JSONB config types for checklist items
export interface FormFieldConfig {
  fields: Array<{
    name: string
    label: string
    type: 'text' | 'textarea' | 'email' | 'url' | 'number' | 'select' | 'checkbox'
    required?: boolean
    placeholder?: string
    options?: string[]
  }>
}

export interface PaymentConfig {
  amount: number
  currency?: string
  description?: string
}

export interface FileUploadConfig {
  accepted_types?: string[]
  max_files?: number
  max_size_mb?: number
}

export interface ContractConfig {
  template_id?: string
  provider?: 'manual'
  description?: string
}
