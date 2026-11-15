'use client'

// Third-party Imports
import classnames from 'classnames'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  return (
    <div
      className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}
    >
      <p className='text-textSecondary text-sm'>
        © {new Date().getFullYear()} Foundly ERP. Todos los derechos reservados.
      </p>
    </div>
  )
}

export default FooterContent
