'use client'

import { analytics } from '@/lib/analytics'
import { FragmentSchema } from '@/lib/schema'
import { DeepPartial } from 'ai'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { isSandboxAlive, rebuildSandbox } from '@/lib/sandbox'

interface AppViewerProps {
  id: string
  sandboxUrl: string
  fragmentData?: DeepPartial<FragmentSchema> | null
  storedData?: {
    url: string
    fragment: DeepPartial<FragmentSchema>
    sbxId: string
    teamID?: string
    accessToken?: string
    createdAt: number
    expiresAt: number
  } | null
}

interface AppBannerProps {
  rebuildError?: string | null
  onRetry?: () => void
}

function AppBanner({ rebuildError, onRetry }: AppBannerProps) {
  return (
    <div className="px-4 py-3 shadow-lg border-b-2" style={{ 
      backgroundColor: '#1A1B1D',
      borderBottomColor: '#FFFF00'
    }}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <Image 
            src="/logos/logo_large.png" 
            alt="LemonFarm" 
            width={32} 
            height={32}
            className="object-contain"
          />
          <span className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
            LemonFarm
          </span>
        </div>
        <div className="flex items-center space-x-3">
          {rebuildError && onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-105"
              style={{ 
                backgroundColor: '#FFFF00', 
                color: '#000000',
                border: '2px solid #FFFF00'
              }}
            >
              Retry
            </button>
          )}
          <a
            href="https://lemonfarmlabs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: '#FFFF00', 
              color: '#000000',
              border: '2px solid #FFFF00'
            }}
          >
            Try LemonFarm
          </a>
        </div>
      </div>
    </div>
  )
}

export function AppViewer({ id, sandboxUrl, fragmentData, storedData }: AppViewerProps) {
  const [currentUrl, setCurrentUrl] = useState(sandboxUrl)
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [rebuildError, setRebuildError] = useState<string | null>(null)

  useEffect(() => {
    analytics.appView(id)
  }, [id])

  // Lightweight check: ping the sandbox. If it's gone, trigger rebuild.
  useEffect(() => {
    if (isRebuilding || !storedData || !fragmentData) return

    let cancelled = false

    async function ping() {
      const alive = await isSandboxAlive(currentUrl)
      if (!cancelled && !alive) {
        handleIframeError()
      }
    }

    ping()

    return () => {
      cancelled = true
    }
  }, [currentUrl])

  // Auto-rebuild functionality when iframe fails to load
  const handleIframeError = async () => {
    if (!storedData || !fragmentData || isRebuilding) return
    
    setIsRebuilding(true)
    setRebuildError(null)
    
    try {
      // Rebuild the sandbox using the stored fragment data
      const result = await rebuildSandbox(
        fragmentData,
        storedData.teamID,
        storedData.accessToken,
      )
      
      // Update KV with new sandbox URL
      await fetch('/api/update-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          newUrl: result.url,
          newSbxId: result.sbxId,
        }),
      })

      setCurrentUrl(result.url)
      analytics.track('app_rebuilt', { app_id: id })
    } catch (error) {
      console.error('Rebuild failed:', error)
      setRebuildError('Failed to rebuild app. Please try again.')
    } finally {
      setIsRebuilding(false)
    }
  }

  if (isRebuilding) {
    return (
      <div className="flex flex-col h-screen" style={{ backgroundColor: '#1A1B1D' }}>
        <AppBanner />
        
        {/* Rebuilding message */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div 
              className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent mx-auto mb-6"
              style={{ borderColor: '#FFFF00', borderTopColor: 'transparent' }}
            ></div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#FFFFFF' }}>
              Rebuilding Your App
            </h2>
            <p className="text-lg" style={{ color: '#FFFFFF', opacity: 0.8 }}>
              Please wait while we restore your app...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <AppBanner rebuildError={rebuildError} onRetry={handleIframeError} />

      {rebuildError && (
        <div className="border-l-4 p-4" style={{ 
          backgroundColor: '#1A1B1D', 
          borderColor: '#FFFF00',
          color: '#FFFFFF'
        }}>
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium">
                <span style={{ color: '#FFFF00' }}>Error:</span> {rebuildError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Iframe Container */}
      <div className="flex-1 w-full">
        <iframe
          src={currentUrl}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={`LemonFarm App ${id}`}
          onError={handleIframeError}
        />
      </div>
    </div>
  )
} 