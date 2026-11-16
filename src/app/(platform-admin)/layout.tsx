import type { ChildrenType } from '@core/types'
import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'
import { getSystemMode } from '@core/utils/serverHelpers'
import { AuthGuard } from '@/components/auth/AuthGuard'

const Layout = async (props: ChildrenType) => {
  const { children } = props
  const direction = 'ltr'
  const systemMode = await getSystemMode()

  return (
    <Providers direction={direction}>
      <AuthGuard>
        <BlankLayout systemMode={systemMode}>{children}</BlankLayout>
      </AuthGuard>
    </Providers>
  )
}

export default Layout
