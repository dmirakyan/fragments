import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string }

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    // Attempt a GET request to the sandbox URL. We cannot forward user cookies, and we
    // disable caching to make sure we hit the sandbox each time.
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
      })

      let alive = res.status < 400

      // Some deleted sandboxes return 200 with an HTML body that contains
      // the message "Sandbox Not Found". Detect that.
      if (alive) {
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('text/html')) {
          const text = await res.text()
          if (text.includes('Sandbox Not Found')) {
            alive = false
          }
        }
      }

      return NextResponse.json({ alive, status: res.status })
    } catch (err) {
      // Network-level error, treat as not alive
      return NextResponse.json({ alive: false, status: 0 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
} 