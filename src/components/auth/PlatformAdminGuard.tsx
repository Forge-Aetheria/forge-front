'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

import { GraphQLClientError } from '@/libs/graphqlClient'
import { platformAdminService } from '@/services/platformAdminService'

interface PlatformAdminGuardProps {
  children: ReactNode
}

/**
 * UX guard. The backend is the authority: every platform resolver also checks
 * PlatformAdmin and elevation. Unauthorized users are sent back to /home.
 */
export const PlatformAdminGuard = ({ children }: PlatformAdminGuardProps) => {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const isPlatformAdmin = await platformAdminService.getAccessStatus()

        if (cancelled) return

        if (!isPlatformAdmin) {
          router.replace('/home')
          
return
        }

        setAllowed(true)
      } catch (error) {
        if (cancelled) return

        if (error instanceof GraphQLClientError && error.code === 'UNAUTHENTICATED') {
          router.replace('/login?redirectTo=/admin-platform')
          
return
        }

        router.replace('/home')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void check()

    
return () => {
      cancelled = true
    }
  }, [router])

  if (loading || !allowed) {
    return (
      <Box className='flex items-center justify-center min-bs-screen w-full'>
        <CircularProgress size={40} />
      </Box>
    )
  }

  return <>{children}</>
}
