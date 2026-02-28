import { useSubscription } from '@/contexts/SubscriptionContext'

export default function PlanBadge() {
  const { tier } = useSubscription()

  if (!tier || tier.slug === 'free') return null

  const colors: Record<string, string> = {
    teams: 'bg-primary-100 text-primary-700',
    orgs: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[tier.slug] || 'bg-gray-100 text-gray-700'}`}>
      {tier.name}
    </span>
  )
}
