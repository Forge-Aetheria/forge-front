// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import Providers from '@components/Providers'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { OnboardingGuard } from '@/components/auth/OnboardingGuard'

type Props = ChildrenType

const POSLayout = async (props: Props) => {
  const { children } = props
  const direction = 'ltr'

  return (
    <Providers direction={direction}>
      <AuthGuard>
        <OnboardingGuard>{children}</OnboardingGuard>
      </AuthGuard>
    </Providers>
  )
}

export default POSLayout
