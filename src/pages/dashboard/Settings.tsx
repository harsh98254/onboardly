import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Save, User } from 'lucide-react'

export default function Settings() {
  const { profile, updateProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [businessName, setBusinessName] = useState(profile?.business_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await updateProfile({ full_name: fullName, business_name: businessName, phone })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500 mb-8">Manage your account and preferences.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
            <User size={20} className="text-primary-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-500">{profile?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
              <Save size={16} />
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-success-600">Changes saved!</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
