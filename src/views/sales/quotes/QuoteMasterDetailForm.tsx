'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CustomTextField from '@core/components/mui/TextField';

import {
  BcvRate,
  ClientLookup,
  CurrencyCode,
  ProductLookup,
  Quote,
  SalesFeatureFlags
} from '@/types/salesQuotesTypes';
import { salesQuotesService } from '@/services/salesQuotesService';
import { ClientAutocomplete } from './components/ClientAutocomplete';
import { BcvRateBadge } from './components/BcvRateBadge';
import { QuoteTotalsCard } from './components/QuoteTotalsCard';
import { FormItemLine, QuoteItemRow } from './components/QuoteItemRow';

interface Props {
  initialQuote?: Quote;
  mode?: 'create' | 'edit';
}

export const QuoteMasterDetailForm: React.FC<Props> = ({
  initialQuote,
  mode = 'create'
}) => {
  const router = useRouter();

  // Configuración y Tasa BCV
  const [bcvRate, setBcvRate] = useState<BcvRate | null>(null);
  const [flags, setFlags] = useState<SalesFeatureFlags>(salesQuotesService.getFeatureFlags());
  const [products, setProducts] = useState<ProductLookup[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Estados del Formulario Maestro
  const [client, setClient] = useState<ClientLookup | null>(initialQuote?.cliente || null);
  const [monedaBase, setMonedaBase] = useState<CurrencyCode>(initialQuote?.moneda_base || 'USD');
  const [vigenciaDias, setVigenciaDias] = useState<number>(initialQuote?.vigencia_dias || 15);
  const [aplicaIva, setAplicaIva] = useState<boolean>(initialQuote ? initialQuote.aplica_iva : true);
  const [observaciones, setObservaciones] = useState<string>(initialQuote?.observaciones || '');
  const [terminosCondiciones, setTerminosCondiciones] = useState<string>(
    initialQuote?.terminos_condiciones ||
      'Precios sujetos a la vigencia del documento. Forma de pago: Transferencia bancaria o divisas según tasa oficial BCV.'
  );

  // Líneas del Detalle (Repeater)
  const [items, setItems] = useState<FormItemLine[]>(() => {
    if (initialQuote?.items && initialQuote.items.length > 0) {
      return initialQuote.items.map(it => ({
        id: it.id,
        producto_id: it.producto_id,
        producto_sku: it.producto_sku,
        producto_nombre: it.producto_nombre,
        is_physical_stock: it.is_physical_stock,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        descuento_porcentaje: it.descuento_porcentaje,
        alicuota_iva: it.alicuota_iva || '16',
        stock_disponible: it.stock_disponible_al_momento ?? 999
      }));
    }
    return [];
  });

  // Envío y Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<'draft' | 'issue' | null>(null);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Carga inicial de datos
  useEffect(() => {
    const init = async () => {
      try {
        const [rate, prods] = await Promise.all([
          salesQuotesService.getActiveBcvRate(),
          salesQuotesService.getProducts()
        ]);
        setBcvRate(rate);
        setProducts(prods);

        // Si es nueva cotización y no hay ítems, agregar una línea vacía inicial
        if (mode === 'create' && items.length === 0 && prods.length > 0) {
          const first = prods[0];
          setItems([
            {
              id: `item-${Date.now()}`,
              producto_id: first.id,
              producto_sku: first.sku,
              producto_nombre: first.nombre,
              is_physical_stock: first.is_physical_stock,
              cantidad: 1,
              precio_unitario: first.precio_unitario_base,
              descuento_porcentaje: 0,
              alicuota_iva: first.alicuota_iva || '16',
              stock_disponible: first.stock_disponible
            }
          ]);
        }
      } catch (err: any) {
        setToast({
          open: true,
          message: err?.message || 'Error al inicializar formulario.',
          severity: 'error'
        });
      } finally {
        setLoadingInitial(false);
      }
    };
    init();
  }, [mode]);

  // Recálculo reactivo de Totales
  const totals = useMemo(() => {
    const tasa = bcvRate?.tasa || 36.50;
    return salesQuotesService.calculateTotals(items, tasa, flags, aplicaIva);
  }, [items, bcvRate, flags, aplicaIva]);

  // Manejadores de Líneas
  const handleAddItem = () => {
    if (products.length === 0) return;
    const prod = products[0];
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        producto_id: prod.id,
        producto_sku: prod.sku,
        producto_nombre: prod.nombre,
        is_physical_stock: prod.is_physical_stock,
        cantidad: 1,
        precio_unitario: prod.precio_unitario_base,
        descuento_porcentaje: 0,
        alicuota_iva: prod.alicuota_iva || '16',
        stock_disponible: prod.stock_disponible
      }
    ]);
  };

  const handleUpdateItem = (index: number, updated: FormItemLine) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Validaciones y Envío
  const handleSubmit = async (emitirInmediatamente: boolean) => {
    // 1. Validar Cliente
    if (!client) {
      setToast({
        open: true,
        message: 'Debe seleccionar un cliente antes de guardar o emitir.',
        severity: 'warning'
      });
      return;
    }

    // 2. Validar Formato RIF si flag VE activo
    if (flags.SENIAT_FORMAT_VALIDATION) {
      const rifRegex = /^[VEJG]-\d{7,9}(-\d)?$/i;
      if (!rifRegex.test(client.identificacion)) {
        setToast({
          open: true,
          message: `El cliente seleccionado posee un formato de identificación inválido (${client.identificacion}). Se requiere formato venezolano (ej: J-12345678-9).`,
          severity: 'error'
        });
        return;
      }
    }

    // 3. Validar Líneas no vacías
    if (items.length === 0) {
      setToast({
        open: true,
        message: 'Debe agregar al menos una línea de producto o servicio antes de continuar.',
        severity: 'warning'
      });
      return;
    }

    // 4. Validar Stock Físico si es emisión directa
    if (emitirInmediatamente && flags.STOCK_VALIDATION_MODE === 'STRICT') {
      for (const it of items) {
        if (it.is_physical_stock && it.cantidad > it.stock_disponible) {
          setToast({
            open: true,
            message: `No se puede emitir el presupuesto: "${it.producto_nombre}" supera el stock disponible en almacén (${it.stock_disponible}).`,
            severity: 'error'
          });
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      setSubmitAction(emitirInmediatamente ? 'issue' : 'draft');

      const payload = {
        cliente_id: client.id,
        moneda_base: monedaBase,
        vigencia_dias: vigenciaDias,
        aplica_iva: aplicaIva,
        observaciones,
        terminos_condiciones: terminosCondiciones,
        emitir_inmediatamente: emitirInmediatamente,
        items: items.map(it => ({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          descuento_porcentaje: it.descuento_porcentaje,
          alicuota_iva: it.alicuota_iva || '16'
        }))
      };

      let result: Quote;
      if (mode === 'edit' && initialQuote) {
        result = await salesQuotesService.updateQuote(initialQuote.id, payload);
      } else {
        result = await salesQuotesService.createQuote(payload);
      }

      setToast({
        open: true,
        message: emitirInmediatamente
          ? `Cotización emitida exitosamente con correlativo ${result.correlativo}.`
          : `Cotización guardada como borrador exitosamente.`,
        severity: 'success'
      });

      setTimeout(() => {
        router.push(`/sales/quotes/${result.id}`);
      }, 700);
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al procesar la cotización.',
        severity: 'error'
      });
      setIsSubmitting(false);
      setSubmitAction(null);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <CircularProgress sx={{ color: '#6C5CE7' }} size={40} />
        <span className="text-sm text-[#6B7280]">Cargando catálogo y parámetros comerciales...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-1">
      {/* Barra Superior de Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Tooltip title="Volver al listado">
            <Button
              component={Link}
              href="/sales/quotes"
              variant="text"
              sx={{
                minWidth: 'auto',
                width: 38,
                height: 38,
                p: 0,
                borderRadius: '9999px',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E4F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
              }}
            >
              <i className="tabler-arrow-left text-lg" />
            </Button>
          </Tooltip>
          <div>
            <div className="flex items-center gap-3">
              <Typography variant="h4" className="font-bold text-[#1E1B2E]">
                {mode === 'edit'
                  ? `Editar Cotización ${initialQuote?.correlativo}`
                  : 'Nueva Cotización de Venta'}
              </Typography>
              {bcvRate && <BcvRateBadge rate={bcvRate} />}
            </div>
            <Typography variant="body2" className="text-[#6B7280] mt-0.5">
              Configure el cliente, líneas de productos y condiciones bimonetarias
            </Typography>
          </div>
        </div>

        {/* Acciones Superiores de Guardado (Minimalista) */}
        <div className="flex items-center gap-2">
          <Tooltip title="Guardar Borrador">
            <span>
              <IconButton
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '9999px',
                  color: '#6B7280',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E6E4F0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' },
                  '&:disabled': { backgroundColor: '#F1F5F9', color: '#94A3B8' }
                }}
              >
                {isSubmitting && submitAction === 'draft' ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <i className="tabler-device-floppy text-lg" />
                )}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Emitir Presupuesto">
            <span>
              <IconButton
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '9999px',
                  backgroundColor: '#6C5CE7',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)',
                  '&:hover': { backgroundColor: '#5B4CDB' },
                  '&:disabled': { backgroundColor: '#E2E8F0', color: '#94A3B8' }
                }}
              >
                {isSubmitting && submitAction === 'issue' ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <i className="tabler-send text-lg" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>

      <Grid container spacing={4}>
        {/* Columna Izquierda / Principal: Cabecera Maestro + Repeater de Líneas */}
        <Grid size={{ xs: 12, lg: 8 }} className="flex flex-col gap-4">
          {/* Card Cabecera Maestro */}
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
            }}
          >
            <CardContent className="p-5 flex flex-col gap-4">
              <Typography variant="h6" className="font-bold text-[#1E1B2E] flex items-center gap-2">
                <i className="tabler-user-check text-[#6C5CE7]" /> Datos del Cliente y Condiciones
              </Typography>

              <Grid container spacing={3}>
                {/* Selector de Cliente */}
                <Grid size={{ xs: 12 }}>
                  <ClientAutocomplete
                    value={client}
                    onChange={setClient}
                    disabled={isSubmitting}
                  />
                </Grid>

                {/* Moneda Base */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    select
                    fullWidth
                    label="Moneda Base Comercial *"
                    value={monedaBase}
                    onChange={e => setMonedaBase(e.target.value as CurrencyCode)}
                    disabled={isSubmitting}
                  >
                    <MenuItem value="USD">USD — Dólar Americano ($)</MenuItem>
                    <MenuItem value="VES">VES — Bolívar Digital (Bs.)</MenuItem>
                  </CustomTextField>
                </Grid>

                {/* Días de Vigencia */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    type="number"
                    fullWidth
                    label="Días de Vigencia del Presupuesto *"
                    value={vigenciaDias}
                    onChange={e => setVigenciaDias(Math.max(1, parseInt(e.target.value) || 1))}
                    inputProps={{ min: 1, max: 90 }}
                    helperText={`Vence el: ${new Date(Date.now() + vigenciaDias * 24 * 60 * 60 * 1000).toLocaleDateString('es-VE')}`}
                    disabled={isSubmitting}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Card Detalle de Líneas de Ítems */}
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              overflow: 'hidden'
            }}
          >
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="h6" className="font-bold text-[#1E1B2E] flex items-center gap-2">
                    <i className="tabler-list-details text-[#6C5CE7]" /> Líneas de Ítems ({items.length})
                  </Typography>
                  <span className="text-xs text-[#6B7280]">
                    Agregue productos con validación de stock físico o servicios sin existencia
                  </span>
                </div>

                <Button
                  variant="outlined"
                  onClick={handleAddItem}
                  disabled={isSubmitting}
                  sx={{
                    borderRadius: '9999px',
                    borderColor: '#6C5CE7',
                    color: '#6C5CE7',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    px: 2.5,
                    '&:hover': {
                      backgroundColor: '#F0EEF9',
                      borderColor: '#5B4CDB'
                    }
                  }}
                  startIcon={<i className="tabler-plus text-sm" />}
                >
                  Agregar Ítem
                </Button>
              </div>

              {/* Tabla de Líneas */}
              <TableContainer sx={{ border: '1px solid #E6E4F0', borderRadius: '16px', mt: 1 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
                    <TableRow>
                      <TableCell sx={{ width: 28, minWidth: 28, maxWidth: 32, px: 0.5, py: 1, fontWeight: 600, color: '#1E1B2E', textAlign: 'center' }}>#</TableCell>
                      <TableCell sx={{ py: 1, fontWeight: 600, color: '#1E1B2E' }}>Producto / Servicio</TableCell>
                      <TableCell sx={{ width: 130, py: 1, fontWeight: 600, color: '#1E1B2E' }}>Cantidad</TableCell>
                      <TableCell sx={{ width: 110, py: 1, fontWeight: 600, color: '#1E1B2E' }}>Precio ($)</TableCell>
                      <TableCell sx={{ width: 85, py: 1, fontWeight: 600, color: '#1E1B2E' }}>Desc. (%)</TableCell>
                      <TableCell align="center" sx={{ width: 55, minWidth: 55, px: 0.5, py: 1, fontWeight: 600, color: '#1E1B2E' }}>IVA</TableCell>
                      <TableCell align="right" sx={{ width: 120, py: 1, fontWeight: 600, color: '#1E1B2E' }}>Subtotal</TableCell>
                      <TableCell align="center" sx={{ width: 44, py: 1, fontWeight: 600, color: '#1E1B2E' }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <span className="text-sm text-[#6B7280]">
                            No hay ítems en la cotización. Haga clic en <strong>"Agregar Ítem"</strong> para comenzar.
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((line, idx) => (
                        <QuoteItemRow
                          key={line.id}
                          index={idx}
                          line={line}
                          products={products}
                          tasaBcv={bcvRate?.tasa || 36.50}
                          quoteAplicaIva={aplicaIva}
                          onUpdate={updated => handleUpdateItem(idx, updated)}
                          onRemove={() => handleRemoveItem(idx)}
                          disabled={isSubmitting}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Card Observaciones y Términos Comerciales */}
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
            }}
          >
            <CardContent className="p-5 flex flex-col gap-3">
              <Typography variant="h6" className="font-bold text-[#1E1B2E]">
                Términos y Observaciones
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    multiline
                    rows={3}
                    fullWidth
                    label="Observaciones Comerciales"
                    placeholder="Instrucciones de entrega, notas para el cliente..."
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    multiline
                    rows={3}
                    fullWidth
                    label="Términos y Condiciones del Presupuesto"
                    placeholder="Condiciones de pago, validez de la oferta..."
                    value={terminosCondiciones}
                    onChange={e => setTerminosCondiciones(e.target.value)}
                    disabled={isSubmitting}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Columna Derecha: Totales Bimonetarios y Feature Flags */}
        <Grid size={{ xs: 12, lg: 4 }} className="flex flex-col gap-4">
          <QuoteTotalsCard
            totals={totals}
            tasaBcv={bcvRate?.tasa || 36.50}
            flags={flags}
            aplicaIva={aplicaIva}
            onToggleAplicaIva={setAplicaIva}
            disabled={isSubmitting}
          />

          {/* Información de Ayuda / Auditoría */}
          <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E6E4F0] text-xs text-[#6B7280] flex flex-col gap-2">
            <span className="font-bold text-[#1E1B2E] flex items-center gap-1.5">
              <i className="tabler-shield-check text-[#6C5CE7]" /> Protocolo Comercial Foundly
            </span>
            <p>
              • Al presionar <strong>"Guardar Borrador"</strong> se genera un identificador provisional y podrá seguir editando las líneas en cualquier momento.
            </p>
            <p>
              • Al presionar <strong>"Emitir Presupuesto"</strong> se asigna un correlativo formal inmutable format <code>COT-2026-XXXX</code>, congelando los precios pactados.
            </p>
          </div>
        </Grid>
      </Grid>

      {/* Toast Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{
            borderRadius: '16px',
            fontWeight: 500,
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};
