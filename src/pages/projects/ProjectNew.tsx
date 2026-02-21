import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_CHECKLIST_ITEMS, PROJECT_TYPE_LABELS, CHECKLIST_TYPE_LABELS } from '@/lib/constants'
import type { ProjectType, ChecklistItemType } from '@/types'
import { ArrowLeft, Send, Plus, Trash2, GripVertical, Save } from 'lucide-react'

interface ChecklistDraft {
  title: string
  type: ChecklistItemType
  description: string
  config: Record<string, unknown>
}

export default function ProjectNew() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('website')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [checklist, setChecklist] = useState<ChecklistDraft[]>(
    DEFAULT_CHECKLIST_ITEMS.map((item) => ({ ...item }))
  )

  function addChecklistItem() {
    setChecklist([...checklist, { title: '', type: 'task', description: '', config: {} }])
  }

  function removeChecklistItem(index: number) {
    setChecklist(checklist.filter((_, i) => i !== index))
  }

  function updateChecklistItem(index: number, field: keyof ChecklistDraft, value: unknown) {
    setChecklist(checklist.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(e: React.FormEvent, sendInvite: boolean) {
    e.preventDefault()
    if (!user) return
    setError('')
    setLoading(true)

    const deposit = depositAmount ? parseFloat(depositAmount) : null

    // Update payment config with deposit amount
    const finalChecklist = checklist.map((item) => {
      if (item.type === 'payment' && deposit) {
        return { ...item, config: { ...item.config, amount: deposit, currency: 'USD' } }
      }
      return item
    })

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        designer_id: user.id,
        name,
        description: description || null,
        project_type: projectType,
        client_name: clientName,
        client_email: clientEmail,
        deposit_amount: deposit,
        due_date: dueDate || null,
        status: sendInvite ? 'invited' : 'draft',
      })
      .select()
      .single()

    if (projectError || !project) {
      setError(projectError?.message ?? 'Failed to create project')
      setLoading(false)
      return
    }

    // Create checklist items
    const items = finalChecklist.filter((i) => i.title.trim()).map((item, index) => ({
      project_id: project.id,
      title: item.title,
      description: item.description || null,
      type: item.type,
      config: item.config,
      sort_order: index,
    }))

    if (items.length > 0) {
      const { error: clError } = await supabase.from('checklist_items').insert(items)
      if (clError) {
        setError(clError.message)
        setLoading(false)
        return
      }
    }

    // Send invite if requested
    if (sendInvite) {
      await supabase.auth.signInWithOtp({
        email: clientEmail,
        options: {
          data: { full_name: clientName, role: 'client' },
          emailRedirectTo: `${window.location.origin}/client/${project.id}?token=${project.magic_link_token}`,
        },
      })
    }

    navigate(`/projects/${project.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft size={16} /> Back to projects
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">New project</h1>
      <p className="text-gray-500 mb-8">Set up a project and invite your client.</p>

      <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
        {/* Project info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Project details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Website Redesign"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project type</label>
              <select value={projectType} onChange={(e) => setProjectType(e.target.value as ProjectType)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief project description..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
            </div>
          </div>
        </div>

        {/* Client info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Client information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client name *</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder="John Smith"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client email *</label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required placeholder="client@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit amount ($)</label>
              <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} min="0" step="0.01" placeholder="500.00"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>
          </div>
        </div>

        {/* Checklist builder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Onboarding checklist</h2>
            <button type="button" onClick={addChecklistItem}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              <Plus size={16} /> Add item
            </button>
          </div>
          <div className="space-y-3">
            {checklist.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <GripVertical size={16} className="text-gray-300 mt-2.5 flex-shrink-0 cursor-grab" />
                <div className="flex-1 space-y-3">
                  <div className="flex gap-3">
                    <input type="text" value={item.title} onChange={(e) => updateChecklistItem(index, 'title', e.target.value)}
                      placeholder="Item title" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                    <select value={item.type} onChange={(e) => updateChecklistItem(index, 'type', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                      {Object.entries(CHECKLIST_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <input type="text" value={item.description} onChange={(e) => updateChecklistItem(index, 'description', e.target.value)}
                    placeholder="Description (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <button type="button" onClick={() => removeChecklistItem(index)} className="text-gray-300 hover:text-error-500 mt-2.5">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-error-600">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)} disabled={loading || !name || !clientEmail}
            className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-colors">
            <Save size={16} /> Save as draft
          </button>
          <button type="submit" disabled={loading || !name || !clientName || !clientEmail}
            className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            <Send size={18} />
            {loading ? 'Creating...' : 'Create & invite client'}
          </button>
        </div>
      </form>
    </div>
  )
}
