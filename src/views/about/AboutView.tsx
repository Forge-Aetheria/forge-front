'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'

import CustomChip from '@core/components/mui/Chip'

const MODULES = [
  'Inventario y catálogo',
  'Ventas y cotizaciones',
  'Compras y proveedores',
  'Contabilidad y tesorería',
  'Punto de venta (POS)',
  'Contactos y terceros',
  'Reportes financieros',
  'Multimoneda USD / VES'
]

const PROBLEMS = [
  {
    icon: 'tabler-database-off',
    title: 'Información dispersa',
    description:
      'Datos repartidos entre hojas de cálculo, cuadernos y sistemas aislados que no se comunican entre sí.'
  },
  {
    icon: 'tabler-box',
    title: 'Inventario sin control',
    description:
      'Diferencias de stock, mermas no registradas y falta de trazabilidad sobre entradas, salidas y ajustes.'
  },
  {
    icon: 'tabler-currency-dollar',
    title: 'Doble moneda manual',
    description:
      'Cálculos de tasa BCV, conversiones y asientos en bolívares realizados a mano, con riesgo de error.'
  },
  {
    icon: 'tabler-file-alert',
    title: 'Procesos desconectados',
    description:
      'Ventas, compras, inventario y contabilidad no comparten la misma fuente de verdad.'
  },
  {
    icon: 'tabler-device-desktop-off',
    title: 'POS aislado del ERP',
    description:
      'Cajas y terminales que operan por separado, sin sincronizar ventas, pagos ni cierres con la empresa.'
  },
  {
    icon: 'tabler-shield-off',
    title: 'Poca auditoría',
    description:
      'Cambios sin responsables ni historial, dificultando el control interno y la toma de decisiones.'
  }
]

const AUDIENCES = [
  {
    icon: 'tabler-building-store',
    title: 'Pymes y comercios',
    description: 'Negocios que necesitan ordenar inventario, ventas y contabilidad en una sola plataforma.'
  },
  {
    icon: 'tabler-shopping-cart',
    title: 'Retail con punto de venta',
    description: 'Comercios con una o varias cajas que requieren POS integrado al inventario y a la facturación.'
  },
  {
    icon: 'tabler-truck-delivery',
    title: 'Distribuidoras y mayoristas',
    description: 'Operaciones con compras, recepciones, almacenes, precios y márgenes que controlar.'
  },
  {
    icon: 'tabler-users-group',
    title: 'Equipos administrativos',
    description: 'Áreas de compras, ventas, almacén, tesorería y contabilidad trabajando sobre los mismos datos.'
  },
  {
    icon: 'tabler-world',
    title: 'Empresas en Venezuela y LatAm',
    description: 'Negocios que operan en dólares y bolívares y necesitan manejar la tasa BCV con trazabilidad.'
  },
  {
    icon: 'tabler-growth',
    title: 'Negocios en crecimiento',
    description: 'Empresas que dejaron atrás el control manual y buscan escalar con procesos claros.'
  }
]

const AboutView = () => {
  return (
    <div className='flex flex-col gap-6'>
      <Card
        sx={{
          borderRadius: '24px',
          border: '1px solid #E6E4F0',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 12px 36px 0 rgba(30, 27, 46, 0.08)'
        }}
      >
        <CardContent className='p-8 md:p-10 flex flex-col gap-4'>
          <CustomChip
            label='ERP + POS'
            size='small'
            sx={{ alignSelf: 'flex-start', backgroundColor: '#F3F0FF', color: '#5A4AD1', fontWeight: 700 }}
          />
          <Typography variant='h3' sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#1E1B2E' }}>Found</span>
            <span style={{ color: '#6C5CE7' }}>ly</span>
            <span style={{ color: '#1E1B2E' }}> ERP</span>
          </Typography>
          <Typography sx={{ maxWidth: 760, fontSize: '1.05rem', lineHeight: 1.7, color: '#4B5563' }}>
            Sistema de gestión empresarial modular que conecta inventario, ventas, compras, contabilidad,
            tesorería y punto de venta en una sola plataforma multiempresa, con soporte multimoneda para
            operar en dólares y bolívares.
          </Typography>
          <div className='flex flex-wrap gap-2 pt-2'>
            {['Multiempresa', 'Multimoneda USD / VES', 'Inventario y kárdex', 'POS integrado', 'Auditoría'].map(item => (
              <CustomChip
                key={item}
                label={item}
                size='small'
                sx={{ backgroundColor: '#F3F0FF', color: '#5A4AD1', fontWeight: 600 }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: '20px', border: '1px solid #E6E4F0', backgroundColor: '#FFFFFF' }}>
        <CardContent className='p-6 md:p-8 flex flex-col gap-4'>
          <div className='flex items-center gap-3'>
            <span className='w-10 h-10 rounded-xl flex items-center justify-center bg-[#F3F0FF] text-[#6C5CE7] text-xl'>
              <i className='tabler-layout-grid' />
            </span>
            <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E1B2E' }}>
              Centralizando tu negocio
            </Typography>
          </div>
          <Typography sx={{ color: '#4B5563', lineHeight: 1.8 }}>
            Foundly ERP centraliza la operación diaria de la empresa: catálogo de productos, control de
            existencias por almacén, cotizaciones y órdenes de venta, ciclos de compra y recepción,
            facturación, pagos, asientos contables y reportes financieros. Cada movimiento queda vinculado
            a su origen y a los usuarios que lo realizan, manteniendo una única fuente de verdad.
          </Typography>
          <Typography sx={{ color: '#4B5563', lineHeight: 1.8 }}>
            El sistema está diseñado para trabajar con múltiples empresas y con doble moneda, aplicando la
            tasa BCV en compras, ventas, inventario y caja. El POS puede operar de forma local y sincronizar
            sus ventas, pagos y cierres con el ERP, reduciendo la dependencia de una conexión permanente.
          </Typography>
          <Divider sx={{ borderColor: '#F0EEF6' }} />
          <div className='flex flex-wrap gap-2'>
            {MODULES.map(module => (
              <CustomChip
                key={module}
                label={module}
                size='small'
                variant='tonal'
                sx={{ backgroundColor: '#F3F0FF', color: '#5A4AD1', fontWeight: 600 }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <div className='flex items-center gap-3 mb-3'>
          <span className='w-10 h-10 rounded-xl flex items-center justify-center bg-[#F3F0FF] text-[#6C5CE7] text-xl'>
            <i className='tabler-alert-triangle' />
          </span>
          <div>
            <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E1B2E' }}>
              Problemas que resuelve
            </Typography>
            <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
              Los dolores operativos más comunes que Foundly ERP busca eliminar.
            </Typography>
          </div>
        </div>
        <Grid container spacing={3}>
          {PROBLEMS.map(problem => (
            <Grid key={problem.title} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card sx={{ height: '100%', borderRadius: '18px', border: '1px solid #E6E4F0', backgroundColor: '#FFFFFF' }}>
                <CardContent className='p-5 flex flex-col gap-3'>
                  <span className='w-10 h-10 rounded-xl flex items-center justify-center bg-[#FEF3C7] text-[#B45309] text-xl'>
                    <i className={problem.icon} />
                  </span>
                  <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E1B2E' }}>
                    {problem.title}
                  </Typography>
                  <Typography sx={{ color: '#6B7280', lineHeight: 1.7, fontSize: '0.875rem' }}>
                    {problem.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </div>

      <div>
        <div className='flex items-center gap-3 mb-3'>
          <span className='w-10 h-10 rounded-xl flex items-center justify-center bg-[#F3F0FF] text-[#6C5CE7] text-xl'>
            <i className='tabler-target' />
          </span>
          <div>
            <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E1B2E' }}>
              ¿A quién está dirigido?
            </Typography>
            <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
              Pensado para organizaciones que necesitan control operativo y financiero real.
            </Typography>
          </div>
        </div>
        <Grid container spacing={3}>
          {AUDIENCES.map(audience => (
            <Grid key={audience.title} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card sx={{ height: '100%', borderRadius: '18px', border: '1px solid #E6E4F0', backgroundColor: '#FFFFFF' }}>
                <CardContent className='p-5 flex flex-col gap-3'>
                  <span className='w-10 h-10 rounded-xl flex items-center justify-center bg-[#ECFDF5] text-[#047857] text-xl'>
                    <i className={audience.icon} />
                  </span>
                  <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E1B2E' }}>
                    {audience.title}
                  </Typography>
                  <Typography sx={{ color: '#6B7280', lineHeight: 1.7, fontSize: '0.875rem' }}>
                    {audience.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </div>

      <Card
        sx={{
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          backgroundColor: '#FAFAFD',
          boxShadow: '0 4px 18px 0 rgba(30, 27, 46, 0.04)'
        }}
      >
        <CardContent className='p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5'>
          <div className='flex items-start gap-4'>
            <span className='w-12 h-12 rounded-2xl flex items-center justify-center bg-[#1E1B2E] text-white text-2xl shrink-0'>
              <i className='tabler-rocket' />
            </span>
            <div>
              <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E1B2E' }}>
                Desarrollado por Forge Labs
              </Typography>
              <Typography sx={{ color: '#6B7280', lineHeight: 1.7, fontSize: '0.875rem', maxWidth: 620 }}>
                Foundly ERP es un producto desarrollado por Forge Labs. Conoce más sobre el equipo y otros
                proyectos visitando su sitio web oficial.
              </Typography>
            </div>
          </div>
          <Button
            component='a'
            href='https://www.forgelab.lat/'
            target='_blank'
            rel='noopener noreferrer'
            variant='contained'
            endIcon={<i className='tabler-arrow-up-right' />}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#6C5CE7',
              whiteSpace: 'nowrap',
              '&:hover': { backgroundColor: '#5A4AD1' }
            }}
          >
            forgelab.lat
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default AboutView
