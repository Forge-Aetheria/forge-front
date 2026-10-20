'use client'

// React Imports
import { useState, useMemo } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'

// Type Imports
import type { ProductTemplate, InventoryFilterState } from '@/types/inventoryTypes'
import { calculateFinancials } from '@/services/inventoryService'

// Component Imports
import InventoryTableFilters from './InventoryTableFilters'
import InventoryQuickViewDrawer from './InventoryQuickViewDrawer'
import InventoryMobileList from './components/InventoryMobileList'

type Props = {
  initialTemplates: ProductTemplate[]
  fiscalEnabled: boolean
  onToggleFiscal: (enabled: boolean) => void
  onEditProduct?: (template: ProductTemplate) => void
  onAdjustStock?: (template: ProductTemplate) => void
  initialStockStatusFilter?: InventoryFilterState['stockStatus']
}

const InventoryTable = ({
  initialTemplates,
  fiscalEnabled,
  onToggleFiscal,
  onEditProduct,
  onAdjustStock,
  initialStockStatusFilter = 'ALL'
}: Props) => {
  // States
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Selección múltiple y control de columnas
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = useState<{
    tipo: boolean
    variantes: boolean
    stock: boolean
    precios: boolean
    iva: boolean
    estado: boolean
  }>({
    tipo: true,
    variantes: true,
    stock: true,
    precios: true,
    iva: true,
    estado: true
  })
  const [columnAnchorEl, setColumnAnchorEl] = useState<HTMLElement | null>(null)
  const [batchMenuAnchorEl, setBatchMenuAnchorEl] = useState<HTMLElement | null>(null)

  const [filters, setFilters] = useState<InventoryFilterState>({
    search: '',
    productType: 'ALL',
    category: 'ALL',
    stockStatus: initialStockStatusFilter,
    operation: 'ALL'
  })

  // Extract unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(initialTemplates.map(t => t.categoryName)))
  }, [initialTemplates])

  const handleFilterChange = (key: keyof InventoryFilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const handleResetFilters = () => {
    setFilters({
      search: '',
      productType: 'ALL',
      category: 'ALL',
      stockStatus: 'ALL',
      operation: 'ALL'
    })
    setPage(0)
  }

  // Filter and search logic
  const filteredTemplates = useMemo(() => {
    return initialTemplates.filter(template => {
      if (filters.search) {
        const query = filters.search.toLowerCase()
        const matchName = template.name.toLowerCase().includes(query)
        const matchCode = template.defaultCode.toLowerCase().includes(query)
        const matchBarcode = template.barcode?.toLowerCase().includes(query)
        const matchTag = template.tags.some(tag => tag.toLowerCase().includes(query))
        const matchVariantSku = template.variants.some(v => v.sku.toLowerCase().includes(query))

        if (!matchName && !matchCode && !matchBarcode && !matchTag && !matchVariantSku) {
          return false
        }
      }

      if (filters.productType !== 'ALL' && template.productType !== filters.productType) {
        return false
      }

      if (filters.category !== 'ALL' && template.categoryName !== filters.category) {
        return false
      }

      if (filters.operation === 'CAN_SELL' && !template.canBeSold) return false
      if (filters.operation === 'CAN_BUY' && !template.canBePurchased) return false

      if (filters.stockStatus !== 'ALL') {
        if (template.productType === 'service') return false
        const totalAvailable = template.variants.reduce((acc, v) => acc + v.availableStock, 0)

        if (filters.stockStatus === 'OUT_OF_STOCK' && totalAvailable > 0) return false
        if (
          filters.stockStatus === 'LOW_STOCK' &&
          (totalAvailable === 0 || !template.minStock || totalAvailable > template.minStock)
        ) {
          return false
        }
        if (
          filters.stockStatus === 'IN_STOCK' &&
          (totalAvailable === 0 || (template.minStock && totalAvailable <= template.minStock))
        ) {
          return false
        }
      }

      return true
    })
  }, [initialTemplates, filters])

  // Pagination slice
  const paginatedTemplates = useMemo(() => {
    return filteredTemplates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredTemplates, page, rowsPerPage])

  const handleOpenDrawer = (template: ProductTemplate) => {
    setSelectedTemplate(template)
    setDrawerOpen(true)
  }

  const isAllSelected = paginatedTemplates.length > 0 && paginatedTemplates.every(t => selectedIds.includes(t.id))
  const isSomeSelected = paginatedTemplates.some(t => selectedIds.includes(t.id)) && !isAllSelected

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedTemplates.map(t => t.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleBatchCopySkus = () => {
    const selected = initialTemplates.filter(t => selectedIds.includes(t.id))
    const codes = selected.map(t => t.defaultCode).join(', ')
    navigator.clipboard.writeText(codes)
    setBatchMenuAnchorEl(null)
  }

  const colSpanCount = [
    true, // checkbox
    true, // #
    true, // Artículo
    visibleColumns.tipo,
    visibleColumns.variantes,
    visibleColumns.stock,
    visibleColumns.precios,
    fiscalEnabled && visibleColumns.iva,
    visibleColumns.estado,
    true // Acciones
  ].filter(Boolean).length

  return (
    <Card
      sx={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E6E4F0',
        boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
        overflow: 'hidden'
      }}
    >
      {/* Filters Section */}
      <InventoryTableFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        fiscalEnabled={fiscalEnabled}
        onToggleFiscal={onToggleFiscal}
        categories={categories}
        onResetFilters={handleResetFilters}
      />

      {/* Barra de Herramientas de Tabla: Conteo, Acciones en Lote y Columnas */}
      <div className='flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-b border-[#E6E4F0] bg-[#FAF9FF]'>
        <div className='flex items-center gap-3 flex-wrap'>
          <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF]'>
            {filteredTemplates.length} {filteredTemplates.length === 1 ? 'artículo' : 'artículos'}
          </span>

          {selectedIds.length > 0 && (
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-1.5 bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF] px-3 py-1.5 rounded-full text-xs font-semibold'>
                <span>{selectedIds.length} seleccionados</span>
                <Tooltip title='Deseleccionar'>
                  <IconButton
                    size='small'
                    onClick={() => setSelectedIds([])}
                    sx={{ p: 0.2, ml: 0.5, color: '#6C5CE7', '&:hover': { color: '#4B3AA6' } }}
                  >
                    <i className='tabler-x text-xs' />
                  </IconButton>
                </Tooltip>
              </div>

              <Button
                size='small'
                variant='outlined'
                onClick={e => setBatchMenuAnchorEl(e.currentTarget)}
                startIcon={<i className='tabler-settings text-base' />}
                endIcon={<i className='tabler-chevron-down text-xs' />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#1E1B2E',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  px: 2,
                  py: 0.6,
                  backgroundColor: '#FFFFFF',
                  '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                }}
              >
                Acciones
              </Button>
            </div>
          )}
        </div>

        <div className='flex items-center gap-3'>
          <Typography variant='caption' className='text-[#6B7280] hidden lg:inline'>
            Haz clic en cualquier fila para consultar el artículo
          </Typography>
          <Button
            size='small'
            variant='outlined'
            startIcon={<i className='tabler-layout-columns text-base' />}
            onClick={e => setColumnAnchorEl(e.currentTarget)}
            sx={{
              borderRadius: '9999px',
              borderColor: '#E6E4F0',
              color: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 2,
              py: 0.6,
              backgroundColor: '#FFFFFF',
              '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F3F0FF' }
            }}
          >
            Columnas
          </Button>
        </div>
      </div>

      {/* Mobile View (< 768px) */}
      <div className='block md:hidden'>
        <InventoryMobileList
          templates={paginatedTemplates}
          fiscalEnabled={fiscalEnabled}
          onQuickView={handleOpenDrawer}
          onEdit={t => onEditProduct?.(t)}
          onAdjustStock={t => onAdjustStock?.(t)}
        />
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className='hidden md:block overflow-x-auto'>
        <Table size='small'>
          <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
            <TableRow>
              {/* Checkbox Maestro */}
              <TableCell padding='checkbox' sx={{ width: 44, minWidth: 44, pl: 2, pr: 0 }}>
                <Checkbox
                  size='small'
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onChange={e => handleToggleSelectAll(e.target.checked)}
                  sx={{
                    color: '#DCD8EC',
                    '&.Mui-checked': { color: '#6C5CE7' },
                    '&.MuiCheckbox-indeterminate': { color: '#6C5CE7' },
                    p: 0.5
                  }}
                />
              </TableCell>

              {/* EARS-UB-05: Columna de índice compacta 28px */}
              <TableCell
                sx={{
                  width: 28,
                  minWidth: 28,
                  maxWidth: 32,
                  px: 0.5,
                  py: 1.5,
                  fontWeight: 700,
                  color: '#6B7280',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em'
                }}
              >
                #
              </TableCell>
              <TableCell sx={{ py: 1.5, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                ARTÍCULO / SKU
              </TableCell>
              {visibleColumns.tipo && (
                <TableCell sx={{ py: 1.5, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  TIPO
                </TableCell>
              )}
              {visibleColumns.variantes && (
                <TableCell sx={{ py: 1.5, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  VARIANTES
                </TableCell>
              )}
              {visibleColumns.stock && (
                <TableCell
                  align='center'
                  sx={{ py: 1.5, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem', letterSpacing: '0.05em' }}
                >
                  STOCK DISP.
                </TableCell>
              )}
              {visibleColumns.precios && (
                <TableCell sx={{ py: 1.5, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  COSTO / PRECIO VENTA
                </TableCell>
              )}
              {fiscalEnabled && visibleColumns.iva && (
                <TableCell
                  align='center'
                  sx={{
                    width: 60,
                    minWidth: 60,
                    px: 0.5,
                    py: 1.5,
                    fontWeight: 700,
                    color: '#6B7280',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em'
                  }}
                >
                  IVA
                </TableCell>
              )}
              {visibleColumns.estado && (
                <TableCell
                  align='center'
                  sx={{ py: 1.5, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem', letterSpacing: '0.05em' }}
                >
                  ESTADO
                </TableCell>
              )}
              <TableCell
                align='right'
                sx={{ py: 1.5, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem', pr: 2, letterSpacing: '0.05em' }}
              >
                ACCIONES
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTemplates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpanCount}
                  className='text-center py-10 text-[#6B7280]'
                >
                  <i className='tabler-package-off text-3xl mb-2 inline-block text-[#9CA3AF]' />
                  <Typography variant='body2'>
                    No se encontraron artículos con los filtros seleccionados.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTemplates.map((template, idx) => {
                const financials = calculateFinancials(
                  template.standardCost,
                  template.basePrice,
                  template.vatRate,
                  fiscalEnabled
                )

                const totalAvailable = template.variants.reduce((acc, v) => acc + v.availableStock, 0)
                const isService = template.productType === 'service'
                const isOutOfStock = !isService && totalAvailable === 0
                const isLowStock =
                  !isService &&
                  !isOutOfStock &&
                  Boolean(template.minStock && totalAvailable <= template.minStock)
                const isSelected = selectedIds.includes(template.id)

                return (
                  <TableRow
                    key={template.id}
                    hover
                    selected={isSelected}
                    className='cursor-pointer transition-colors'
                    onClick={() => handleOpenDrawer(template)}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(108, 92, 231, 0.08) !important'
                      },
                      '&:hover': {
                        backgroundColor: isSelected ? 'rgba(108, 92, 231, 0.12) !important' : '#FAFAFC !important'
                      }
                    }}
                  >
                    {/* Checkbox de fila */}
                    <TableCell
                      padding='checkbox'
                      sx={{ width: 44, minWidth: 44, pl: 2, pr: 0 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <Checkbox
                        size='small'
                        checked={isSelected}
                        onChange={() => handleToggleSelect(template.id)}
                        sx={{
                          color: '#DCD8EC',
                          '&.Mui-checked': { color: '#6C5CE7' },
                          p: 0.5
                        }}
                      />
                    </TableCell>

                    {/* # Index */}
                    <TableCell
                      sx={{
                        width: 28,
                        minWidth: 28,
                        maxWidth: 32,
                        px: 0.5,
                        py: 1.2,
                        color: '#9CA3AF',
                        fontSize: '0.78rem',
                        textAlign: 'center'
                      }}
                    >
                      {page * rowsPerPage + idx + 1}
                    </TableCell>

                    {/* Article Info */}
                    <TableCell sx={{ py: 1.2 }}>
                      <div className='flex flex-col'>
                        <span className='font-bold text-sm text-[#1E1B2E] hover:text-[#6C5CE7] transition-colors'>
                          {template.name}
                        </span>
                        <div className='flex items-center gap-2 mt-0.5'>
                          <span className='font-mono text-xs text-[#6C5CE7] font-bold'>
                            {template.defaultCode}
                          </span>
                          <span className='text-[#DCD8EC]'>•</span>
                          <span className='text-xs text-[#6B7280]'>{template.categoryName}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Type Badge */}
                    {visibleColumns.tipo && (
                      <TableCell sx={{ py: 1.2 }}>
                        <Chip
                          size='small'
                          label={
                            template.productType === 'storable'
                              ? 'Almacenable'
                              : template.productType === 'consumable'
                              ? 'Consumible'
                              : 'Servicio'
                          }
                          sx={{
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            height: 22,
                            backgroundColor:
                              template.productType === 'storable'
                                ? '#F0EEF9'
                                : template.productType === 'consumable'
                                ? '#FEF3C7'
                                : '#E0F2FE',
                            color:
                              template.productType === 'storable'
                                ? '#6C5CE7'
                                : template.productType === 'consumable'
                                ? '#D97706'
                                : '#0284C7'
                          }}
                        />
                      </TableCell>
                    )}

                    {/* Variants */}
                    {visibleColumns.variantes && (
                      <TableCell sx={{ py: 1.2 }}>
                        {template.variants.length > 1 ? (
                          <Chip
                            size='small'
                            label={`${template.variants.length} Variantes`}
                            icon={<i className='tabler-grid-dots text-xs text-[#6C5CE7]' />}
                            sx={{
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              height: 22,
                              backgroundColor: '#F8F7FC',
                              color: '#1E1B2E',
                              border: '1px solid #DCD8EC'
                            }}
                          />
                        ) : (
                          <span className='text-xs text-[#9CA3AF]'>Simple (1 SKU)</span>
                        )}
                      </TableCell>
                    )}

                    {/* Stock Available */}
                    {visibleColumns.stock && (
                      <TableCell align='center' sx={{ py: 1.2 }}>
                        {isService ? (
                          <span className='text-xs text-[#9CA3AF]'>N/A</span>
                        ) : (
                          <div className='flex flex-col items-center'>
                            <span
                              className={`text-sm font-bold ${
                                isOutOfStock
                                  ? 'text-[#EF4444]'
                                  : isLowStock
                                  ? 'text-[#F59E0B]'
                                  : 'text-[#10B981]'
                              }`}
                            >
                              {totalAvailable} {template.uomCode}
                            </span>
                            {template.minStock ? (
                              <span className='text-[10px] text-[#9CA3AF]'>
                                Mín: {template.minStock}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {/* Financials (Cost / Price & Margin + Dual VES) */}
                    {visibleColumns.precios && (
                      <TableCell sx={{ py: 1.2 }}>
                        <div className='flex flex-col'>
                          <div className='flex items-center gap-1.5'>
                            <span className='text-xs text-[#6B7280] font-mono'>
                              ${financials.netCost.toFixed(2)}
                            </span>
                            <span className='text-[#DCD8EC]'>/</span>
                            <span className='text-sm font-bold text-[#1E1B2E] font-mono'>
                              ${financials.netPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='text-[11px] text-[#10B981] font-semibold'>
                              Margen: {financials.marginPercentage.toFixed(1)}%
                            </span>
                            <span className='text-[10px] text-[#9CA3AF]'>
                              (Bs. {financials.netPriceVes.toFixed(2)})
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* EARS-UB-06: Monolínea compacta IVA 16% / 0% */}
                    {fiscalEnabled && visibleColumns.iva && (
                      <TableCell
                        align='center'
                        sx={{ width: 60, minWidth: 60, px: 0.5, py: 1.2 }}
                      >
                        <span
                          className={`inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-bold whitespace-nowrap leading-none select-none border ${
                            template.vatRate === 'EXEMPT' || template.vatRate === '0'
                              ? 'bg-[#F4F3F8] text-[#6B7280] border-[#DCD8EC]'
                              : 'bg-[#F0EEF9] text-[#6C5CE7] border-[#DCD8EC]'
                          }`}
                        >
                          {financials.taxLabel || '0%'}
                        </span>
                      </TableCell>
                    )}

                    {/* Stock Status Badge */}
                    {visibleColumns.estado && (
                      <TableCell align='center' sx={{ py: 1.2 }}>
                        <Chip
                          size='small'
                          label={
                            isService
                              ? 'Activo'
                              : isOutOfStock
                              ? 'Agotado'
                              : isLowStock
                              ? 'Stock Bajo'
                              : 'En Stock'
                          }
                          sx={{
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            height: 22,
                            backgroundColor: isService
                              ? '#E0F2FE'
                              : isOutOfStock
                              ? '#FEE2E2'
                              : isLowStock
                              ? '#FEF3C7'
                              : '#E8F5E9',
                            color: isService
                              ? '#0284C7'
                              : isOutOfStock
                              ? '#EF4444'
                              : isLowStock
                              ? '#D97706'
                              : '#10B981'
                          }}
                        />
                      </TableCell>
                    )}

                    {/* Actions (Estandarizados como en Contactos y Ventas) */}
                    <TableCell
                      align='right'
                      sx={{ py: 1.2 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className='flex items-center justify-end gap-1'>
                        <Tooltip title='Vista Rápida' placement='top'>
                          <IconButton size='small' onClick={() => handleOpenDrawer(template)}>
                            <i className='tabler-eye text-base text-[#6B7280]' />
                          </IconButton>
                        </Tooltip>
                        {!isService && onAdjustStock && (
                          <Tooltip title='Ajustar Stock Físico' placement='top'>
                            <IconButton size='small' onClick={() => onAdjustStock(template)}>
                              <i className='tabler-adjustments-horizontal text-base text-[#6B7280] hover:text-[#6C5CE7]' />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title='Editar Artículo' placement='top'>
                          <IconButton
                            size='small'
                            component={Link}
                            href={`/inventory/products/${template.id}`}
                          >
                            <i className='tabler-edit text-base text-[#6B7280] hover:text-[#6C5CE7]' />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component='div'
        count={filteredTemplates.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={e => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        labelRowsPerPage='Filas por página:'
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
        }
      />

      {/* Quick View Drawer */}
      <InventoryQuickViewDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        template={selectedTemplate}
        fiscalEnabled={fiscalEnabled}
        onEdit={onEditProduct}
        onAdjustStock={onAdjustStock}
      />

      {/* Menú de Personalización de Columnas */}
      <Menu
        anchorEl={columnAnchorEl}
        open={Boolean(columnAnchorEl)}
        onClose={() => setColumnAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 1,
              minWidth: 220,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <Typography variant='caption' className='font-bold text-[#6B7280] px-3 py-1 block uppercase text-[10px]'>
          Columnas Visibles
        </Typography>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, tipo: !prev.tipo }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.tipo)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Tipo de Producto</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, variantes: !prev.variantes }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.variantes)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Variantes</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, stock: !prev.stock }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.stock)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Stock Disponible</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, precios: !prev.precios }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.precios)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Costo / Precio Venta</Typography>
        </MenuItem>
        {fiscalEnabled && (
          <MenuItem
            dense
            onClick={() => setVisibleColumns(prev => ({ ...prev, iva: !prev.iva }))}
            sx={{ borderRadius: '8px' }}
          >
            <Checkbox
              checked={Boolean(visibleColumns.iva)}
              size='small'
              sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
            />
            <Typography variant='body2' className='text-sm'>Alícuota IVA</Typography>
          </MenuItem>
        )}
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, estado: !prev.estado }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.estado)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Estado</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          dense
          onClick={() => {
            setVisibleColumns({
              tipo: true,
              variantes: true,
              stock: true,
              precios: true,
              iva: true,
              estado: true
            })
            setColumnAnchorEl(null)
          }}
          sx={{ borderRadius: '8px', color: '#6C5CE7', fontWeight: 600, fontSize: '0.8rem' }}
        >
          <i className='tabler-rotate text-sm mr-2' /> Restablecer Columnas
        </MenuItem>
      </Menu>

      {/* Menú de Acciones en Lote */}
      <Menu
        anchorEl={batchMenuAnchorEl}
        open={Boolean(batchMenuAnchorEl)}
        onClose={() => setBatchMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 0.75,
              minWidth: 200,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <MenuItem
          onClick={handleBatchCopySkus}
          sx={{
            color: '#1E1B2E',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#F8F7FC' }
          }}
        >
          <i className='tabler-copy text-base text-[#6C5CE7]' />
          <span className='font-semibold text-sm'>Copiar códigos ({selectedIds.length})</span>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setBatchMenuAnchorEl(null)
            setSelectedIds([])
          }}
          sx={{
            color: '#6B7280',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#F9FAFB' }
          }}
        >
          <i className='tabler-x text-base text-[#6B7280]' />
          <span className='text-sm'>Deseleccionar</span>
        </MenuItem>
      </Menu>
    </Card>
  )
}

export default InventoryTable
