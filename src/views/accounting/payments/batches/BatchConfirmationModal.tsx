'use client'

import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import type { SupplierBatchItem, Journal } from '@/types/accountingTypes'
import { accountingService } from '@/services/accountingService'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (loteId: string, totalUsd: number, totalVes: number) => void
  selectedItems: SupplierBatchItem[]
  bankJournal: Journal
  tasaBcv: number
}

export const BatchConfirmationModal: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  selectedItems,
  bankJournal,
  tasaBcv
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [copiedTxt, setCopiedTxt] = useState(false)

  const totalUsd = selectedItems.reduce((acc, it) => acc + it.montoAPagarUsd, 0)
  const totalVes = Number((totalUsd * tasaBcv).toFixed(2))

  const handleCopyBankingList = () => {
    // Generate text formatted for Venezuelan bank transfers
    const textLines = selectedItems.map(
      it =>
        `${it.proveedorRif} | ${it.proveedorNombre} | ${it.bancoDestino || 'Banesco'} | ${it.cuentaBancaria20Digitos || 'N/A'} | Monto: ${it.montoAPagarVes.toLocaleString('es-VE')} Bs.`
    )

    navigator.clipboard.writeText(textLines.join('\n'))
    setCopiedTxt(true)
    setTimeout(() => setCopiedTxt(false), 3000)
  }

  const handleConfirmBatch = async () => {
    try {
      setSubmitting(true)
      const res = await accountingService.processBatchPayment(selectedItems, bankJournal.id, tasaBcv)

      onSuccess(res.loteId, res.totalUsd, res.totalVes)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 5,
          pb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #E6E4F0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              backgroundColor: 'rgba(108, 92, 231, 0.12)',
              color: '#6C5CE7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}
          >
            <i className='tabler-layers-linked' />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B' }}>
              Confirmación de Lote de Pagos a Proveedores
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Banco Emisor: <strong>{bankJournal.nombre}</strong> | Tasa BCV: <strong>{tasaBcv.toFixed(2)} Bs/USD</strong>
            </Typography>
          </Box>
        </Box>

        <IconButton onClick={onClose} size='small' sx={{ color: '#94A3B8' }}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant='subtitle2' sx={{ color: '#475569', fontWeight: 600 }}>
            Desglose de Facturas y Cuentas Bancarias de Destino ({selectedItems.length} proveedores)
          </Typography>

          <Button
            size='small'
            variant='outlined'
            startIcon={<i className={copiedTxt ? 'tabler-check' : 'tabler-copy'} />}
            onClick={handleCopyBankingList}
            sx={{
              borderRadius: '9999px',
              color: copiedTxt ? '#10B981' : '#6C5CE7',
              borderColor: copiedTxt ? '#10B981' : '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            {copiedTxt ? '¡Copiado al Portapapeles!' : 'Copiar Listado Bancario'}
          </Button>
        </Box>

        <TableContainer sx={{ border: '1px solid #E6E4F0', borderRadius: '16px', mb: 4 }}>
          <Table size='small'>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Proveedor / RIF</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Banco & Cuenta (20 Dígitos)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Monto (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Monto (VES)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedItems.map((item, index) => (
                <TableRow key={item.facturaId || index} hover>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                      {item.proveedorNombre}
                    </Typography>
                    <Typography variant='caption' sx={{ color: '#64748B' }}>
                      {item.proveedorRif} • Fac: {item.numeroFactura}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' sx={{ color: '#334155', fontFamily: 'monospace' }}>
                      {item.cuentaBancaria20Digitos || 'Pago Móvil: ' + item.telefonoPagoMovil}
                    </Typography>
                    <Typography variant='caption' sx={{ color: '#64748B' }}>
                      {item.bancoDestino || 'Banco Nacional'}
                    </Typography>
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 600, color: '#1E293B' }}>
                    ${item.montoAPagarUsd.toFixed(2)}
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 600, color: '#10B981' }}>
                    {item.montoAPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </TableCell>
                </TableRow>
              ))}

              {/* Fila de Totales */}
              <TableRow sx={{ backgroundColor: 'rgba(108, 92, 231, 0.04)' }}>
                <TableCell colSpan={2} sx={{ fontWeight: 800, color: '#1E293B' }}>
                  TOTAL A DESEMBOLSAR
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                  ${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 800, color: '#10B981' }}>
                  {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity='info' sx={{ borderRadius: '14px' }}>
          Al confirmar, el sistema marcará estas {selectedItems.length} facturas como <strong>PAGADAS</strong>, deducirá los fondos del diario <strong>{bankJournal.nombre}</strong> y creará el asiento contable agrupado con partida doble balanceada.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 5, pt: 3, borderTop: '1px solid #E6E4F0', gap: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
          sx={{
            borderRadius: '9999px',
            borderColor: '#CBD5E1',
            color: '#64748B',
            textTransform: 'none',
            fontWeight: 600,
            px: 4
          }}
        >
          Cancelar
        </Button>
        <Button
          variant='contained'
          onClick={handleConfirmBatch}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-check' />}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#10B981',
            textTransform: 'none',
            fontWeight: 700,
            px: 4,
            '&:hover': { backgroundColor: '#059669' }
          }}
        >
          Confirmar y Contabilizar Lote
        </Button>
      </DialogActions>
    </Dialog>
  )
}
