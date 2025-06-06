import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1B1D' }}>
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <Image 
            src="/logos/logo_large.png" 
            alt="LemonFarm" 
            width={96} 
            height={96}
            className="mx-auto object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
          <span style={{ color: '#FFFF00' }}>App</span> Not Found
        </h1>
        <p className="text-lg mb-8" style={{ color: '#FFFFFF', opacity: 0.8 }}>
          The app you&apos;re looking for doesn&apos;t exist or has expired.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg font-bold text-lg transition-all duration-200 hover:scale-105"
          style={{ 
            backgroundColor: '#FFFF00', 
            color: '#000000',
            border: '2px solid #FFFF00'
          }}
        >
          Create Your Own App
        </Link>
      </div>
    </div>
  )
} 