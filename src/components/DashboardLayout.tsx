import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, FolderOpen, Settings, LogOut, Menu, X,
  CalendarDays, CalendarCheck, Clock,
} from 'lucide-react'
import { useState } from 'react'
import { getInitials } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderOpen },
  { to: '/scheduling/event-types', label: 'Event Types', icon: CalendarDays },
  { to: '/scheduling/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/scheduling/availability', label: 'Availability', icon: Clock },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="sm:hidden text-gray-500">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">O</span>
              </div>
              <span className="text-lg font-bold text-gray-900">Onboardly</span>
            </Link>
          </div>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`
                }>
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-700">
                  {getInitials(profile.full_name || profile.email)}
                </span>
              </div>
            )}
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
                }`
              }>
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
