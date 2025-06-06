import { useState, useEffect, useCallback } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { Message } from '@/lib/messages'
import { FragmentSchema } from '@/lib/schema'
import { ExecutionResult } from '@/lib/types'
import { LLMModelConfig } from '@/lib/models'
import { TemplateId } from '@/lib/templates'
import { supabase } from '@/lib/supabase'
import { Conversation, ConversationInsert, ConversationUpdate } from '@/lib/types/conversation'
import { DeepPartial } from 'ai'
import { Session } from '@supabase/supabase-js'

export function useConversation(session: Session | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [debouncedMessages] = useDebounceValue(messages, 500)
  const [fragment, setFragment] = useState<DeepPartial<FragmentSchema> | null>(null)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auto-save conversation state whenever it changes
  const saveConversation = useCallback(async (updates: ConversationUpdate) => {
    if (!conversation?.id || !session?.user?.id || !supabase) return

    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id)
        .eq('user_id', session.user.id)

      if (error) throw error
    } catch (err) {
      console.error('Failed to save conversation:', err)
      setError(err instanceof Error ? err.message : 'Failed to save conversation')
    }
  }, [conversation?.id, session?.user?.id])

  // Create new conversation
  const createNewConversation = useCallback(async (
    initialData: Partial<ConversationInsert> = {}
  ): Promise<Conversation | null> => {
    if (!session?.user?.id || !supabase) return null

    try {
      setLoading(true)
      const conversationData: ConversationInsert = {
        user_id: session.user.id,
        messages: [],
        ...initialData
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single()

      if (error) throw error
      
      const newConversation = data as Conversation
      setConversation(newConversation)
      setMessages(newConversation.messages || [])
      setFragment(newConversation.current_fragment)
      setResult(newConversation.current_result)
      
      return newConversation
    } catch (err) {
      console.error('Failed to create conversation:', err)
      setError(err instanceof Error ? err.message : 'Failed to create conversation')
      return null
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  // Load existing conversation or create new one
  useEffect(() => {
    if (!session?.user?.id || !supabase) {
      setLoading(false)
      return
    }

    const loadOrCreateConversation = async () => {
      if (!supabase || !session?.user?.id) return // Additional guard inside async function
      
      try {
        setLoading(true)
        
        // Try to load the most recent conversation
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error

        if (data) {
          // Load existing conversation
          const conv = data as Conversation
          setConversation(conv)
          setMessages(conv.messages || [])
          setFragment(conv.current_fragment)
          setResult(conv.current_result)
        } else {
          // Create new conversation if none exists
          await createNewConversation()
        }
      } catch (err) {
        console.error('Failed to load conversation:', err)
        setError(err instanceof Error ? err.message : 'Failed to load conversation')
      } finally {
        setLoading(false)
      }
    }

    loadOrCreateConversation()
  }, [session?.user?.id])

  // Helper functions for managing state
  const addMessage = useCallback((message: Message) => {
    let newMessages: Message[]
    setMessages(prev => {
      newMessages = [...prev, message]
      return newMessages
    })
    return newMessages!
  }, [])

  const updateMessage = useCallback((message: Partial<Message>, index?: number) => {
    let updatedMessages: Message[]
    setMessages(prev => {
      const updated = [...prev]
      const targetIndex = index ?? prev.length - 1
      updated[targetIndex] = { ...prev[targetIndex], ...message }
      updatedMessages = updated
      return updated
    })
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setFragment(null)
    setResult(null)
  }, [])

  const updateConversationSettings = useCallback((
    templateId: TemplateId | null,
    modelConfig: LLMModelConfig | null
  ) => {
    if (conversation) {
      saveConversation({ 
        template_id: templateId, 
        model_config: modelConfig 
      })
    }
  }, [conversation, saveConversation])

  return {
    // State
    conversation,
    messages,
    fragment,
    result,
    loading,
    error,

    // State setters
    setMessages,
    setFragment,
    setResult,

    // Actions
    addMessage,
    updateMessage,
    clearMessages,
    createNewConversation,
    updateConversationSettings,
    saveConversation
  }
} 