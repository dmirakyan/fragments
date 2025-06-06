'use client'

import { ViewType } from '@/components/auth'
import { AuthDialog } from '@/components/auth-dialog'
import { Chat } from '@/components/chat'
import { ChatInput } from '@/components/chat-input'
import { ChatPicker } from '@/components/chat-picker'
import { ChatSettings } from '@/components/chat-settings'
import { NavBar } from '@/components/navbar'
import { Preview } from '@/components/preview'
import { useAuth } from '@/lib/auth'
import { Message, toAISDKMessages, toMessageImage } from '@/lib/messages'
import { LLMModelConfig } from '@/lib/models'
import modelsList from '@/lib/models.json'
import { FragmentSchema, fragmentSchema as schema } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import templates, { TemplateId } from '@/lib/templates'
import { ExecutionResult } from '@/lib/types'
import { useConversation } from '@/lib/hooks/useConversation'
import { DeepPartial } from 'ai'
import { experimental_useObject as useObject } from 'ai/react'
import { analytics } from '@/lib/analytics'
import { SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'

export default function Home() {
  const [chatInput, setChatInput] = useLocalStorage('chat', '')
  const [files, setFiles] = useState<File[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<'auto' | TemplateId>(
    'nextjs-developer',
  )
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>(
    'languageModel',
    {
      model: 'claude-sonnet-4-20250514',
    },
  )

  const [currentTab, setCurrentTab] = useState<'code' | 'fragment'>('code')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isAuthDialogOpen, setAuthDialog] = useState(false)
  const [authView, setAuthView] = useState<ViewType>('sign_in')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { session, userTeam } = useAuth(setAuthDialog, setAuthView)
  const {
    conversation,
    messages,
    fragment,
    result,
    loading: conversationLoading,
    error: conversationError,
    addMessage,
    updateMessage,
    setFragment,
    setResult,
    clearMessages,
    createNewConversation,
    updateConversationSettings,
    saveConversation
  } = useConversation(session)

  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const filteredModels = modelsList.models.filter((model) => {
    // Show only Google and OpenAI models
    const allowedProviders = ['openai', 'google', 'anthropic']
    return allowedProviders.includes(model.providerId)
  })

  const setMessage = useCallback(
    (message: Partial<Message>, index?: number) => {
      updateMessage(message, index)
    },
    [updateMessage],
  )

  const currentModel = filteredModels.find(
    (model) => model.id === languageModel.model,
  ) || filteredModels[0]
  const currentTemplate =
    selectedTemplate === 'auto'
      ? templates
      : { [selectedTemplate]: templates[selectedTemplate] }

  const { object, submit, isLoading, stop, error } = useObject({
    api: '/api/chat',
    schema,
    onError: (error) => {
      console.error('Error submitting request:', error)
      if (error.message.includes('limit')) {
        setIsRateLimited(true)
      }

      setErrorMessage(error.message)
    },
    onFinish: async ({ object: fragment, error }) => {
      if (!error) {
        // send it to /api/sandbox
        console.log('fragment', fragment)
        setIsPreviewLoading(true)
        analytics.fragmentGenerated(fragment?.template || '')

        const response = await fetch('/api/sandbox', {
          method: 'POST',
          body: JSON.stringify({
            fragment,
            userID: session?.user?.id,
            teamID: userTeam?.id,
            accessToken: session?.access_token,
          }),
        })

        const result = await response.json()
        console.log('result', result)
        analytics.sandboxCreated(result.url)

        setResult(result)
        setCurrentPreview({ fragment, result })
        setMessage({ result })
        setCurrentTab('fragment')
        setIsPreviewLoading(false)
        
        // Save conversation with the updated fragment and result
        saveConversation({
          messages,
          current_fragment: fragment,
          current_result: result,
        })
      }
    },
  })

  useEffect(() => {
    if (object) {
      setFragment(object)
      const content: Message['content'] = [
        { type: 'text', text: object.commentary || '' },
        { type: 'code', text: object.code || '' },
      ]

      const lastMessage = messagesRef.current[messagesRef.current.length - 1]

      if (!lastMessage || lastMessage.role !== 'assistant') {
        addMessage({
          role: 'assistant',
          content,
          object,
        })
      }

      if (lastMessage && lastMessage.role === 'assistant') {
        setMessage({
          content,
          object,
        })
      }
    }
  }, [object, addMessage, setFragment, setMessage])

  useEffect(() => {
    if (error) stop()
  }, [error, stop])

  // Update languageModel if current model is not available in filtered list
  useEffect(() => {
    if (currentModel && currentModel.id !== languageModel.model) {
      setLanguageModel(prev => ({ ...prev, model: currentModel.id }))
    }
  }, [currentModel?.id, languageModel.model, setLanguageModel])

  // Update conversation settings when template or model changes
  useEffect(() => {
    updateConversationSettings(
      selectedTemplate === 'auto' ? null : selectedTemplate, 
      languageModel
    )
  }, [selectedTemplate, languageModel, updateConversationSettings])

  async function handleSubmitAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!session) {
      return setAuthDialog(true)
    }

    if (isLoading) {
      stop()
    }

    const content: Message['content'] = [{ type: 'text', text: chatInput }]
    const images = await toMessageImage(files)

    if (images.length > 0) {
      images.forEach((image) => {
        content.push({ type: 'image', image })
      })
    }

    const updatedMessages = addMessage({
      role: 'user',
      content,
    })

    submit({
      userID: session?.user?.id,
      teamID: userTeam?.id,
      messages: toAISDKMessages(updatedMessages),
      template: currentTemplate,
      model: currentModel,
      config: languageModel,
    })

    saveConversation({ messages: updatedMessages })
    setChatInput('')
    setFiles([])
    setCurrentTab('code')

    analytics.chatSubmit(chatInput, languageModel.model || 'unknown')
  }

  function retry() {
    submit({
      userID: session?.user?.id,
      teamID: userTeam?.id,
      messages: toAISDKMessages(messages),
      template: currentTemplate,
      model: currentModel,
      config: languageModel,
    })
  }

  function handleSaveInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatInput(e.target.value)
  }

  function handleFileChange(change: SetStateAction<File[]>) {
    setFiles(change)
  }

  function logout() {
    supabase
      ? supabase.auth.signOut()
      : console.warn('Supabase is not initialized')
  }

  function handleLanguageModelChange(e: LLMModelConfig) {
    setLanguageModel({ ...languageModel, ...e })
  }

  function handleSocialClick(target: 'github' | 'x' | 'discord') {
    if (target === 'github') {
      window.open('https://github.com/lemonfarmlabs/lemonfarm', '_blank')
    } else if (target === 'x') {
      window.open('https://x.com/lemonfarmlabs', '_blank')
    } else if (target === 'discord') {
      window.open('https://discord.gg/lemonfarm', '_blank')
    }

    analytics.track(`${target}_click`)
  }

  async function handleClearChat() {
    stop()
    setChatInput('')
    setFiles([])
    clearMessages()
    setCurrentTab('code')
    setIsPreviewLoading(false)
    
    // Create new conversation for fresh start
    await createNewConversation()
  }

  function setCurrentPreview(preview: {
    fragment: DeepPartial<FragmentSchema> | undefined
    result: ExecutionResult | undefined
  }) {
    setFragment(preview.fragment || null)
    setResult(preview.result || null)
  }

  function handleUndo() {
    // Remove last 2 messages (user + assistant)
    const newMessages = messages.slice(0, -2)
    // Note: This will trigger auto-save through useConversation
    // For now, we'll need to implement this properly
    setCurrentPreview({ fragment: undefined, result: undefined })
  }

  // Show loading while conversation is loading (only after auth)
  if (session && conversationLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-blue-500 mx-auto mb-4"></div>
          <p>Loading your conversation...</p>
        </div>
      </main>
    )
  }

  // Show error if conversation failed to load
  if (conversationError) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load conversation: {conversationError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen max-h-screen">
      {supabase && (
        <AuthDialog
          open={!session || isAuthDialogOpen}
          setOpen={setAuthDialog}
          view={authView}
          supabase={supabase}
        />
      )}
      {!session ? (
        <div className="flex flex-1 items-center justify-center" />
      ) : (
      <div className="grid w-full md:grid-cols-2">
        <div
          className={`flex flex-col w-full max-h-full max-w-[800px] mx-auto px-4 overflow-auto ${fragment ? 'col-span-1' : 'col-span-2'}`}
        >
          <NavBar
            session={session}
            showLogin={() => setAuthDialog(true)}
            signOut={logout}
            onSocialClick={handleSocialClick}
            onClear={handleClearChat}
            canClear={messages.length > 0}
            canUndo={messages.length > 1 && !isLoading}
            onUndo={handleUndo}
          />
          <Chat
            messages={messages}
            isLoading={isLoading}
            setCurrentPreview={setCurrentPreview}
          />
          <ChatInput
            retry={retry}
            isErrored={error !== undefined}
            errorMessage={errorMessage}
            isLoading={isLoading}
            isRateLimited={isRateLimited}
            stop={stop}
            input={chatInput}
            handleInputChange={handleSaveInputChange}
            handleSubmit={handleSubmitAuth}
            isMultiModal={currentModel?.multiModal || false}
            files={files}
            handleFileChange={handleFileChange}
          >
            <ChatPicker
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelectedTemplateChange={setSelectedTemplate}
              models={filteredModels}
              languageModel={languageModel}
              onLanguageModelChange={handleLanguageModelChange}
            />
            <ChatSettings
              languageModel={languageModel}
              onLanguageModelChange={handleLanguageModelChange}
              apiKeyConfigurable={!process.env.NEXT_PUBLIC_NO_API_KEY_INPUT}
              baseURLConfigurable={!process.env.NEXT_PUBLIC_NO_BASE_URL_INPUT}
            />
          </ChatInput>
        </div>
        <Preview
          teamID={userTeam?.id}
          accessToken={session?.access_token}
          conversationId={conversation?.id}
          userId={session?.user?.id}
          publishedUrl={conversation?.published_app_id ? `${window.location.origin}/app/${conversation.published_app_id}`: undefined}
          hasPublishedApp={!!conversation?.published_app_id}
          lastPublishedAt={conversation?.updated_at}
          selectedTab={currentTab}
          onSelectedTabChange={setCurrentTab}
          isChatLoading={isLoading}
          isPreviewLoading={isPreviewLoading}
          fragment={fragment || undefined}
          result={result as ExecutionResult}
          onClose={() => setFragment(null)}
        />
      </div>
      )}
    </main>
  )
}
