'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'

import type { InventoryFilterState, ProductTemplate } from '@/types/inventoryTypes'
import {
  getInventoryFiscalConfig,
  getProductCategories,
  searchInventoryTemplates,
  setInventoryFiscalEnabled
} from '@/services/inventoryService'
import InventoryTable from './InventoryTable'
import StockAdjustmentModal from './components/StockAdjustmentModal'

const InventoryCatalogView = () => {
  const router = useRouter()
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [fiscalEnabled, setFiscalEnabled] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)

  // Server-side filter & pagination state
  const [filters, setFilters] = useState<InventoryFilterState>({
    search: '',
    productType: 'ALL',
    category: 'ALL',
    stockStatus: 'ALL',
    operation: 'ALL'
  })

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const requestIdRef = useRef(0)

  // Modals
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductTemplate | null>(null)

  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'info' | 'warning'
  }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)

    return () => clearTimeout(timer)
  }, [filters.search])

  useEffect(() => {
    const initMetadata = async () => {
      try {
        const [fiscalConfig, cats] = await Promise.all([
          getInventoryFiscalConfig(),
          getProductCategories()
        ])

        setFiscalEnabled(fiscalConfig.enabled)
        setCategories(cats.map(c => c.name))
      } catch (err) {
        console.error('[InventoryCatalogView] Error cargando metadatos:', err)
      }
    }

    void initMetadata()
  }, [])

  const loadCatalog = useCallback(async () => {
    const reqId = ++requestIdRef.current
    const needsClientRefinement = filters.stockStatus !== 'ALL' || filters.operation !== 'ALL'

    setTableLoading(true)

    try {
      const result = await searchInventoryTemplates({
        search: debouncedSearch,
        productType: filters.productType,
        category: filters.category,
        take: needsClientRefinement ? 100 : rowsPerPage,
        skip: needsClientRefinement ? 0 : page * rowsPerPage
      })

      if (reqId !== requestIdRef.current) return

      setTemplates(result.items)
      setTotalCount(result.total)
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false)
        setTableLoading(false)
      }
    }
  }, [debouncedSearch, filters.productType, filters.category, filters.stockStatus, filters.operation, page, rowsPerPage])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const handleToggleFiscal = (enabled: boolean) => {
    setFiscalEnabled(enabled)
    void setInventoryFiscalEnabled(enabled)
  }

  const handleOpenEdit = (product: ProductTemplate) => {
    router.push(`/inventory/products/${product.id}`)
  }

  const handleOpenAdjust = (product: ProductTemplate) => {
    setAdjustingProduct(product)
    setAdjustModalOpen(true)
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
            Productos
          </Typography>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          <Button
            component={Link}
            href='/inventory/products/create'
            variant='contained'
            startIcon={<i className='tabler-plus text-base' />}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              px: 3.5,
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* Main Catalog Table or Skeleton */}
      {loading ? (
        <div className='bg-[#FFFFFF] p-6 rounded-2xl border border-[#E6E4F0] flex flex-col gap-3'>
          <Skeleton variant='rounded' height={48} />
          <Skeleton variant='rounded' height={340} />
        </div>
      ) : (
        <InventoryTable
          initialTemplates={templates}
          fiscalEnabled={fiscalEnabled}
          onToggleFiscal={handleToggleFiscal}
          onEditProduct={handleOpenEdit}
          onAdjustStock={handleOpenAdjust}
          serverPagination={{
            filters,
            onFiltersChange: setFilters,
            page,
            rowsPerPage,
            totalCount,
            onPageChange: setPage,
            onRowsPerPageChange: setRowsPerPage,
            categories,
            loading: tableLoading
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        templates={templates}
        preselectedProductId={adjustingProduct?.id}
        onSuccess={adj => {
          loadCatalog()
          setToast({
            open: true,
            message: `Ajuste ${adj.correlativo} aplicado: nuevo stock disponible ${adj.stock_contado} ${adj.uom_code}`,
            severity: 'success'
          })
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          sx={{ borderRadius: '14px', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default InventoryCatalogView
