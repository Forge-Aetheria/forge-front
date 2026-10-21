'use client'

import React, { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import { accountingService } from '@/services/accountingService'
import type { FinancialReportRow, JournalEntry, Account, CurrencyViewMode } from '@/types/accountingTypes'
import { ReportCurrencyToggle } from './components/ReportCurrencyToggle'
import { BalanceSheetTable } from './components/BalanceSheetTable'
import { ProfitAndLossTable } from './components/ProfitAndLossTable'
import { GeneralLedgerTable } from './components/GeneralLedgerTable'
import { TrialBalanceTable } from './components/TrialBalanceTable'

export const FinancialReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0)
  const [currencyMode, setCurrencyMode] = useState<CurrencyViewMode>('DUAL')
  const [targetMoves, setTargetMoves] = useState<'POSTED' | 'ALL'>('POSTED')
  const [cutoffDate, setCutoffDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [tasaBcv] = useState<number>(54.00)

  // Report datasets
  const [balanceSheetRows, setBalanceSheetRows] = useState<FinancialReportRow[]>([])
  const [pnlRows, setPnlRows] = useState<FinancialReportRow[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const loadReportData = async () => {
    try {
      setLoading(true)
      const [bs, pl, entList, accList] = await Promise.all([
        accountingService.getBalanceSheet(tasaBcv, targetMoves),
        accountingService.getProfitAndLoss(tasaBcv, targetMoves),
        accountingService.getJournalEntries(targetMoves),
        accountingService.getAccountsWithTargetMoves(targetMoves, tasaBcv)
      ])

      setBalanceSheetRows(bs)
      setPnlRows(pl)
      setEntries(entList)
      setAccounts(accList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [tasaBcv, targetMoves])

  const handleExport = (type: 'PDF' | 'EXCEL') => {
    setToastMessage(`Generando reporte en formato ${type}... (Listo para impresión/descarga)`)
    if (type === 'PDF') {
      window.print()
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Cabecera Principal */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
            Centro de Reportes Financieros Bimonetarios
          </Typography>
          <Typography variant='body2' sx={{ color: '#64748B' }}>
            Estados financieros bimonetarios en tiempo real
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant='outlined'
            startIcon={<i className='tabler-file-spreadsheet' />}
            onClick={() => handleExport('EXCEL')}
            sx={{
              borderRadius: '9999px',
              borderColor: '#10B981',
              color: '#10B981',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              '&:hover': { borderColor: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.04)' }
            }}
          >
            Exportar Excel
          </Button>

          <Button
            variant='contained'
            startIcon={<i className='tabler-printer' />}
            onClick={() => handleExport('PDF')}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              '&:hover': { backgroundColor: '#5b4bc4' }
            }}
          >
            Imprimir / PDF
          </Button>
        </Box>
      </Box>

      {/* Tarjeta de Control y Visualización */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: 4
        }}
      >
        {/* Barra de Filtros y Selector de Moneda */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 3,
            mb: 4,
            pb: 3,
            borderBottom: '1px solid #E6E4F0'
          }}
        >
          {/* Conmutador Bimonetario (EARS-REP-02) */}
          <ReportCurrencyToggle mode={currencyMode} onChange={setCurrencyMode} />

          {/* Filtros: Asientos Contables (Confirmados vs Borradores) y Fecha de corte */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
            {/* Segmented Control para Asientos Contables (Odoo Style) */}
            <Box
              sx={{
                display: 'inline-flex',
                p: 0.5,
                backgroundColor: '#F1F5F9',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0'
              }}
            >
              <Button
                size='small'
                onClick={() => setTargetMoves('POSTED')}
                sx={{
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontWeight: targetMoves === 'POSTED' ? 700 : 500,
                  px: 2.5,
                  py: 0.7,
                  fontSize: '0.82rem',
                  backgroundColor: targetMoves === 'POSTED' ? '#FFFFFF' : 'transparent',
                  color: targetMoves === 'POSTED' ? '#6C5CE7' : '#64748B',
                  boxShadow: targetMoves === 'POSTED' ? '0 2px 6px rgba(108, 92, 231, 0.12)' : 'none',
                  '&:hover': {
                    backgroundColor: targetMoves === 'POSTED' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
                  }
                }}
              >
                Solo Asientos Confirmados
              </Button>

              <Button
                size='small'
                onClick={() => setTargetMoves('ALL')}
                sx={{
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontWeight: targetMoves === 'ALL' ? 700 : 500,
                  px: 2.5,
                  py: 0.7,
                  fontSize: '0.82rem',
                  backgroundColor: targetMoves === 'ALL' ? '#FFFFFF' : 'transparent',
                  color: targetMoves === 'ALL' ? '#6C5CE7' : '#64748B',
                  boxShadow: targetMoves === 'ALL' ? '0 2px 6px rgba(108, 92, 231, 0.12)' : 'none',
                  '&:hover': {
                    backgroundColor: targetMoves === 'ALL' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
                  }
                }}
              >
                Todos (Incluye Borradores)
              </Button>
            </Box>

            {/* Fecha de corte */}
            <TextField
              size='small'
              type='date'
              label='Fecha de Corte'
              value={cutoffDate}
              onChange={e => setCutoffDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 170 }}
            />
          </Box>
        </Box>

        {/* Alerta informativa si incluye borradores */}
        {targetMoves === 'ALL' && (
          <Alert
            severity='info'
            sx={{
              mb: 3,
              borderRadius: '14px',
              backgroundColor: 'rgba(108, 92, 231, 0.06)',
              color: '#4B3BC6',
              border: '1px solid rgba(108, 92, 231, 0.2)',
              '& .MuiAlert-icon': { color: '#6C5CE7' }
            }}
          >
            <strong>Simulación con Borradores:</strong> Mostrando cifras que incluyen asientos preliminares en estado Borrador además de los confirmados.
          </Alert>
        )}

        {/* Tabs de Reportes (EARS-REP-01) */}
        <Box sx={{ borderBottom: 1, borderColor: '#E6E4F0', mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.92rem'
              },
              '& .Mui-selected': {
                color: '#6C5CE7 !important'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#6C5CE7'
              }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i className='tabler-scale' />
                  <span>Balance General</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i className='tabler-chart-pie' />
                  <span>Estado de Resultados (P&L)</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i className='tabler-books' />
                  <span>Libro Mayor</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i className='tabler-list-check' />
                  <span>Balance de Comprobación</span>
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Contenido del Reporte Seleccionado */}
        {loading ? (
          <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant='rectangular' height={50} sx={{ borderRadius: '12px' }} />
            <Skeleton variant='rectangular' height={180} sx={{ borderRadius: '12px' }} />
            <Skeleton variant='rectangular' height={100} sx={{ borderRadius: '12px' }} />
          </Box>
        ) : (
          <>
            {activeTab === 0 && (
              <BalanceSheetTable rows={balanceSheetRows} currencyMode={currencyMode} />
            )}

            {activeTab === 1 && (
              <ProfitAndLossTable rows={pnlRows} currencyMode={currencyMode} />
            )}

            {activeTab === 2 && (
              <GeneralLedgerTable entries={entries} currencyMode={currencyMode} />
            )}

            {activeTab === 3 && (
              <TrialBalanceTable accounts={accounts} currencyMode={currencyMode} tasaBcv={tasaBcv} />
            )}
          </>
        )}
      </Card>

      {/* Toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='info' sx={{ borderRadius: '12px' }} onClose={() => setToastMessage(null)}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
