import { CopyButton } from './ui/copy-button'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ExecutionResultWeb } from '@/lib/types'
import { RotateCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { FragmentSchema } from '@/lib/schema'
import { DeepPartial } from 'ai'
import { isSandboxAlive, rebuildSandbox } from '@/lib/sandbox'

interface FragmentWebProps {
  result: ExecutionResultWeb
  fragment?: DeepPartial<FragmentSchema>
  teamID?: string
  accessToken?: string
  onRebuild?: (newResult: ExecutionResultWeb) => void
}

export function FragmentWeb({ result, fragment, teamID, accessToken, onRebuild }: FragmentWebProps) {
  const [iframeKey, setIframeKey] = useState(0)
  const [currentUrl, setCurrentUrl] = useState(result ? result.url : '')

  // Detect expired sandbox once on mount / when the URL changes
  useEffect(() => {
    if (!result) return;

    let cancelled = false

    async function checkSandbox() {
      const alive = await isSandboxAlive(result.url)
      if (cancelled || alive) return

      // Attempt to rebuild if fragment data exists
      if (fragment) {
        try {
          const newResult = await rebuildSandbox(fragment, teamID, accessToken)
          if (cancelled) return
          setCurrentUrl(newResult.url)
          setIframeKey((k) => k + 1)
          onRebuild?.(newResult)
          return
        } catch {
          /* fallthrough to alert */
        }
      }

      alert('sandbox timeout – rebuilding')
    }

    checkSandbox()

    return () => {
      cancelled = true
    }
  }, [result?.url, fragment, teamID, accessToken, onRebuild])

  // If parent provides a brand-new sandbox URL (e.g. after new code was
  // executed) make sure the iframe updates.
  useEffect(() => {
    if (!result) return;
    setCurrentUrl(result.url)
    setIframeKey((k) => k + 1)
  }, [result?.url])

  function refreshIframe() {
    setIframeKey((prevKey) => prevKey + 1)
  }

  if (!result) {
    return null
  }

  return (
    <div className="flex flex-col w-full h-full">
      <iframe
        key={iframeKey}
        className="h-full w-full"
        sandbox="allow-forms allow-scripts allow-same-origin"
        loading="lazy"
        src={currentUrl}
      />
    </div>
  )
}
