// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import Providers from '@components/Providers'

type Props = ChildrenType

const POSLayout = async (props: Props) => {
  const { children } = props
  const direction = 'ltr'

  return <Providers direction={direction}>{children}</Providers>
}

export default POSLayout
