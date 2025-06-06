import { kv } from '@vercel/kv'
import { notFound } from 'next/navigation'
import { AppViewer } from './app-viewer'
import { FragmentSchema } from '@/lib/schema'
import { DeepPartial } from 'ai'

interface PageProps {
  params: Promise<{ id: string }>
}

interface StoredAppData {
  url: string
  fragment: DeepPartial<FragmentSchema>
  sbxId: string
  teamID?: string
  accessToken?: string
  createdAt: number
  expiresAt: number
}

export default async function AppPage({ params }: PageProps) {
  const { id } = await params
  
  // Fetch the app data from KV
  const appData = await kv.get(`fragment:${id}`) as StoredAppData
  
  if (!appData) {
    notFound()
  }
  
  // Handle both old format (string URL) and new format (object)
  const sandboxUrl = typeof appData === 'string' ? appData : appData.url
  const fragmentData = typeof appData === 'object' ? appData.fragment : null
  
  return <AppViewer 
    id={id} 
    sandboxUrl={sandboxUrl} 
    fragmentData={fragmentData}
    storedData={typeof appData === 'object' ? appData : null}
  />
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  
  return {
    title: `LemonFarm App - ${id}`,
    description: 'View app built with LemonFarm',
  }
} 