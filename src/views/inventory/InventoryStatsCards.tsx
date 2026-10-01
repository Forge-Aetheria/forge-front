'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

// Type Imports
import type { InventoryKPIs } from '@/types/inventoryTypes'

type Props = {
  kpis: InventoryKPIs
}

const InventoryStatsCards = ({ kpis }: Props) => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Total Catálogo'
          stats={kpis.totalItems.toString()}
          avatarIcon='tabler-packages'
          avatarColor='primary'
          trend='positive'
          trendNumber='12%'
          subtitle='Productos y Servicios'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Valor Inventario'
          stats={`$${kpis.totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          avatarIcon='tabler-currency-dollar'
          avatarColor='success'
          trend='positive'
          trendNumber='5.4%'
          subtitle='Costo de Existencias'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Stock Bajo'
          stats={kpis.lowStockCount.toString()}
          avatarIcon='tabler-alert-triangle'
          avatarColor='warning'
          trend='negative'
          trendNumber='2'
          subtitle='Alerta de Reposición'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Agotados'
          stats={kpis.outOfStockCount.toString()}
          avatarIcon='tabler-circle-x'
          avatarColor='error'
          trend='negative'
          trendNumber='1'
          subtitle='Sin Existencias'
        />
      </Grid>
    </Grid>
  )
}

export default InventoryStatsCards
