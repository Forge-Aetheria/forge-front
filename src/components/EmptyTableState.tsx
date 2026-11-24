'use client'

import React from 'react'

import Link from 'next/link'

import Button from '@mui/material/Button'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

export interface EmptyTableStateProps {

  /** Tabler icon class name (e.g. 'tabler-package-off'). */
  icon?: string

  /** Main empty-state heading. */
  title: string

  /** Optional helper text or JSX description. */
  description?: React.ReactNode

  /** Optional button label for clearing filters or creating a record. */
  actionLabel?: string

  /** Click handler for the optional action button. */
  onAction?: () => void

  /** Optional Next.js route for link-based actions. */
  actionHref?: string

  /** Column span when rendered inside a `<TableBody>` (default: 1). */
  colSpan?: number

  /** When true (default), wraps content in `<TableRow><TableCell colSpan={colSpan}>`. */
  asTableRow?: boolean
}

const EmptyTableState: React.FC<EmptyTableStateProps> = ({
  icon = 'tabler-inbox-off',
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  colSpan = 1,
  asTableRow = true
}) => {
  const content = (
    <div className='flex flex-col items-center justify-center text-center py-6 px-4'>
      <i className={`${icon} text-3xl text-[#6C5CE7] mb-2 inline-block`} />
      <Typography variant='body1' className='font-semibold text-[#1E1B2E]'>
        {title}
      </Typography>
      {description && (
        <Typography variant='caption' className='text-xs mt-1 block text-[#6B7280] max-w-md'>
          {description}
        </Typography>
      )}
      {actionLabel && (onAction || actionHref) && (
        <Button
          size='small'
          variant='outlined'
          {...(actionHref ? { component: Link, href: actionHref } : { onClick: onAction })}
          sx={{
            mt: 2,
            borderRadius: '9999px',
            borderColor: '#DCD8EC',
            color: '#6C5CE7',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8rem',
            px: 2.5,
            '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F4F3FF' }
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )

  if (!asTableRow) {
    return content
  }

  return (
    <TableRow>
      <TableCell colSpan={colSpan} sx={{ py: 4, textAlign: 'center', color: '#6B7280' }}>
        {content}
      </TableCell>
    </TableRow>
  )
}

export default EmptyTableState
