// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'

// Mock Provider for E2E
import MockProvider from '@/components/providers/MockProvider'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

export const metadata = {
  title: 'Foundly - ERP & Business Management',
  description: 'Foundly ERP - Clean Light Financial & Inventory Management System',
  icons: {
    icon: '/images/foundly-icon.png',
    shortcut: '/images/foundly-icon.png',
    apple: '/images/foundly-icon.png'
  }
}

const RootLayout = async (props: ChildrenType) => {
  const { children } = props

  // Type guard to ensure lang is a valid Locale

  // Vars

  const systemMode = await getSystemMode()
  const direction = 'ltr'

  return (
    <html id='__next' lang='en' dir={direction} suppressHydrationWarning>
      <body className='flex is-full min-bs-full flex-auto flex-col' suppressHydrationWarning>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        <MockProvider>{children}</MockProvider>
      </body>
    </html>
  )
}

export default RootLayout
