'use client'

import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CustomChip from '@core/components/mui/Chip'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { accountingService } from '@/services/accountingService'
import type {
  AccountingSummaryKpis,
  Journal,
  AccountingInvoice,
  Account
} from '@/types/accountingTypes'
import { AccountingKpiRow } from './components/AccountingKpiRow'
import { JournalCardGrid } from './components/JournalCardGrid'
import { SinglePaymentDrawer } from '../payments/SinglePaymentDrawer'
import { JournalEntryFormModal } from '../journal-entries/JournalEntryFormModal'

export const AccountingDashboardView: React.FC = () => {
  const router = useRouter()
  const [kpis, setKpis] = useState<AccountingSummaryKpis | null>(null)
  const [journals, setJournals] = useState<Journal[]>([])
  const [invoices, setInvoices] = useState<AccountingInvoice[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Action Modals State
  const [singlePaymentOpen, setSinglePaymentOpen] = useState(false)
  const [selectedJournalForPayment, setSelectedJournalForPayment] = useState<string | undefined>()
  const [journalEntryOpen, setJournalEntryOpen] = useState(false)

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const tasaBcv = 54.00

  const loadData = async () => {
    try {
      setLoading(true)
      const [k, j, inv, acc] = await Promise.all([
        accountingService.getDashboardKpis(),
        accountingService.getJournals(),
        accountingService.getInvoices(),
        accountingService.getAccounts()
      ])

      setKpis(k)
      setJournals(j)
      setInvoices(inv)
      setAccounts(acc)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleQuickAction = (
    actionType: 'NEW_INVOICE_CUSTOMER' | 'NEW_INVOICE_SUPPLIER' | 'NEW_PAYMENT' | 'NEW_EXPENSE' | 'NEW_ENTRY',
    journalId: string
  ) => {
    if (actionType === 'NEW_INVOICE_CUSTOMER') {
      router.push('/accounting/invoices?type=CUSTOMER')
    } else if (actionType === 'NEW_INVOICE_SUPPLIER' || actionType === 'NEW_EXPENSE') {
      router.push('/accounting/invoices?type=SUPPLIER')
    } else if (actionType === 'NEW_PAYMENT') {
      setSelectedJournalForPayment(journalId)
      setSinglePaymentOpen(true)
    } else if (actionType === 'NEW_ENTRY') {
      setJournalEntryOpen(true)
    }
  }

  const handleSuccessToast = (msg: string) => {
    setToastMessage(msg)
    loadData()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* Cabecera Principal */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
              Tablero de Contabilidad y Tesorería
            </Typography>
            <CustomChip
              label={`Tasa BCV: ${tasaBcv.toFixed(2)} Bs/USD`}
              size='small'
              variant='tonal'
              color='primary'
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            component={Link}
            href='/accounting/reports'
            variant='outlined'
            startIcon={<i className='tabler-chart-pie' />}
            sx={{
              borderRadius: '9999px',
              borderColor: '#6C5CE7',
              color: '#6C5CE7',
              fontWeight: 600,
              textTransform: 'none',
              px: 3
            }}
          >
            Reportes Financieros
          </Button>

          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={() => setJournalEntryOpen(true)}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              fontWeight: 700,
              textTransform: 'none',
              px: 4,
              '&:hover': { backgroundColor: '#5b4bc4' }
            }}
          >
            Nuevo
          </Button>
        </Box>
      </Box>

      {/* Fila 1: KPIs Estadísticos (EARS-DASH-01) */}
      {loading || !kpis ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 4 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} variant='rectangular' height={130} sx={{ borderRadius: '24px' }} />
          ))}
        </Box>
      ) : (
        <AccountingKpiRow kpis={kpis} tasaBcv={tasaBcv} />
      )}

      {/* Fila 2: Grid de Diarios Contables (Estilo Odoo - EARS-DASH-02) */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B' }}>
              Diarios Contables Activos
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              component={Link}
              href='/accounting/journals?action=new'
              variant='outlined'
              size='small'
              startIcon={<i className='tabler-plus' />}
              sx={{
                borderRadius: '9999px',
                borderColor: '#6C5CE7',
                color: '#6C5CE7',
                fontWeight: 600,
                textTransform: 'none',
                px: 2.5
              }}
            >
              Nuevo
            </Button>
            <Button
              component={Link}
              href='/accounting/journals'
              size='small'
              endIcon={<i className='tabler-arrow-right' />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#6C5CE7'
              }}
            >
              Gestionar Diarios
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 4 }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} variant='rectangular' height={180} sx={{ borderRadius: '24px' }} />
            ))}
          </Box>
        ) : (
          <JournalCardGrid
            journals={journals}
            tasaBcv={tasaBcv}
            onQuickAction={handleQuickAction}
          />
        )}
      </Box>

      {/* Modales de Acciones Rápidas */}
      <SinglePaymentDrawer
        open={singlePaymentOpen}
        onClose={() => setSinglePaymentOpen(false)}
        onSuccess={handleSuccessToast}
        journals={journals}
        invoices={invoices}
        tasaBcv={tasaBcv}
        preselectedJournalId={selectedJournalForPayment}
      />

      <JournalEntryFormModal
        open={journalEntryOpen}
        onClose={() => setJournalEntryOpen(false)}
        onSuccess={(_, msg) => handleSuccessToast(msg)}
        accounts={accounts}
        journals={journals}
        defaultTasaBcv={tasaBcv}
      />

      {/* Toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' sx={{ borderRadius: '12px' }} onClose={() => setToastMessage(null)}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
