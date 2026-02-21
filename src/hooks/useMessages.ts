import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Message } from '@/types'

export function useMessages(projectId: string) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
      if (error) throw error
      setMessages(data ?? [])
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    fetchMessages()

    const channel = supabase
      .channel(`messages:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [projectId, fetchMessages])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!projectId) throw new Error('Project ID is required')
      const { error } = await supabase.from('messages').insert({
        project_id: projectId,
        sender_id: user.id,
        content,
      })
      if (error) throw error
    },
    [projectId, user]
  )

  return { messages, loading, sendMessage }
}
