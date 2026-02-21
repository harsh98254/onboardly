import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatRelativeTime } from '@/lib/utils'
import { STATUS_BADGE_STYLES, PROJECT_STATUS_LABELS } from '@/lib/constants'
import type { Project } from '@/types'
import { Plus, FolderOpen, Clock, Users, CheckCircle2, BarChart3 } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('projects')
      .select('*')
      .eq('designer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? [])
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  const stats = {
    total: projects.length,
    active: projects.filter((p) => ['onboarding', 'in_progress', 'review'].includes(p.status)).length,
    onboarding: projects.filter((p) => p.status === 'onboarding').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's your overview.</p>
        </div>
        <Link to="/projects/new"
          className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2 transition-colors">
          <Plus size={18} /> New project
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Projects', value: stats.total, icon: FolderOpen, color: 'text-gray-600' },
          { label: 'Active', value: stats.active, icon: BarChart3, color: 'text-primary-600' },
          { label: 'Onboarding', value: stats.onboarding, icon: Users, color: 'text-warning-600' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-success-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{stat.label}</span>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent projects</h2>
        <Link to="/projects" className="text-sm text-primary-600 hover:underline">View all</Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="text-gray-500 mt-1 mb-6">Create your first project to start onboarding a client.</p>
          <Link to="/projects/new"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700">
            <Plus size={18} /> New project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.slice(0, 10).map((project) => {
            const badge = STATUS_BADGE_STYLES[project.status]
            return (
              <Link key={project.id} to={`/projects/${project.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{project.client_name || project.client_email}</p>
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
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                  <Clock size={12} />
                  <span>{formatRelativeTime(project.created_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
