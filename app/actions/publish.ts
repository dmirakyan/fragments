'use server'

import { Duration, ms } from '@/lib/duration'
import { FragmentSchema } from '@/lib/schema'
import { Sandbox } from '@e2b/code-interpreter'
import { kv } from '@vercel/kv'
import { customAlphabet } from 'nanoid'
import { DeepPartial } from 'ai'
import { supabase } from '@/lib/supabase'

const nanoid = customAlphabet('1234567890abcdef', 7)

export async function publish(
  url: string,
  sbxId: string,
  duration: Duration,
  conversationId: string,
  userId: string,
  teamID?: string,
  accessToken?: string,
  fragment?: DeepPartial<FragmentSchema>
) {
  const expiration = ms(duration)
  await Sandbox.setTimeout(sbxId, expiration, {
    ...(teamID && accessToken
      ? {
          headers: {
            'X-Supabase-Team': teamID,
            'X-Supabase-Token': accessToken,
          },
        }
      : {}),
  })

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const appId = conversationId
    
    if (supabase) {
      try {
        const { error } = await supabase
          .from('conversations')
          .update({ published_app_id: appId })
          .eq('id', conversationId)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to update conversation with published app ID:', error)
        }
      } catch (err) {
        console.error('Error updating conversation:', err)
      }
    }
    
    await kv.set(`fragment:${appId}`, {
      url,
      fragment,
      sbxId,
      conversationId,
      userId,
      teamID,
      accessToken,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + expiration
    }, { px: expiration })

    let baseUrl: string
    
    if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:3000'
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      baseUrl = `https://${process.env.NEXT_PUBLIC_SITE_URL}`
    } else {
      baseUrl = 'https://www.lemonfarm.com'
    }

    return {
      url: `${baseUrl}/app/${appId}`,
    }
  }

  return {
    url,
  }
}
