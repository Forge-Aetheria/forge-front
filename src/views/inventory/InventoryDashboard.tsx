'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'

// Type Imports
import type { ProductTemplate, InventoryKPIs } from '@/types/inventoryTypes'
import {
  getInventoryTemplates,
  calculateInventoryKPIs,
  getFiscalConfig,
  setFiscalConfigEnabled
} from '@/services/inventoryService'

// Component Imports
import InventoryStatsCards from './InventoryStatsCards'
import InventoryTable from './InventoryTable'

const InventoryDashboard = () => {
  // States
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [kpis, setKpis] = useState<InventoryKPIs>({
    totalItems: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  })
  const [fiscalEnabled, setFiscalEnabled] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const data = await getInventoryTemplates()
      const stats = calculateInventoryKPIs(data)
      const fiscalConfig = getFiscalConfig()

      setTemplates(data)
      setKpis(stats)
      setFiscalEnabled(fiscalConfig.enabled)
      setLoading(false)
    }

    loadData()
  }, [])

  const handleToggleFiscal = (enabled: boolean) => {
    setFiscalEnabled(enabled)
    setFiscalConfigEnabled(enabled)
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[300px]'>
        <Typography>Cargando catálogo de inventario...</Typography>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Page Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <Typography variant='h4' className='font-bold'>
            Inventario & Catálogo de Productos
          </Typography>
          <Typography variant='body2' className='text-textSecondary'>
            Gestión centralizada de existencias, variantes físicas, precios y kardex
          </Typography>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <InventoryStatsCards kpis={kpis} />

      {/* Inventory Table */}
      <InventoryTable
        initialTemplates={templates}
        fiscalEnabled={fiscalEnabled}
        onToggleFiscal={handleToggleFiscal}
      />
    </div>
  )
}

export default InventoryDashboard
