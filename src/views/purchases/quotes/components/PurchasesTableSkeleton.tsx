'use client'

import React from 'react'
import Skeleton from '@mui/material/Skeleton'
import Card from '@mui/material/Card'

export const PurchasesTableSkeleton: React.FC = () => {
  return (
    <Card
      sx={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E6E4F0',
        p: 3
      }}
    >
      <div className='flex flex-col gap-3'>
        <Skeleton variant='rounded' height={40} sx={{ borderRadius: '12px', bgcolor: '#F4F3F8' }} />
        {[1, 2, 3, 4, 5].map(row => (
          <Skeleton key={row} variant='rounded' height={56} sx={{ borderRadius: '12px', bgcolor: '#F8F7FC' }} />
        ))}
      </div>
    </Card>
  )
}
