'use client'

import React, { useEffect, useState } from 'react'

import Link from 'next/link'

import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'

import type { PurchaseQuote } from '@/types/purchasesTypes'
import { purchasesService } from '@/services/purchasesService'
import { PurchaseMasterDetailForm } from './PurchaseMasterDetailForm'

interface Props {
  id: string
}

export const PurchaseEditWrapper: React.FC<Props> = ({ id }) => {
  const [quote, setQuote] = useState<PurchaseQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true)
        const data = await purchasesService.getPurchaseQuoteById(id)

        if (!data) {
          setError('La solicitud de compra solicitada no existe.')
          
return
        }

        if (data.estado !== 'DRAFT' && data.estado !== 'RFQ_SENT') {
          setError(
            `El documento ${data.correlativo_orden_compra || data.correlativo} se encuentra en estado "${data.estado}" con costos congelados y no puede ser editado.`
          )
          
return
        }

        setQuote(data)
      } catch (err: any) {
        setError(err?.message || 'Error al cargar la solicitud de compra.')
      } finally {
        setLoading(false)
      }
    }

    fetchQuote()
  }, [id])

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px] gap-3'>
        <CircularProgress sx={{ color: '#6C5CE7' }} size={40} />
        <span className='text-sm text-[#6B7280]'>Cargando solicitud de compra para edición...</span>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className='bg-[#FFFFFF] p-8 rounded-2xl border border-[#E6E4F0] text-center max-w-lg mx-auto mt-10 shadow-sm'>
        <span className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FEE2E2] text-[#EF4444] mb-3'>
          <i className='tabler-lock text-2xl' />
        </span>
        <h3 className='text-lg font-bold text-[#1E1B2E] mb-1'>Edición Bloqueada</h3>
        <p className='text-sm text-[#6B7280] mb-4'>{error}</p>
        <Button
          component={Link}
          href='/purchases/quotes'
          variant='contained'
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Volver al Listado de Compras
        </Button>
      </div>
    )
  }

  return <PurchaseMasterDetailForm mode='edit' initialQuote={quote} />
}
