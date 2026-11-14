'use client'

// MUI Imports
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'

// Type Imports
import type { InventoryFilterState } from '@/types/inventoryTypes'

type Props = {
  filters: InventoryFilterState
  onFilterChange: (key: keyof InventoryFilterState, value: any) => void
  fiscalEnabled: boolean
  onToggleFiscal: (enabled: boolean) => void
  categories: string[]
  onResetFilters?: () => void
}

const InventoryTableFilters = ({
  filters,
  onFilterChange,
  categories,
  onResetFilters
}: Props) => {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.productType !== 'ALL' ||
    filters.category !== 'ALL' ||
    filters.stockStatus !== 'ALL' ||
    filters.operation !== 'ALL'

  return (
    <CardContent className='p-5 flex flex-col gap-4 border-b border-[#E6E4F0] bg-[#FFFFFF]'>
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
          Filtros
        </Typography>

        {hasActiveFilters && onResetFilters && (
          <Button
            size='small'
            variant='text'
            color='secondary'
            onClick={onResetFilters}
            startIcon={<i className='tabler-filter-off text-sm' />}
            sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <Grid container spacing={2.5} alignItems='center'>
        {/* Search */}
        <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
          <CustomTextField
            fullWidth
            size='small'
            placeholder='Buscar por Nombre, SKU, EAN o Tag...'
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='tabler-search text-base text-[#6B7280]' />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>

        {/* Product Type Filter */}
        <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
          <CustomTextField
            select
            fullWidth
            size='small'
            value={filters.productType}
            onChange={e => onFilterChange('productType', e.target.value)}
          >
            <MenuItem value='ALL'>Todos los Tipos</MenuItem>
            <MenuItem value='storable'>Almacenable (Kárdex)</MenuItem>
            <MenuItem value='consumable'>Consumible</MenuItem>
            <MenuItem value='service'>Servicio (Intangible)</MenuItem>
          </CustomTextField>
        </Grid>

        {/* Category Filter */}
        <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
          <CustomTextField
            select
            fullWidth
            size='small'
            value={filters.category}
            onChange={e => onFilterChange('category', e.target.value)}
          >
            <MenuItem value='ALL'>Todas las Categorías</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>

        {/* Stock Status Filter */}
        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
          <CustomTextField
            select
            fullWidth
            size='small'
            value={filters.stockStatus}
            onChange={e => onFilterChange('stockStatus', e.target.value)}
          >
            <MenuItem value='ALL'>Todo Estado Stock</MenuItem>
            <MenuItem value='IN_STOCK'>En Stock Normal</MenuItem>
            <MenuItem value='LOW_STOCK'>Stock Bajo (Alerta)</MenuItem>
            <MenuItem value='OUT_OF_STOCK'>Agotados (0)</MenuItem>
          </CustomTextField>
        </Grid>

        {/* Operative Filter / Reset */}
        <Grid size={{ xs: 12, sm: 4, md: 1.5 }} className='flex items-center gap-1'>
          <CustomTextField
            select
            fullWidth
            size='small'
            value={filters.operation}
            onChange={e => onFilterChange('operation', e.target.value)}
          >
            <MenuItem value='ALL'>Operación: Todas</MenuItem>
            <MenuItem value='CAN_SELL'>Para Venta</MenuItem>
            <MenuItem value='CAN_BUY'>Para Compra</MenuItem>
          </CustomTextField>

          {hasActiveFilters && onResetFilters && (
            <Button
              size='small'
              onClick={onResetFilters}
              sx={{
                minWidth: 'auto',
                p: 1,
                borderRadius: '9999px',
                color: '#EF4444'
              }}
              title='Limpiar filtros'
            >
              <i className='tabler-filter-off text-base' />
            </Button>
          )}
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default InventoryTableFilters
