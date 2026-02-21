import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { forgotPassword } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await forgotPassword(email)
    if (result.error) {
      setError(result.error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <CheckCircle2 size={48} className="mx-auto text-success-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 mb-6">We sent a password reset link to <strong>{email}</strong>.</p>
        <Link to="/login" className="text-primary-600 font-medium hover:underline">Back to sign in</Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Link to="/login" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft size={16} /> Back to sign in
      </Link>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reset password</h1>
        <p className="text-gray-500 mt-2">Enter your email and we'll send a reset link</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          {error && <p className="text-sm text-error-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            <Mail size={18} />
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  )
}
