import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { CHECKLIST_TYPE_LABELS } from '@/lib/constants'
import type { Project, ChecklistItem, FormFieldConfig, PaymentConfig } from '@/types'
import {
  CheckCircle2, Circle, FileText, Upload, FileSignature, DollarSign,
  CheckSquare, AlertCircle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'

const typeIcons: Record<string, React.ReactNode> = {
  form: <FileText size={18} />, file: <Upload size={18} />, contract: <FileSignature size={18} />,
  payment: <DollarSign size={18} />, task: <CheckSquare size={18} />, approval: <AlertCircle size={18} />,
}

export default function ClientPortal() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [project, setProject] = useState<Project | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [submittingForm, setSubmittingForm] = useState(false)
  const [submittedForms, setSubmittedForms] = useState<Set<string>>(new Set())

  // File state
  const [uploading, setUploading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!projectId) return

    // Fetch project - require both ID and magic link token
    const { data: proj, error: projErr } = await supabase
      .from('projects').select('*')
      .eq('id', projectId)
      .eq('magic_link_token', token)
      .single()

    if (projErr || !proj) {
      setError('Project not found or invalid access link.')
      setLoading(false)
      return
    }

    setProject(proj)

    const { data: items } = await supabase
      .from('checklist_items').select('*').eq('project_id', projectId).order('sort_order')
    setChecklist(items ?? [])

    // Check existing form responses
    const { data: responses } = await supabase
      .from('form_responses').select('checklist_item_id').eq('project_id', projectId).not('submitted_at', 'is', null)
    const submitted = new Set((responses ?? []).map((r) => r.checklist_item_id))
    setSubmittedForms(submitted)

    // If project is still 'invited', update to 'onboarding'
    if (proj.status === 'invited') {
      await supabase.from('projects').update({ status: 'onboarding' }).eq('id', projectId)
      setProject({ ...proj, status: 'onboarding' })
    }

    setLoading(false)
  }, [projectId, token])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleFormSubmit(item: ChecklistItem) {
    if (!projectId) return
    setSubmittingForm(true)

    // Upsert form response
    await supabase.from('form_responses').upsert({
      project_id: projectId,
      checklist_item_id: item.id,
      responses: formData,
      is_draft: false,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'project_id,checklist_item_id' })

    // Mark checklist item complete
    await supabase.from('checklist_items').update({ is_completed: true, completed_at: new Date().toISOString() }).eq('id', item.id)
    setChecklist((prev) => prev.map((i) => i.id === item.id ? { ...i, is_completed: true } : i))
    setSubmittedForms((prev) => new Set([...prev, item.id]))
    setFormData({})
    setSubmittingForm(false)
    setExpandedItem(null)

    // Refresh progress
    const { data } = await supabase.from('projects').select('progress_percentage').eq('id', projectId).single()
    if (data && project) setProject({ ...project, progress_percentage: data.progress_percentage })
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, item: ChecklistItem) {
    const file = e.target.files?.[0]
    if (!file || !projectId) return
    setUploading(true)

    const filePath = `${projectId}/${Date.now()}_${file.name}`
    const { error: uploadErr } = await supabase.storage.from('onboardly-files').upload(filePath, file)
    if (uploadErr) {
      alert('Upload failed: ' + uploadErr.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('onboardly-files').getPublicUrl(filePath)

    await supabase.from('files').insert({
      project_id: projectId,
      checklist_item_id: item.id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id ?? projectId,
      category: item.type === 'contract' ? 'contract' : 'upload',
    })

    await supabase.from('checklist_items').update({ is_completed: true, completed_at: new Date().toISOString() }).eq('id', item.id)
    setChecklist((prev) => prev.map((i) => i.id === item.id ? { ...i, is_completed: true } : i))
    setUploading(false)

    const { data } = await supabase.from('projects').select('progress_percentage').eq('id', projectId).single()
    if (data && project) setProject({ ...project, progress_percentage: data.progress_percentage })
  }

  async function handleTaskToggle(item: ChecklistItem) {
    const newState = !item.is_completed
    await supabase.from('checklist_items').update({
      is_completed: newState,
      completed_at: newState ? new Date().toISOString() : null,
    }).eq('id', item.id)
    setChecklist((prev) => prev.map((i) => i.id === item.id ? { ...i, is_completed: newState } : i))

    const { data } = await supabase.from('projects').select('progress_percentage').eq('id', projectId!).single()
    if (data && project) setProject({ ...project, progress_percentage: data.progress_percentage })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <AlertCircle size={48} className="mx-auto text-error-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access denied</h2>
          <p className="text-gray-500">{error || 'Project not found.'}</p>
        </div>
      </div>
    )
  }

  const completedCount = checklist.filter((i) => i.is_completed).length
  const progress = project.progress_percentage

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-sm text-primary-600 font-semibold mb-1 uppercase tracking-wide">Onboardly</p>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        <p className="text-gray-500 mt-2">
          Welcome{project.client_name ? `, ${project.client_name}` : ''}! Complete the steps below to get started.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Your progress</span>
          <span className="font-semibold text-gray-900">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-primary-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">{completedCount} of {checklist.length} steps completed</p>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {checklist.map((item) => {
          const isExpanded = expandedItem === item.id
          const formConfig = item.config as unknown as FormFieldConfig | undefined
          const paymentConfig = item.config as unknown as PaymentConfig | undefined

          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition-colors">
                {item.is_completed
                  ? <CheckCircle2 size={24} className="text-success-600 flex-shrink-0" />
                  : <Circle size={24} className="text-gray-300 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${item.is_completed ? 'text-success-700' : 'text-gray-900'}`}>{item.title}</h3>
                  {item.description && <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>}
                </div>
                <span className="text-xs text-gray-400 mr-1">{CHECKLIST_TYPE_LABELS[item.type]}</span>
                <span className="text-gray-400">{typeIcons[item.type]}</span>
                {!item.is_completed && (isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />)}
              </button>

              {isExpanded && !item.is_completed && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  {/* Form type */}
                  {item.type === 'form' && formConfig?.fields && (
                    <div className="space-y-4">
                      {(formConfig.fields as FormFieldConfig['fields']).map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label} {field.required && <span className="text-error-500">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea value={formData[field.name] || ''} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              required={field.required} placeholder={field.placeholder} rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
                          ) : field.type === 'select' ? (
                            <select value={formData[field.name] || ''} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              required={field.required}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                              <option value="">Select...</option>
                              {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <input type={field.type} value={formData[field.name] || ''} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              required={field.required} placeholder={field.placeholder}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                          )}
                        </div>
                      ))}
                      <button onClick={() => handleFormSubmit(item)} disabled={submittingForm}
                        className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                        {submittingForm && <Loader2 size={16} className="animate-spin" />}
                        Submit form
                      </button>
                    </div>
                  )}

                  {/* File / Contract upload */}
                  {(item.type === 'file' || item.type === 'contract') && (
                    <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                      {uploading ? <Loader2 size={20} className="animate-spin text-primary-600" /> : <Upload size={20} className="text-gray-400" />}
                      <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Click or drag to upload a file'}</span>
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, item)} disabled={uploading} />
                    </label>
                  )}

                  {/* Payment */}
                  {item.type === 'payment' && (
                    <div>
                      {(paymentConfig?.amount ?? project.deposit_amount) ? (
                        <p className="text-gray-700 mb-3">
                          Amount due: <span className="font-semibold text-lg">{formatCurrency(paymentConfig?.amount || project.deposit_amount || 0)}</span>
                        </p>
                      ) : null}
                      <p className="text-sm text-gray-500">Payment integration coming soon. Your designer will mark this as complete once payment is received.</p>
                    </div>
                  )}

                  {/* Task */}
                  {item.type === 'task' && (
                    <button onClick={() => handleTaskToggle(item)}
                      className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 text-sm">
                      Mark as complete
                    </button>
                  )}

                  {/* Approval */}
                  {item.type === 'approval' && (
                    <p className="text-sm text-gray-500">Waiting for your designer to complete this step.</p>
                  )}
                </div>
              )}

              {/* Completed state */}
              {item.is_completed && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-success-600">
                    {item.type === 'form' && submittedForms.has(item.id) ? 'Form submitted' : 'Completed'} ✓
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* All done */}
      {progress === 100 && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-8 mt-6 text-center">
          <CheckCircle2 size={48} className="text-success-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-success-800">All done!</h3>
          <p className="text-success-600 mt-2">You've completed all onboarding steps. Your designer will be in touch soon.</p>
        </div>
      )}
    </div>
  )
}
