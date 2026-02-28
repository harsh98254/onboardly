import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FEATURE_LABELS, type Feature } from '@/lib/feature-flags'

interface UpgradePromptProps {
  feature?: Feature
  message?: string
}

export default function UpgradePrompt({ feature, message }: UpgradePromptProps) {
  const label = feature ? FEATURE_LABELS[feature] : ''
  const text = message || `${label} is available on a paid plan. Upgrade to unlock this feature.`

  return (
    <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-xl border border-primary-200 p-6 text-center">
      <Sparkles size={32} className="mx-auto text-primary-500 mb-3" />
      <h3 className="text-base font-semibold text-gray-900 mb-1">Upgrade Required</h3>
      <p className="text-sm text-gray-600 mb-4">{text}</p>
      <Link
        to="/billing/pricing"
        className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
      >
        <Sparkles size={16} /> View Plans
      </Link>
    </div>
  )
}
