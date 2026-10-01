'use client'

// React Imports
import { useEffect, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'

// Type Imports
import type { ProductTemplate } from '@/types/inventoryTypes'
import { getInventoryTemplateById, calculateFinancials, getFiscalConfig } from '@/services/inventoryService'

type Props = {
  id: string
}

const InventoryDetailView = ({ id }: Props) => {
  // Hooks
  const router = useRouter()

  // States
  const [template, setTemplate] = useState<ProductTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [fiscalEnabled, setFiscalEnabled] = useState(true)

  useEffect(() => {
    const load = async () => {
      const data = await getInventoryTemplateById(id)
      const fiscal = getFiscalConfig()

      setTemplate(data)
      setFiscalEnabled(fiscal.enabled)
      setLoading(false)
    }

    load()
  }, [id])

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[300px]'>
        <Typography>Cargando información del artículo...</Typography>
      </div>
    )
  }

  if (!template) {
    return (
      <Card className='p-8 text-center'>
        <Typography variant='h5' className='text-error mb-2'>
          Artículo no encontrado
        </Typography>
        <Typography className='text-textSecondary mb-4'>
          El artículo con identificador &quot;{id}&quot; no existe en el catálogo.
        </Typography>
        <Button component={Link} href='/inventory' variant='contained' startIcon={<i className='tabler-arrow-left' />}>
          Volver al Inventario
        </Button>
      </Card>
    )
  }

  const financials = calculateFinancials(
    template.standardCost,
    template.basePrice,
    template.vatRate,
    fiscalEnabled
  )

  const totalPhysical = template.variants.reduce((acc, v) => acc + v.physicalStock, 0)
  const totalReserved = template.variants.reduce((acc, v) => acc + v.reservedStock, 0)
  const totalAvailable = template.variants.reduce((acc, v) => acc + v.availableStock, 0)

  return (
    <div className='flex flex-col gap-6'>
      {/* Top Navigation Bar */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div className='flex items-center gap-3'>
          <Button
            component={Link}
            href='/inventory'
            variant='tonal'
            size='small'
            startIcon={<i className='tabler-arrow-left' />}
          >
            Volver
          </Button>
          <div>
            <Typography variant='h4' className='font-bold flex items-center gap-2'>
              {template.name}
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
              />
            </Typography>
            <Typography variant='caption' className='text-textSecondary font-mono'>
              SKU Maestro: <strong>{template.defaultCode}</strong> · Categoría: <strong>{template.categoryName}</strong>
            </Typography>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {template.canBeSold && <Chip label='Para la Venta' color='success' variant='outlined' />}
          {template.canBePurchased && <Chip label='Para la Compra' color='secondary' variant='outlined' />}
        </div>
      </div>

      {/* Main Grid */}
      <Grid container spacing={6}>
        {/* Left Column: General & Variants */}
        <Grid size={{ xs: 12, md: 8 }} className='flex flex-col gap-6'>
          {/* General Info Card */}
          <Card>
            <CardHeader title='Ficha General del Artículo' />
            <Divider />
            <CardContent>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant='caption' className='text-textSecondary'>Nombre Oficial</Typography>
                  <Typography variant='body1' className='font-semibold'>{template.name}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant='caption' className='text-textSecondary'>Código Interno / SKU</Typography>
                  <Typography variant='body1' className='font-mono font-bold text-primary'>{template.defaultCode}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant='caption' className='text-textSecondary'>Código de Barras (EAN / UPC)</Typography>
                  <Typography variant='body1' className='font-mono'>{template.barcode || 'No registrado'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant='caption' className='text-textSecondary'>Unidad de Medida (UdM)</Typography>
                  <Typography variant='body1' className='font-semibold'>{template.uomCode}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant='caption' className='text-textSecondary'>Categoría de Producto</Typography>
                  <Typography variant='body1'>{template.categoryName}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant='caption' className='text-textSecondary'>Stock Mínimo de Alerta</Typography>
                  <Typography variant='body1'>{template.minStock ? `${template.minStock} ${template.uomCode}` : 'Sin límite'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant='caption' className='text-textSecondary'>Etiquetas (Tags)</Typography>
                  <div className='flex gap-1.5 flex-wrap mbs-1'>
                    {template.tags.map((tag, i) => (
                      <Chip key={i} label={tag} size='small' variant='tonal' />
                    ))}
                  </div>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Variants Table Card */}
          <Card>
            <CardHeader
              title={`Matriz de Variantes Físicas (${template.variants.length})`}
              subheader='Control estricto de SKUs individuales y stock de seguridad'
            />
            <Divider />
            <div className='overflow-x-auto'>
              <Table size='small'>
                <TableHead className='bg-[var(--mui-palette-action-hover)]'>
                  <TableRow>
                    <TableCell className='font-bold text-xs'>Variante</TableCell>
                    <TableCell className='font-bold text-xs'>SKU Específico</TableCell>
                    <TableCell className='font-bold text-xs'>Código EAN</TableCell>
                    <TableCell className='font-bold text-xs text-center'>Físico</TableCell>
                    <TableCell className='font-bold text-xs text-center'>Reservado</TableCell>
                    <TableCell className='font-bold text-xs text-center'>Disponible</TableCell>
                    <TableCell className='font-bold text-xs text-right'>Precio Final</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {template.variants.map((v, i) => (
                    <TableRow key={i} hover>
                      <TableCell className='text-xs'>
                        {v.combinationValues.length > 0
                          ? v.combinationValues.map(c => `${c.attributeName}: ${c.valueName}`).join(' · ')
                          : 'Estándar (Única)'}
                      </TableCell>
                      <TableCell className='text-xs font-mono font-bold'>{v.sku}</TableCell>
                      <TableCell className='text-xs font-mono text-textSecondary'>{v.barcode || '-'}</TableCell>
                      <TableCell className='text-xs text-center'>{v.physicalStock}</TableCell>
                      <TableCell className='text-xs text-center text-textSecondary'>{v.reservedStock}</TableCell>
                      <TableCell className='text-xs text-center font-bold text-success'>
                        {v.availableStock} {template.uomCode}
                      </TableCell>
                      <TableCell className='text-xs text-right font-bold'>
                        ${(template.basePrice + v.priceExtra).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </Grid>

        {/* Right Column: Financials & Fiscal Details */}
        <Grid size={{ xs: 12, md: 4 }} className='flex flex-col gap-6'>
          {/* Financials Summary */}
          <Card>
            <CardHeader title='Precios y Rentabilidad' />
            <Divider />
            <CardContent className='flex flex-col gap-4'>
              <div className='flex justify-between items-center'>
                <Typography variant='body2' className='text-textSecondary'>Costo Estándar:</Typography>
                <Typography variant='body1' className='font-mono font-bold'>${financials.netCost.toFixed(2)}</Typography>
              </div>
              <div className='flex justify-between items-center'>
                <Typography variant='body2' className='text-textSecondary'>Precio Venta Base:</Typography>
                <Typography variant='body1' className='font-mono font-bold text-primary'>${financials.netPrice.toFixed(2)}</Typography>
              </div>
              <div className='flex justify-between items-center'>
                <Typography variant='body2' className='text-textSecondary'>Margen Bruto:</Typography>
                <Typography variant='body1' className='font-bold text-success'>
                  {financials.marginPercentage.toFixed(1)}% (${financials.marginAmount.toFixed(2)})
                </Typography>
              </div>

              {fiscalEnabled && (
                <>
                  <Divider />
                  <Typography variant='caption' className='font-bold uppercase text-primary tracking-wider'>
                    Localización Fiscal (SENIAT)
                  </Typography>
                  <div className='flex justify-between items-center'>
                    <Typography variant='body2' className='text-textSecondary'>Alícuota Aplicable:</Typography>
                    <Chip size='small' label={financials.taxLabel || 'Exento'} color='primary' variant='tonal' />
                  </div>
                  <div className='flex justify-between items-center'>
                    <Typography variant='body2' className='text-textSecondary'>Impuesto Estimado:</Typography>
                    <Typography variant='body1' className='font-mono'>${financials.taxAmount.toFixed(2)}</Typography>
                  </div>
                  <div className='flex justify-between items-center bg-[var(--mui-palette-action-hover)] p-2.5 rounded-lg'>
                    <Typography variant='body2' className='font-bold'>Total con IVA:</Typography>
                    <Typography variant='h6' className='font-mono font-bold text-primary'>
                      ${financials.totalPriceWithTax.toFixed(2)}
                    </Typography>
                  </div>
                  {template.applyISLR && (
                    <Typography variant='caption' className='text-warning italic'>
                      * Sujeto a retención de ISLR al momento de facturar.
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Stock Totals Card */}
          {template.productType !== 'service' && (
            <Card>
              <CardHeader title='Existencias Consolidadas' />
              <Divider />
              <CardContent className='flex flex-col gap-3'>
                <div className='flex justify-between items-center'>
                  <Typography variant='body2' className='text-textSecondary'>Stock Físico Real:</Typography>
                  <Typography variant='body1' className='font-bold'>{totalPhysical} {template.uomCode}</Typography>
                </div>
                <div className='flex justify-between items-center'>
                  <Typography variant='body2' className='text-textSecondary'>Stock Reservado:</Typography>
                  <Typography variant='body1' className='text-warning font-bold'>{totalReserved} {template.uomCode}</Typography>
                </div>
                <div className='flex justify-between items-center bg-[var(--mui-palette-action-hover)] p-2.5 rounded-lg'>
                  <Typography variant='body2' className='font-bold'>Stock Disponible:</Typography>
                  <Typography variant='h6' className='font-bold text-success'>
                    {totalAvailable} {template.uomCode}
                  </Typography>
                </div>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </div>
  )
}

export default InventoryDetailView
