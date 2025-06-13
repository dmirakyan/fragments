import { kv } from '@vercel/kv'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { id, newUrl, newSbxId } = await req.json()

    if (!id || !newUrl || !newSbxId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get existing data
    const existingData = await kv.get(`fragment:${id}`)
    
    if (!existingData || typeof existingData === 'string') {
      return NextResponse.json(
        { error: 'App data not found or invalid format' },
        { status: 404 }
      )
    }

    // Update with new sandbox details and extend expiration to 24 hours
    const updatedData = {
      ...existingData,
      url: newUrl,
      sbxId: newSbxId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }

    // Set with 24 hour expiration
    await kv.set(`fragment:${id}`, updatedData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating app:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 