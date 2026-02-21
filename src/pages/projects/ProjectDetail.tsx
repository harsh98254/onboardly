import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatRelativeTime, formatCurrency, generateClientPortalUrl } from '@/lib/utils'
import { STATUS_BADGE_STYLES, PROJECT_STATUS_LABELS, CHECKLIST_TYPE_LABELS } from '@/lib/constants'
import type { Project, ChecklistItem, FileRecord, FormResponse, Message, ActivityLog, ProjectStatus } from '@/types'
import {
  ArrowLeft, CheckCircle2, Circle, FileText, Upload, FileSignature,
  DollarSign, Copy, ExternalLink, Trash2, Send, Clock,
  CheckSquare, AlertCircle
} from 'lucide-react'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [formResponses, setFormResponses] = useState<FormResponse[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'checklist' | 'files' | 'messages' | 'activity'>('checklist')
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    const [projectRes, checklistRes, filesRes, formRes, msgRes, actRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('checklist_items').select('*').eq('project_id', id).order('sort_order'),
      supabase.from('files').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('form_responses').select('*').eq('project_id', id),
      supabase.from('messages').select('*').eq('project_id', id).order('created_at'),
      supabase.from('activity_logs').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(20),
    ])
    setProject(projectRes.data)
    setChecklist(checklistRes.data ?? [])
    setFiles(filesRes.data ?? [])
    setFormResponses(formRes.data ?? [])
    setMessages(msgRes.data ?? [])
    setActivities(actRes.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function toggleItem(item: ChecklistItem) {
    const newState = !item.is_completed
    await supabase.from('checklist_items').update({
      is_completed: newState,
      completed_at: newState ? new Date().toISOString() : null,
      completed_by: newState ? user?.id : null,
    }).eq('id', item.id)
    setChecklist((prev) => prev.map((i) => i.id === item.id ? { ...i, is_completed: newState, completed_at: newState ? new Date().toISOString() : null } : i))
    // Refresh project for updated progress
    const { data } = await supabase.from('projects').select('progress_percentage, status').eq('id', id!).single()
    if (data && project) setProject({ ...project, progress_percentage: data.progress_percentage, status: data.status })
  }

  async function deleteItem(itemId: string) {
    await supabase.from('checklist_items').delete().eq('id', itemId)
    setChecklist((prev) => prev.filter((i) => i.id !== itemId))
  }

  async function updateStatus(status: ProjectStatus) {
    if (!project) return
    await supabase.from('projects').update({ status }).eq('id', project.id)
    setProject({ ...project, status })
  }

  async function sendMessage() {
    if (!newMessage.trim() || !user || !id) return
    setSendingMessage(true)
    const { data } = await supabase.from('messages').insert({
      project_id: id,
      sender_id: user.id,
      content: newMessage.trim(),
    }).select().single()
    if (data) setMessages((prev) => [...prev, data])
    setNewMessage('')
    setSendingMessage(false)
  }

  async function resendInvite() {
    if (!project) return
    await supabase.auth.signInWithOtp({
      email: project.client_email,
      options: {
        data: { full_name: project.client_name, role: 'client' },
        emailRedirectTo: `${window.location.origin}/client/${project.id}?token=${project.magic_link_token}`,
      },
    })
    if (project.status === 'draft') {
      await updateStatus('invited')
    }
  }

  function copyClientLink() {
    if (!project) return
    navigator.clipboard.writeText(generateClientPortalUrl(project.id, project.magic_link_token))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
  }

  if (!project) {
    return <div className="text-center py-20 text-gray-500">Project not found</div>
  }

  const badge = STATUS_BADGE_STYLES[project.status]
  const typeIcons: Record<string, React.ReactNode> = {
    form: <FileText size={16} />, file: <Upload size={16} />, contract: <FileSignature size={16} />,
    payment: <DollarSign size={16} />, task: <CheckSquare size={16} />, approval: <AlertCircle size={16} />,
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft size={16} /> Back to projects
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500 mt-1">Client: {project.client_name || project.client_email}</p>
            {project.description && <p className="text-gray-400 text-sm mt-2">{project.description}</p>}
          </div>
          <select value={project.status} onChange={(e) => updateStatus(e.target.value as ProjectStatus)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border-0 outline-none cursor-pointer ${badge.bg} ${badge.text}`}>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-600">Onboarding progress</span>
            <span className="font-medium text-gray-900">{project.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full transition-all duration-500" style={{ width: `${project.progress_percentage}%` }} />
          </div>
        </div>

        {/* Meta & actions */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button onClick={copyClientLink}
            className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg font-medium">
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy client link'}
          </button>
          <button onClick={resendInvite}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
            <Send size={14} /> {project.status === 'draft' ? 'Send invite' : 'Resend invite'}
          </button>
          <a href={`/client/${project.id}?token=${project.magic_link_token}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700">
            <ExternalLink size={14} /> Preview portal
          </a>
          {project.due_date && (
            <span className="flex items-center gap-1 text-gray-400 ml-auto"><Clock size={14} /> Due {formatDate(project.due_date)}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {(['checklist', 'files', 'messages', 'activity'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab} {tab === 'messages' && messages.length > 0 ? `(${messages.length})` : ''}
          </button>
        ))}
      </div>

      {/* Checklist tab */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Checklist</h2>
            <span className="text-sm text-gray-500">{checklist.filter((i) => i.is_completed).length}/{checklist.length} completed</span>
          </div>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.id} className={`flex items-center justify-between p-4 rounded-lg border ${item.is_completed ? 'bg-success-50 border-success-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleItem(item)} className="flex-shrink-0">
                    {item.is_completed ? <CheckCircle2 size={22} className="text-success-600" /> : <Circle size={22} className="text-gray-300" />}
                  </button>
                  <div>
                    <span className={`font-medium ${item.is_completed ? 'text-success-700 line-through' : 'text-gray-700'}`}>{item.title}</span>
                    {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                  </div>
                  <span className="text-gray-400">{typeIcons[item.type]}</span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{CHECKLIST_TYPE_LABELS[item.type]}</span>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-error-500"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Files ({files.length})</h2>
          {files.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No files uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-700 font-medium">{file.file_name}</span>
                    {file.file_size && <span className="text-xs text-gray-400 ml-2">{(file.file_size / 1024 / 1024).toFixed(1)} MB</span>}
                  </div>
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline font-medium">Download</a>
                </div>
              ))}
            </div>
          )}
          {/* Form responses */}
          {formResponses.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Form Responses</h3>
              {formResponses.map((resp) => (
                <div key={resp.id} className="bg-gray-50 rounded-lg p-4 mb-2">
                  {Object.entries(resp.responses).map(([key, val]) => (
                    <div key={key} className="mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">{key.replace(/_/g, ' ')}</span>
                      <p className="text-sm text-gray-700">{String(val)}</p>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 mt-2">{resp.submitted_at ? `Submitted ${formatRelativeTime(resp.submitted_at)}` : 'Draft'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages tab */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No messages yet. Start the conversation.</p>
            ) : messages.map((msg) => (
              <div key={msg.id} className={`p-3 rounded-lg ${msg.sender_id === user?.id ? 'bg-primary-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                <p className="text-sm text-gray-700">{msg.content}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(msg.created_at)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..." className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            <button onClick={sendMessage} disabled={!newMessage.trim() || sendingMessage}
              className="bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
          {activities.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700">{act.action}</p>
                    <p className="text-xs text-gray-400">{formatRelativeTime(act.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deposit info */}
      {project.deposit_amount && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Deposit</h2>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(project.deposit_amount)}</p>
        </div>
      )}
    </div>
  )
}
