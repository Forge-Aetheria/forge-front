'use client'

// React Imports
import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// MUI Imports
import CircularProgress from '@mui/material/CircularProgress'

// Context Imports
import { useAuth } from '@/contexts/AuthContext'

export const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`)
    }
  }, [isLoading, isAuthenticated, router, pathname])

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-bs-screen w-full'>
        <CircularProgress size={40} className='text-primary' />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
