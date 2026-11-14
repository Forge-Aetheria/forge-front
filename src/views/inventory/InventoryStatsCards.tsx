'use client'

import React from 'react'

import Link from 'next/link'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

import type { WarehouseOperationsDashboard } from '@/types/inventoryTypes'

type Props = {
  ops: WarehouseOperationsDashboard
}

const InventoryStatsCards: React.FC<Props> = ({ ops }) => {
  return (
    <Grid container spacing={4}>
      {/* 1. Recepciones de Compras */}
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
            height: '100%'
          }}
        >
          <CardContent className='p-5 flex flex-col justify-between gap-3 h-full'>
            <div className='flex items-start justify-between'>
              <div>
                <span className='text-xs font-bold uppercase tracking-wider text-[#6B7280]'>
                  Recepciones (Compras)
                </span>
                <Typography variant='h4' className='font-bold text-[#1E1B2E] mt-1'>
                  {ops.recepciones_pendientes}
                </Typography>
              </div>
              <div className='w-11 h-11 rounded-2xl bg-[#F0EEF9] text-[#6C5CE7] flex items-center justify-center'>
                <i className='tabler-truck-Loading text-2xl' />
              </div>
            </div>

            <div className='flex items-center justify-between pt-2 border-t border-[#F4F3F8]'>
              <span className='text-xs text-[#6B7280]'>Entradas de proveedor</span>
              <Chip
                size='small'
                label='En curso'
                sx={{
                  borderRadius: '9999px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  height: 20,
                  backgroundColor: '#F0EEF9',
                  color: '#6C5CE7'
                }}
              />
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* 2. Entregas / Despachos de Ventas */}
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
            height: '100%'
          }}
        >
          <CardContent className='p-5 flex flex-col justify-between gap-3 h-full'>
            <div className='flex items-start justify-between'>
              <div>
                <span className='text-xs font-bold uppercase tracking-wider text-[#6B7280]'>
                  Entregas Pendientes
                </span>
                <Typography variant='h4' className='font-bold text-[#1E1B2E] mt-1'>
                  {ops.entregas_pendientes}
                </Typography>
              </div>
              <div className='w-11 h-11 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center'>
                <i className='tabler-package-export text-2xl' />
              </div>
            </div>

            <div className='flex items-center justify-between pt-2 border-t border-[#F4F3F8]'>
              <span className='text-xs text-[#6B7280]'>
                {ops.entregas_listas} listas para despachar
              </span>
              <Chip
                size='small'
                label='Despachos'
                sx={{
                  borderRadius: '9999px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  height: 20,
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7'
                }}
              />
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* 3. Alertas de Stock Bajo y Agotados */}
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
            height: '100%'
          }}
        >
          <CardContent className='p-5 flex flex-col justify-between gap-3 h-full'>
            <div className='flex items-start justify-between'>
              <div>
                <span className='text-xs font-bold uppercase tracking-wider text-[#6B7280]'>
                  Alertas de Reposición
                </span>
                <div className='flex items-baseline gap-2 mt-1'>
                  <Typography variant='h4' className='font-bold text-[#F59E0B]'>
                    {ops.articulos_stock_bajo + ops.articulos_agotados}
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    de {ops.total_articulos_catalogo} ítems
                  </span>
                </div>
              </div>
              <div className='w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center'>
                <i className='tabler-alert-triangle text-2xl' />
              </div>
            </div>

            <div className='flex items-center justify-between pt-2 border-t border-[#F4F3F8] text-xs'>
              <span className='text-[#EF4444] font-semibold'>
                {ops.articulos_agotados} agotados
              </span>
              <Link
                href='/inventory/products'
                className='text-[#6C5CE7] font-semibold hover:underline'
              >
                Ver catálogo →
              </Link>
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* 4. Valoración Total Bimonetaria */}
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
            height: '100%'
          }}
        >
          <CardContent className='p-5 flex flex-col justify-between gap-3 h-full'>
            <div className='flex items-start justify-between'>
              <div>
                <span className='text-xs font-bold uppercase tracking-wider text-[#6B7280]'>
                  Valor en Existencias
                </span>
                <Typography variant='h4' className='font-bold text-[#10B981] mt-1 font-mono'>
                  ${ops.valor_total_inventario_usd.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
              </div>
              <div className='w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#10B981] flex items-center justify-center'>
                <i className='tabler-coins text-2xl' />
              </div>
            </div>

            <div className='flex items-center justify-between pt-2 border-t border-[#F4F3F8] text-xs'>
              <span className='text-[#6B7280] font-mono'>
                Bs.{' '}
                {ops.valor_total_inventario_ves.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              <span className='text-[11px] text-[#10B981] font-semibold'>
                PVP: ${ops.valor_venta_potencial_usd.toFixed(0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default InventoryStatsCards
