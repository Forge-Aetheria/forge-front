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
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

// Type Imports
import type { ProductTemplate, InventoryFilterState } from '@/types/inventoryTypes'
import { calculateFinancials } from '@/services/inventoryService'

// Component Imports
import InventoryTableFilters from './InventoryTableFilters'
import InventoryQuickViewDrawer from './InventoryQuickViewDrawer'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

type Props = {
  initialTemplates: ProductTemplate[]
  fiscalEnabled: boolean
  onToggleFiscal: (enabled: boolean) => void
}

const InventoryTable = ({ initialTemplates, fiscalEnabled, onToggleFiscal }: Props) => {
  // States
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [filters, setFilters] = useState<InventoryFilterState>({
    search: '',
    productType: 'ALL',
    category: 'ALL',
    stockStatus: 'ALL',
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

  // Filter and search logic
  const filteredTemplates = useMemo(() => {
    return initialTemplates.filter(template => {
      // Search
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

      // Product Type
      if (filters.productType !== 'ALL' && template.productType !== filters.productType) {
        return false
      }

      // Category
      if (filters.category !== 'ALL' && template.categoryName !== filters.category) {
        return false
      }

      // Operation
      if (filters.operation === 'CAN_SELL' && !template.canBeSold) return false
      if (filters.operation === 'CAN_BUY' && !template.canBePurchased) return false

      // Stock Status
      if (filters.stockStatus !== 'ALL' && template.productType !== 'service') {
        const totalAvailable = template.variants.reduce((acc, v) => acc + v.availableStock, 0)

        if (filters.stockStatus === 'OUT_OF_STOCK' && totalAvailable > 0) return false
        if (
          filters.stockStatus === 'LOW_STOCK' &&
          (totalAvailable === 0 || (template.minStock && totalAvailable > template.minStock))
        ) {
          return false
        }
        if (filters.stockStatus === 'IN_STOCK' && (template.minStock ? totalAvailable <= template.minStock : totalAvailable === 0)) {
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTemplates.map(t => t.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  return (
    <Card className='overflow-hidden'>
      {/* Filters Section */}
      <InventoryTableFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        fiscalEnabled={fiscalEnabled}
        onToggleFiscal={onToggleFiscal}
        categories={categories}
      />

      {/* Table Section */}
      <div className='overflow-x-auto'>
        <Table className={tableStyles.table}>
          <TableHead>
            <TableRow>
              <TableCell padding='checkbox'>
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < filteredTemplates.length}
                  checked={filteredTemplates.length > 0 && selectedIds.length === filteredTemplates.length}
                  onChange={e => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell className='text-xs font-bold uppercase'>Artículo / SKU</TableCell>
              <TableCell className='text-xs font-bold uppercase'>Tipo</TableCell>
              <TableCell className='text-xs font-bold uppercase'>Variantes</TableCell>
              <TableCell className='text-xs font-bold uppercase text-center'>Stock Disp.</TableCell>
              <TableCell className='text-xs font-bold uppercase'>Costo / Venta</TableCell>
              {fiscalEnabled && <TableCell className='text-xs font-bold uppercase'>Alícuota SENIAT</TableCell>}
              <TableCell className='text-xs font-bold uppercase text-center'>Estado</TableCell>
              <TableCell className='text-xs font-bold uppercase text-right'>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fiscalEnabled ? 9 : 8} className='text-center py-8 text-textSecondary'>
                  <i className='tabler-package-off text-3xl mb-2 inline-block' />
                  <Typography>No se encontraron artículos con los filtros seleccionados.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTemplates.map(template => {
                const financials = calculateFinancials(
                  template.standardCost,
                  template.basePrice,
                  template.vatRate,
                  fiscalEnabled
                )

                const isSelected = selectedIds.includes(template.id)
                const totalAvailable = template.variants.reduce((acc, v) => acc + v.availableStock, 0)
                const isService = template.productType === 'service'
                const isOutOfStock = !isService && totalAvailable === 0
                const isLowStock = !isService && !isOutOfStock && template.minStock && totalAvailable <= template.minStock

                return (
                  <TableRow
                    key={template.id}
                    hover
                    selected={isSelected}
                    className='cursor-pointer'
                    onClick={() => handleOpenDrawer(template)}
                  >
                    <TableCell padding='checkbox' onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onChange={() => handleSelectRow(template.id)} />
                    </TableCell>

                    {/* Article Info */}
                    <TableCell>
                      <div className='flex flex-col'>
                        <Typography className='font-semibold text-textPrimary hover:text-primary transition-colors'>
                          {template.name}
                        </Typography>
                        <div className='flex items-center gap-2 mbs-0.5'>
                          <Typography variant='caption' className='font-mono text-primary font-bold'>
                            {template.defaultCode}
                          </Typography>
                          <Typography variant='caption' className='text-textDisabled'>•</Typography>
                          <Typography variant='caption' className='text-textSecondary'>
                            {template.categoryName}
                          </Typography>
                        </div>
                      </div>
                    </TableCell>

                    {/* Type Badge */}
                    <TableCell>
                      <Chip
                        size='small'
                        label={
                          template.productType === 'storable'
                            ? 'Almacenable'
                            : template.productType === 'consumable'
                            ? 'Consumible'
                            : 'Servicio'
                        }
                        color={
                          template.productType === 'storable'
                            ? 'primary'
                            : template.productType === 'consumable'
                            ? 'warning'
                            : 'info'
                        }
                        variant='tonal'
                        className='text-[11px] h-6'
                      />
                    </TableCell>

                    {/* Variants */}
                    <TableCell>
                      {template.variants.length > 1 ? (
                        <Chip
                          size='small'
                          label={`${template.variants.length} Variantes`}
                          color='secondary'
                          variant='outlined'
                          icon={<i className='tabler-grid-dots text-xs' />}
                          className='text-[11px] font-medium'
                        />
                      ) : (
                        <Typography variant='caption' className='text-textSecondary italic'>
                          Simple
                        </Typography>
                      )}
                    </TableCell>

                    {/* Stock Available */}
                    <TableCell className='text-center'>
                      {isService ? (
                        <Typography variant='caption' className='text-textDisabled'>N/A</Typography>
                      ) : (
                        <div className='flex flex-col items-center'>
                          <Typography
                            variant='body2'
                            className={
                              isOutOfStock
                                ? 'text-error font-bold'
                                : isLowStock
                                ? 'text-warning font-bold'
                                : 'text-success font-bold'
                            }
                          >
                            {totalAvailable} {template.uomCode}
                          </Typography>
                          {template.minStock && (
                            <Typography variant='caption' className='text-textDisabled text-[10px]'>
                              Min: {template.minStock}
                            </Typography>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Financials (Cost / Price & Margin) */}
                    <TableCell>
                      <div className='flex flex-col'>
                        <div className='flex items-center gap-1.5'>
                          <Typography variant='caption' className='text-textSecondary font-mono'>
                            ${financials.netCost.toFixed(2)}
                          </Typography>
                          <Typography variant='caption' className='text-textDisabled'>/</Typography>
                          <Typography variant='body2' className='font-bold text-textPrimary font-mono'>
                            ${financials.netPrice.toFixed(2)}
                          </Typography>
                        </div>
                        <Typography variant='caption' className='text-success font-semibold text-[11px]'>
                          Margen: {financials.marginPercentage.toFixed(1)}%
                        </Typography>
                      </div>
                    </TableCell>

                    {/* Fiscal / SENIAT Column (Conditional) */}
                    {fiscalEnabled && (
                      <TableCell>
                        <Chip
                          size='small'
                          label={financials.taxLabel || 'N/A'}
                          color={template.vatRate === 'EXEMPT' ? 'default' : 'primary'}
                          variant='tonal'
                          className='text-[11px]'
                        />
                      </TableCell>
                    )}

                    {/* Stock Status Badge */}
                    <TableCell className='text-center'>
                      {isService ? (
                        <Chip size='small' label='Servicio' variant='outlined' color='info' className='text-[11px]' />
                      ) : isOutOfStock ? (
                        <Chip size='small' label='Agotado' color='error' variant='tonal' className='text-[11px]' />
                      ) : isLowStock ? (
                        <Chip size='small' label='Stock Bajo' color='warning' variant='tonal' className='text-[11px]' />
                      ) : (
                        <Chip size='small' label='En Stock' color='success' variant='tonal' className='text-[11px]' />
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className='text-right' onClick={e => e.stopPropagation()}>
                      <div className='flex items-center justify-end gap-1'>
                        <Tooltip title='Vista Rápida' placement='top'>
                          <IconButton size='small' onClick={() => handleOpenDrawer(template)}>
                            <i className='tabler-eye text-lg text-textSecondary' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Ficha Completa' placement='top'>
                          <IconButton size='small' component={Link} href={`/inventory/${template.id}`}>
                            <i className='tabler-arrow-up-right text-lg text-primary' />
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
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`}
      />

      {/* Quick View Drawer */}
      <InventoryQuickViewDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        template={selectedTemplate}
        fiscalEnabled={fiscalEnabled}
      />
    </Card>
  )
}

export default InventoryTable
