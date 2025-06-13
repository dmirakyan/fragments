import Logo from './logo'
import { CopyButton } from './ui/copy-button'
import { publish } from '@/app/actions/publish'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { analytics } from '@/lib/analytics'
import { FragmentSchema } from '@/lib/schema'
import { DeepPartial } from 'ai'
import { useEffect, useState } from 'react'
import { Share } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function DeployDialog({
  url,
  sbxId,
  conversationId,
  userId,
  teamID,
  accessToken,
  fragment,
  hasPublishedApp,
  initialPublishedURL,
  lastPublishedAt,
}: {
  url: string
  sbxId: string
  conversationId: string
  userId: string
  teamID: string | undefined
  accessToken: string | undefined
  fragment: DeepPartial<FragmentSchema>
  hasPublishedApp: boolean
  initialPublishedURL?: string
  lastPublishedAt?: string
}) {
  const [publishedURL, setPublishedURL] = useState<string | null>(initialPublishedURL || null)
  const [isPublishing, setIsPublishing] = useState(false)

  useEffect(() => {
    setPublishedURL(initialPublishedURL || null)
  }, [initialPublishedURL])

  async function handlePublish() {
    setIsPublishing(true)
    // Default to 1 hour
    const { url: returnedUrl } = await publish(
      url,
      sbxId,
      '1h',
      conversationId,
      userId,
      teamID,
      accessToken,
      fragment
    )
    setPublishedURL(returnedUrl)
    setIsPublishing(false)
    analytics.publish(returnedUrl, '1h')
  }

  const isUpdating = hasPublishedApp
  const buttonText = isUpdating ? 'Update App' : 'Create Share Link'
  
  const dialogTitle = isUpdating ? 'Update Your App' : 'Share Your App'
  const dialogDescription = isUpdating 
    ? 'Update your existing shared app with the latest changes.'
    : 'Create a shareable link that others can use to view and interact with your app.'

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Share className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Share</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent className="p-4 w-80 flex flex-col gap-2">
        <div className="text-sm font-semibold">{dialogTitle}</div>
        <div className="text-sm text-muted-foreground">
          {dialogDescription}
        </div>
        {publishedURL ? (
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center gap-2">
              <Input value={publishedURL} readOnly />
              <CopyButton content={publishedURL} />
            </div>
            {lastPublishedAt && (
              <p className="text-xs text-muted-foreground">
                Last updated {formatDistanceToNow(new Date(lastPublishedAt), { addSuffix: true })}
              </p>
            )}
          </div>
        ) : null}
        
        <div className="flex justify-end pt-2">
          <Button
            onClick={handlePublish}
            variant="default"
            disabled={isPublishing}
            className="w-full"
          >
            {isPublishing
              ? 'Publishing...'
              : publishedURL
                ? buttonText
                : 'Create Share Link'}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
