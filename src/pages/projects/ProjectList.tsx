import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatRelativeTime } from '@/lib/utils'
import { STATUS_BADGE_STYLES, PROJECT_STATUS_LABELS } from '@/lib/constants'
import type { Project, ProjectStatus } from '@/types'
import { Plus, Search, FolderOpen, Clock } from 'lucide-react'

export default function ProjectList() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')

  useEffect(() => {
    if (!user) return
    supabase
      .from('projects')
      .select('*')
      .eq('designer_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? [])
        setLoading(false)
      })
  }, [user])

  const filtered = projects.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.client_name?.toLowerCase().includes(search.toLowerCase())) || p.client_email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Link to="/projects/new"
          className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2 transition-colors">
          <Plus size={18} /> New project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search projects or clients..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white">
          <option value="all">All statuses</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-4">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">{search || statusFilter !== 'all' ? 'No matching projects' : 'No projects yet'}</h3>
          <p className="text-gray-500 mt-1">{search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first project to get started.'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((project) => {
            const badge = STATUS_BADGE_STYLES[project.status]
            return (
              <Link key={project.id} to={`/projects/${project.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{project.client_name || project.client_email}</p>
                    {project.description && <p className="text-sm text-gray-400 mt-1 line-clamp-1">{project.description}</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text} ml-3 flex-shrink-0`}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-primary-600 h-1.5 rounded-full transition-all" style={{ width: `${project.progress_percentage}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{project.progress_percentage}%</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={12} />{formatRelativeTime(project.updated_at)}</span>
                  {project.due_date && <span>Due {new Date(project.due_date).toLocaleDateString()}</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
