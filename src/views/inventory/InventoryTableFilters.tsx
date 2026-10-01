'use client'

// MUI Imports
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'

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
}

const InventoryTableFilters = ({
  filters,
  onFilterChange,
  fiscalEnabled,
  onToggleFiscal,
  categories
}: Props) => {
  return (
    <CardContent className='flex flex-col gap-4 border-b border-[var(--mui-palette-divider)]'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <Typography variant='h5' className='font-semibold'>
          Catálogo Maestro de Artículos
        </Typography>

        {/* Feature Flag: Localización Fiscal SENIAT */}
        <div className='flex items-center gap-2 bg-[var(--mui-palette-action-hover)] px-3 py-1 rounded-lg border border-[var(--mui-palette-divider)]'>
          <i className='tabler-receipt-tax text-primary text-lg' />
          <FormControlLabel
            control={
              <Switch
                size='small'
                checked={fiscalEnabled}
                onChange={e => onToggleFiscal(e.target.checked)}
              />
            }
            label={
              <Typography variant='body2' className='font-medium select-none'>
                Localización Fiscal (SENIAT / IVA)
              </Typography>
            }
            className='m-0'
          />
        </div>
      </div>

      <Grid container spacing={4}>
        {/* Search */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <CustomTextField
            fullWidth
            placeholder='Buscar por Nombre, SKU, Código EAN o Tag...'
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='tabler-search text-xl' />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>

        {/* Product Type Filter */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            select
            fullWidth
            value={filters.productType}
            onChange={e => onFilterChange('productType', e.target.value)}
          >
            <MenuItem value='ALL'>Todos los Tipos</MenuItem>
            <MenuItem value='storable'>📦 Almacenable (Kardex)</MenuItem>
            <MenuItem value='consumable'>🧻 Consumible</MenuItem>
            <MenuItem value='service'>💼 Servicio (Intangible)</MenuItem>
          </CustomTextField>
        </Grid>

        {/* Category Filter */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            select
            fullWidth
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

        {/* Operative Filter */}
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <CustomTextField
            select
            fullWidth
            value={filters.operation}
            onChange={e => onFilterChange('operation', e.target.value)}
          >
            <MenuItem value='ALL'>Toda Operación</MenuItem>
            <MenuItem value='CAN_SELL'>Para la Venta</MenuItem>
            <MenuItem value='CAN_BUY'>Para la Compra</MenuItem>
          </CustomTextField>
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default InventoryTableFilters
