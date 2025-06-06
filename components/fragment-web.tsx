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
import { useState } from 'react'

export function FragmentWeb({ result }: { result: ExecutionResultWeb }) {
  const [iframeKey, setIframeKey] = useState(0)
  if (!result) return null

  function refreshIframe() {
    setIframeKey((prevKey) => prevKey + 1)
  }

  return (
    <div className="flex flex-col w-full h-full">
      <iframe
        key={iframeKey}
        className="h-full w-full"
        sandbox="allow-forms allow-scripts allow-same-origin"
        loading="lazy"
        src={result.url}
      />
    </div>
  )
}
