import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { SubscriptionTier, UserSubscription } from '@/types'
import type { Feature, ResourceLimit } from '@/lib/feature-flags'

interface SubscriptionContextType {
  subscription: UserSubscription | null
  tier: SubscriptionTier | null
  tiers: SubscriptionTier[]
  loading: boolean
  hasFeature: (feature: Feature) => boolean
  isWithinLimit: (resource: ResourceLimit, currentCount: number) => boolean
  getLimit: (resource: ResourceLimit) => number
  refetch: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [tier, setTier] = useState<SubscriptionTier | null>(null)
  const [tiers, setTiers] = useState<SubscriptionTier[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTiers = useCallback(async () => {
    const { data } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    setTiers(data ?? [])
    return data ?? []
  }, [])

  const fetchSubscription = useCallback(async (allTiers: SubscriptionTier[]) => {
    if (!user) {
      setSubscription(null)
      setTier(null)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (data) {
      setSubscription(data)
      const matchedTier = allTiers.find((t) => t.id === data.tier_id)
      setTier(matchedTier ?? null)
    } else {
      // Fall back to free tier
      const freeTier = allTiers.find((t) => t.slug === 'free') ?? null
      setTier(freeTier)
      setSubscription(null)
    }
    setLoading(false)
  }, [user])

  const refetch = useCallback(async () => {
    const allTiers = await fetchTiers()
    await fetchSubscription(allTiers)
  }, [fetchTiers, fetchSubscription])

  useEffect(() => {
    refetch()
  }, [refetch])

  function hasFeature(feature: Feature): boolean {
    if (!tier) return false
    return tier.features[feature] === true
  }

  function isWithinLimit(resource: ResourceLimit, currentCount: number): boolean {
    if (!tier) return false
    const limit = tier.limits[resource]
    if (limit === undefined) return false
    if (limit === -1) return true // unlimited
    return currentCount < limit
  }

  function getLimit(resource: ResourceLimit): number {
    if (!tier) return 0
    return tier.limits[resource] ?? 0
  }

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      tier,
      tiers,
      loading,
      hasFeature,
      isWithinLimit,
      getLimit,
      refetch,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
