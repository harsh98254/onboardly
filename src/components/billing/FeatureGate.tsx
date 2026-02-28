import { useSubscription } from '@/contexts/SubscriptionContext'
import type { Feature } from '@/lib/feature-flags'
import UpgradePrompt from './UpgradePrompt'
import type { ReactNode } from 'react'

interface FeatureGateProps {
  feature: Feature
  children: ReactNode
  fallback?: ReactNode
}

export default function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature } = useSubscription()

  if (hasFeature(feature)) {
    return <>{children}</>
  }

  return <>{fallback ?? <UpgradePrompt feature={feature} />}</>
}
