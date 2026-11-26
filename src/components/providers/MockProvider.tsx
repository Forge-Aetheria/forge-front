'use client'

import { useEffect, useState, type ReactNode } from 'react'

interface MockProviderProps {
  children: ReactNode
}

export const MockProvider = ({ children }: MockProviderProps) => {
  const [mockReady, setMockReady] = useState(
    process.env.NEXT_PUBLIC_ENABLE_E2E_MOCKS !== 'true'
  )

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_E2E_MOCKS === 'true' && typeof window !== 'undefined') {
      import('@/mocks/browser')
        .then(({ worker }) => {
          return worker.start({
            onUnhandledRequest: 'bypass',
            serviceWorker: {
              url: '/mockServiceWorker.js'
            }
          })
        })
        .then(() => {
          setMockReady(true)
        })
        .catch(err => {
          console.error('[MockProvider] Error iniciando MSW:', err)
          setMockReady(true)
        })
    }
  }, [])

  if (!mockReady) {
    return null
  }

  return <>{children}</>
}

export default MockProvider
