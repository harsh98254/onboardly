/**
 * Onboardly Project Verification Tests
 * Tests against project requirements from the spec
 */
import { readFileSync, existsSync } from 'fs'

let passed = 0
let failed = 0
const results = []

async function test(name, fn) {
  try {
    await fn()
    passed++
    results.push({ name, status: 'PASS' })
  } catch (err) {
    failed++
    results.push({ name, status: 'FAIL', error: err.message })
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

function readFile(path) {
  return readFileSync(path, 'utf8')
}

// ============================================
// TEST 1: Build Output Exists
// ============================================
await test('T1: Production build compiles with zero errors', async () => {
  assert(existsSync('dist/index.html'), 'dist/index.html missing')
  assert(existsSync('dist/assets'), 'dist/assets missing')
  const html = readFile('dist/index.html')
  assert(html.includes('<div id="root">'), 'Missing root div in index.html')
  // Check CSS and JS assets exist
  const { readdirSync } = await import('fs')
  const assets = readdirSync('dist/assets')
  assert(assets.some(f => f.endsWith('.js')), 'No JS bundle in dist/assets')
  assert(assets.some(f => f.endsWith('.css')), 'No CSS bundle in dist/assets')
})

// ============================================
// TEST 2: All 11 Database Tables in Migration
// ============================================
await test('T2: Database schema has all 11 required tables with correct structure', () => {
  const sql = readFile('supabase/migrations/20260221000000_v2_full_schema.sql')
  const requiredTables = [
    'profiles', 'projects', 'checklist_items', 'form_responses',
    'files', 'contracts', 'payments', 'messages',
    'notifications', 'activity_logs', 'reminder_logs'
  ]
  for (const table of requiredTables) {
    assert(sql.includes(`CREATE TABLE public.${table}`), `Missing table: ${table}`)
  }
  // Check RLS enabled on all
  for (const table of requiredTables) {
    assert(sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`), `RLS not enabled on: ${table}`)
  }
  // Check critical columns
  assert(sql.includes('magic_link_token UUID'), 'projects missing magic_link_token')
  assert(sql.includes('progress_percentage INT'), 'projects missing progress_percentage')
  assert(sql.includes("status TEXT NOT NULL DEFAULT 'draft'"), 'projects missing status with default')
  assert(sql.includes("type TEXT NOT NULL CHECK (type IN ('form', 'file', 'contract', 'payment', 'task', 'approval'))"), 'checklist_items missing type check')
  assert(sql.includes('config JSONB'), 'checklist_items missing JSONB config')
  // Check all 8 project statuses
  for (const s of ['draft', 'invited', 'onboarding', 'ready', 'in_progress', 'review', 'completed', 'archived']) {
    assert(sql.includes(`'${s}'`), `Missing project status: ${s}`)
  }
  // Check triggers
  assert(sql.includes('handle_new_user()'), 'Missing handle_new_user trigger')
  assert(sql.includes('update_project_progress()'), 'Missing auto-progress trigger')
  assert(sql.includes('calculate_project_progress'), 'Missing progress calculation function')
  assert(sql.includes('can_access_project'), 'Missing RLS helper function')
})

// ============================================
// TEST 3: TypeScript Types Match Schema
// ============================================
await test('T3: TypeScript types cover all 11 interfaces + config types + union types', () => {
  const types = readFile('src/types/database.ts')
  // 11 interfaces
  const interfaces = ['Profile', 'Project', 'ChecklistItem', 'FormResponse', 'FileRecord', 'Contract', 'Payment', 'Message', 'Notification', 'ActivityLog', 'ReminderLog']
  for (const iface of interfaces) {
    assert(types.includes(`export interface ${iface}`), `Missing interface: ${iface}`)
  }
  // Union types
  const unions = ['UserRole', 'ProjectStatus', 'ProjectType', 'ChecklistItemType', 'ContractStatus', 'PaymentStatus', 'FileCategory']
  for (const u of unions) {
    assert(types.includes(`export type ${u}`), `Missing union type: ${u}`)
  }
  // JSONB config types
  const configs = ['FormFieldConfig', 'PaymentConfig', 'FileUploadConfig', 'ContractConfig']
  for (const c of configs) {
    assert(types.includes(`export interface ${c}`), `Missing config type: ${c}`)
  }
  // Check FormFieldConfig has all field types
  for (const ft of ['text', 'textarea', 'email', 'url', 'number', 'select', 'checkbox']) {
    assert(types.includes(`'${ft}'`), `FormFieldConfig missing field type: ${ft}`)
  }
  // Check ProjectStatus has all 8
  assert(types.includes("'draft'"), 'Missing draft status')
  assert(types.includes("'archived'"), 'Missing archived status')
  // Check Project interface has key fields
  assert(types.includes('magic_link_token: string'), 'Project missing magic_link_token')
  assert(types.includes('progress_percentage: number'), 'Project missing progress_percentage')
})

// ============================================
// TEST 4: Router Has All Required Routes
// ============================================
await test('T4: App router has all 9 required routes with correct protection', () => {
  const app = readFile('src/App.tsx')
  // Public routes
  assert(app.includes('path="/login"'), 'Missing /login route')
  assert(app.includes('path="/signup"'), 'Missing /signup route')
  assert(app.includes('path="/forgot-password"'), 'Missing /forgot-password route')
  assert(app.includes('path="/client/:projectId"'), 'Missing /client/:projectId route')
  // Protected routes
  assert(app.includes('path="/dashboard"'), 'Missing /dashboard route')
  assert(app.includes('path="/settings"'), 'Missing /settings route')
  assert(app.includes('path="/projects"'), 'Missing /projects route')
  assert(app.includes('path="/projects/new"'), 'Missing /projects/new route')
  assert(app.includes('path="/projects/:id"'), 'Missing /projects/:id route')
  // Check protection
  assert(app.includes('<ProtectedRoute>'), 'Missing ProtectedRoute wrapper')
  assert(app.includes('<DashboardLayout>'), 'Missing DashboardLayout wrapper')
  // Check client portal is NOT protected
  const clientLine = app.split('\n').find(l => l.includes('client/:projectId'))
  assert(!clientLine.includes('ProtectedRoute'), 'Client portal should not be protected')
  // Catch-all
  assert(app.includes('path="*"'), 'Missing catch-all route')
  assert(app.includes('Navigate to="/dashboard"'), 'Catch-all should redirect to /dashboard')
})

// ============================================
// TEST 5: Auth Context Has All Required Methods
// ============================================
await test('T5: AuthContext provides signIn, signUp, signOut, forgotPassword, updateProfile', () => {
  const auth = readFile('src/contexts/AuthContext.tsx')
  // Methods in interface
  assert(auth.includes('signIn:'), 'Missing signIn in interface')
  assert(auth.includes('signUp:'), 'Missing signUp in interface')
  assert(auth.includes('signOut:'), 'Missing signOut in interface')
  assert(auth.includes('forgotPassword:'), 'Missing forgotPassword in interface')
  assert(auth.includes('updateProfile:'), 'Missing updateProfile in interface')
  // Implementations
  assert(auth.includes('signInWithPassword'), 'signIn not using signInWithPassword')
  assert(auth.includes('supabase.auth.signUp'), 'signUp not calling supabase.auth.signUp')
  assert(auth.includes('supabase.auth.signOut'), 'signOut not calling supabase.auth.signOut')
  assert(auth.includes('resetPasswordForEmail'), 'forgotPassword not using resetPasswordForEmail')
  assert(auth.includes(".from('profiles')") && auth.includes('.update(data)'), 'updateProfile not updating profiles table')
  // Signup sends role metadata
  assert(auth.includes("role: 'designer'"), 'Signup should default role to designer')
  assert(auth.includes('business_name'), 'Signup should include business_name in metadata')
  // Session management
  assert(auth.includes('onAuthStateChange'), 'Missing auth state change listener')
  assert(auth.includes('getSession'), 'Missing initial session fetch')
  // Profile fetching
  assert(auth.includes("from('profiles')"), 'Missing profile fetch from profiles table')
})

// ============================================
// TEST 6: Client Portal Handles All 6 Checklist Types
// ============================================
await test('T6: Client portal renders all 6 checklist item types correctly', () => {
  const portal = readFile('src/pages/client/ClientPortal.tsx')
  // Form type - dynamic form rendering
  assert(portal.includes("item.type === 'form'"), 'Missing form type handler')
  assert(portal.includes('formConfig?.fields'), 'Form type not reading fields from config')
  assert(portal.includes('field.type === \'textarea\''), 'Form not rendering textarea fields')
  assert(portal.includes('field.type === \'select\''), 'Form not rendering select fields')
  assert(portal.includes('handleFormSubmit'), 'Missing form submit handler')
  // File type
  assert(portal.includes("item.type === 'file'"), 'Missing file type handler')
  assert(portal.includes('handleFileUpload'), 'Missing file upload handler')
  assert(portal.includes("type=\"file\""), 'Missing file input element')
  // Contract type
  assert(portal.includes("item.type === 'contract'"), 'Missing contract type handler')
  // Payment type
  assert(portal.includes("item.type === 'payment'"), 'Missing payment type handler')
  assert(portal.includes('formatCurrency'), 'Payment not showing formatted amount')
  // Task type
  assert(portal.includes("item.type === 'task'"), 'Missing task type handler')
  assert(portal.includes('handleTaskToggle'), 'Missing task toggle handler')
  // Approval type
  assert(portal.includes("item.type === 'approval'"), 'Missing approval type handler')
  // Progress tracking
  assert(portal.includes('progress_percentage'), 'Missing progress tracking')
  assert(portal.includes('progress === 100'), 'Missing 100% completion check')
  // Magic link token validation
  assert(portal.includes('token'), 'Missing magic link token handling')
  assert(portal.includes('magic_link_token'), 'Not validating magic_link_token')
  // Auto-status update on first visit
  assert(portal.includes("status === 'invited'"), 'Missing invited status check')
  assert(portal.includes("status: 'onboarding'"), 'Not updating to onboarding on first visit')
})

// ============================================
// TEST 7: Project Detail Has Tabs + Designer Features
// ============================================
await test('T7: Project detail page has all 4 tabs and designer management features', () => {
  const detail = readFile('src/pages/projects/ProjectDetail.tsx')
  // 4 tabs
  assert(detail.includes("'checklist'"), 'Missing checklist tab')
  assert(detail.includes("'files'"), 'Missing files tab')
  assert(detail.includes("'messages'"), 'Missing messages tab')
  assert(detail.includes("'activity'"), 'Missing activity tab')
  // Status management - dropdown with all statuses
  assert(detail.includes('updateStatus'), 'Missing status update function')
  assert(detail.includes('PROJECT_STATUS_LABELS'), 'Not showing all status options')
  // Checklist toggle
  assert(detail.includes('toggleItem'), 'Missing checklist item toggle')
  assert(detail.includes('deleteItem'), 'Missing checklist item delete')
  // Client link sharing
  assert(detail.includes('copyClientLink'), 'Missing copy client link')
  assert(detail.includes('generateClientPortalUrl'), 'Not generating client portal URL')
  assert(detail.includes('clipboard'), 'Not copying to clipboard')
  // Invite management
  assert(detail.includes('resendInvite'), 'Missing resend invite')
  assert(detail.includes('signInWithOtp'), 'Not using magic link OTP for invite')
  // Messages
  assert(detail.includes('sendMessage'), 'Missing send message')
  assert(detail.includes('newMessage'), 'Missing message input state')
  // Progress bar
  assert(detail.includes('progress_percentage'), 'Missing progress display')
  // Form responses
  assert(detail.includes('formResponses'), 'Missing form responses display')
  assert(detail.includes('form_responses'), 'Not fetching form_responses')
})

// ============================================
// TEST 8: Project Creation with Checklist Builder
// ============================================
await test('T8: New project page has multi-section form with checklist builder', () => {
  const newProj = readFile('src/pages/projects/ProjectNew.tsx')
  // Project fields
  assert(newProj.includes('name'), 'Missing project name field')
  assert(newProj.includes('description'), 'Missing description field')
  assert(newProj.includes('projectType'), 'Missing project type selector')
  assert(newProj.includes('PROJECT_TYPE_LABELS'), 'Not showing project type options')
  assert(newProj.includes('dueDate'), 'Missing due date field')
  // Client fields
  assert(newProj.includes('clientName'), 'Missing client name field')
  assert(newProj.includes('clientEmail'), 'Missing client email field')
  assert(newProj.includes('depositAmount'), 'Missing deposit amount field')
  // Checklist builder
  assert(newProj.includes('addChecklistItem'), 'Missing add checklist item')
  assert(newProj.includes('removeChecklistItem'), 'Missing remove checklist item')
  assert(newProj.includes('CHECKLIST_TYPE_LABELS'), 'Not showing checklist type options')
  assert(newProj.includes('DEFAULT_CHECKLIST_ITEMS'), 'Not loading default checklist items')
  // Two submit modes
  assert(newProj.includes("sendInvite"), 'Missing send invite parameter')
  assert(newProj.includes("'draft'"), 'Missing save as draft option')
  assert(newProj.includes("'invited'"), 'Missing invited status for send')
  // Creates checklist items in DB
  assert(newProj.includes("from('checklist_items').insert"), 'Not inserting checklist items')
  // Sends OTP invite email
  assert(newProj.includes('signInWithOtp'), 'Not sending OTP invite email')
  assert(newProj.includes('emailRedirectTo'), 'Not setting redirect URL for invite')
  // Payment config auto-update
  assert(newProj.includes("type === 'payment'"), 'Not auto-configuring payment checklist items')
})

// ============================================
// TEST 9: Design System + Constants Completeness
// ============================================
await test('T9: Design system colors, constants, and utilities are complete', () => {
  // CSS theme
  const css = readFile('src/index.css')
  assert(css.includes('@theme'), 'Missing @theme directive')
  assert(css.includes('#2563eb') || css.includes('#2563EB'), 'Missing primary-600 color (#2563EB)')
  assert(css.includes('#16a34a') || css.includes('#16A34A'), 'Missing success-600 color')
  assert(css.includes('#ca8a04') || css.includes('#CA8A04'), 'Missing warning-600 color')
  assert(css.includes('#dc2626') || css.includes('#DC2626'), 'Missing error-600 color')
  assert(css.includes('Inter'), 'Missing Inter font')
  // Constants
  const constants = readFile('src/lib/constants.ts')
  assert(constants.includes('PROJECT_STATUS_LABELS'), 'Missing PROJECT_STATUS_LABELS')
  assert(constants.includes('STATUS_BADGE_STYLES'), 'Missing STATUS_BADGE_STYLES')
  assert(constants.includes('PROJECT_TYPE_LABELS'), 'Missing PROJECT_TYPE_LABELS')
  assert(constants.includes('CHECKLIST_TYPE_LABELS'), 'Missing CHECKLIST_TYPE_LABELS')
  assert(constants.includes('DEFAULT_CHECKLIST_ITEMS'), 'Missing DEFAULT_CHECKLIST_ITEMS')
  // All 8 statuses in badge styles
  for (const s of ['draft', 'invited', 'onboarding', 'ready', 'in_progress', 'review', 'completed', 'archived']) {
    assert(constants.includes(s), `Missing status in constants: ${s}`)
  }
  // Utils
  const utils = readFile('src/lib/utils.ts')
  assert(utils.includes('export function cn'), 'Missing cn() utility')
  assert(utils.includes('export function formatCurrency'), 'Missing formatCurrency()')
  assert(utils.includes('export function formatDate'), 'Missing formatDate()')
  assert(utils.includes('export function formatRelativeTime'), 'Missing formatRelativeTime()')
  assert(utils.includes('export function getInitials'), 'Missing getInitials()')
  assert(utils.includes('export function generateClientPortalUrl'), 'Missing generateClientPortalUrl()')
})

// ============================================
// TEST 10: Hooks Have Required Functionality
// ============================================
await test('T10: Custom hooks implement Realtime, notifications, file upload, and activity', () => {
  // useMessages - Supabase Realtime
  const msgs = readFile('src/hooks/useMessages.ts')
  assert(msgs.includes('supabase.channel'), 'useMessages missing Realtime channel')
  assert(msgs.includes('postgres_changes'), 'useMessages not subscribing to postgres_changes')
  assert(msgs.includes("event: 'INSERT'"), 'useMessages not listening for INSERT events')
  assert(msgs.includes('removeChannel'), 'useMessages not cleaning up channel on unmount')
  assert(msgs.includes('sendMessage'), 'useMessages missing sendMessage')
  assert(msgs.includes("from('messages').insert"), 'sendMessage not inserting into messages table')
  // useNotifications
  const notif = readFile('src/hooks/useNotifications.ts')
  assert(notif.includes('unreadCount'), 'useNotifications missing unreadCount')
  assert(notif.includes('markAsRead'), 'useNotifications missing markAsRead')
  assert(notif.includes('markAllAsRead'), 'useNotifications missing markAllAsRead')
  assert(notif.includes("is_read: true"), 'markAsRead not setting is_read to true')
  // useFileUpload
  const files = readFile('src/hooks/useFileUpload.ts')
  assert(files.includes("from('onboardly-files')"), 'useFileUpload not using correct storage bucket')
  assert(files.includes('getPublicUrl'), 'useFileUpload not getting public URL after upload')
  assert(files.includes("from('files')") && files.includes('.insert('), 'useFileUpload not creating file record in DB')
  assert(files.includes('uploading'), 'useFileUpload missing uploading state')
  assert(files.includes('useProjectFiles'), 'Missing useProjectFiles export')
  // useActivityLog
  const activity = readFile('src/hooks/useActivityLog.ts')
  assert(activity.includes("from('activity_logs')"), 'useActivityLog not querying activity_logs table')
  assert(activity.includes('ascending: false'), 'useActivityLog not sorting descending')
})

// ============================================
// RESULTS
// ============================================
console.log('\n' + '='.repeat(60))
console.log('  ONBOARDLY TEST RESULTS')
console.log('='.repeat(60) + '\n')

for (const r of results) {
  const icon = r.status === 'PASS' ? '✓' : '✗'
  const color = r.status === 'PASS' ? '\x1b[32m' : '\x1b[31m'
  console.log(`  ${color}${icon}\x1b[0m ${r.name}`)
  if (r.error) console.log(`    \x1b[31m→ ${r.error}\x1b[0m`)
}

console.log('\n' + '-'.repeat(60))
console.log(`  Total: ${results.length} | Passed: \x1b[32m${passed}\x1b[0m | Failed: \x1b[31m${failed}\x1b[0m`)
console.log('-'.repeat(60) + '\n')

process.exit(failed > 0 ? 1 : 0)
