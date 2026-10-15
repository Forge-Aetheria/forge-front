// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import Providers from '@components/Providers'
import { AuthGuard } from '@/components/auth/AuthGuard'

type Props = ChildrenType

const POSLayout = async (props: Props) => {
  const { children } = props
  const direction = 'ltr'

  return (
    <Providers direction={direction}>
      <AuthGuard>
        {children}
      </AuthGuard>
    </Providers>
  )
}

export default POSLayout
