import { ExecutionResultWeb } from '@/lib/types'
import { FragmentSchema } from '@/lib/schema'
import { DeepPartial } from 'ai'

/**
 * Quick health-check for a sandbox URL.
 * Returns true when the sandbox responds with a non-error status and
 * does NOT contain the dreaded "Sandbox Not Found" page.
 */
export async function isSandboxAlive(url: string): Promise<boolean> {
  try {
    const res = await fetch('/api/ping-sandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      cache: 'no-store',
    })

    if (!res.ok) return true // Network hiccup – assume it might still be alive

    const data = (await res.json()) as { alive: boolean }
    return data.alive
  } catch (err) {
    // Any fetch failure -> treat as not alive
    return false
  }
}

/**
 * Rebuilds a sandbox by calling the internal /api/sandbox route.
 * Throws when the rebuild fails (non-2xx response).
 */
export async function rebuildSandbox(
  fragment: DeepPartial<FragmentSchema>,
  teamID?: string,
  accessToken?: string,
): Promise<ExecutionResultWeb> {
  const res = await fetch('/api/sandbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fragment, teamID, accessToken }),
  })

  if (!res.ok) {
    throw new Error('Failed to rebuild sandbox')
  }

  return (await res.json()) as ExecutionResultWeb
} 