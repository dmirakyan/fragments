import { Message } from '@/lib/messages'
import { FragmentSchema } from '@/lib/schema'
import { ExecutionResult } from '@/lib/types'
import { LLMModelConfig } from '@/lib/models'
import { TemplateId } from '@/lib/templates'
import { DeepPartial } from 'ai'

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  messages: Message[]
  current_fragment: DeepPartial<FragmentSchema> | null
  current_result: ExecutionResult | null
  template_id: TemplateId | null
  model_config: LLMModelConfig | null
  created_at: string
  updated_at: string
  published_app_id: string | null
}

export interface ConversationInsert {
  user_id: string
  title?: string
  messages?: Message[]
  current_fragment?: DeepPartial<FragmentSchema> | null
  current_result?: ExecutionResult | null
  template_id?: TemplateId | null
  model_config?: LLMModelConfig | null
}

export interface ConversationUpdate {
  title?: string
  messages?: Message[]
  current_fragment?: DeepPartial<FragmentSchema> | null
  current_result?: ExecutionResult | null
  template_id?: TemplateId | null
  model_config?: LLMModelConfig | null
  published_app_id?: string | null
} 