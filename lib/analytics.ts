// Plausible Analytics utility
declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, any> }) => void
  }
}

export function trackEvent(event: string, props?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(event, { props })
  }
}

// Convenience functions for common events
export const analytics = {
  track: trackEvent,
  
  // Specific event trackers
  appView: (appId: string) => trackEvent('App View', { app_id: appId }),
  fragmentGenerated: (template: string) => trackEvent('Fragment Generated', { template }),
  sandboxCreated: (url: string) => trackEvent('Sandbox Created', { url }),
  chatSubmit: (message: string, model: string) => trackEvent('Chat Submit', { message_length: message.length, model }),
  publish: (url: string, duration: string) => trackEvent('Publish URL', { url, duration }),
  signIn: () => trackEvent('Sign In'),
  signOut: () => trackEvent('Sign Out'),
} 