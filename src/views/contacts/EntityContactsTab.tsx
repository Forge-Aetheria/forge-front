'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import useMediaQuery from '@mui/material/useMediaQuery';
import CustomTextField from '@core/components/mui/TextField';
import {
  ContactsTabProps,
  TerceroEntity,
  TerceroFormData,
  ContactVisibleColumns,
  ContactSortKey,
  ContactSortDirection
} from '@/types/contactsTypes';
import { useEntityContacts } from './hooks/useEntityContacts';
import { ContactsTable } from './components/ContactsTable';
import { ContactsMobileList } from './components/ContactsMobileList';
import { ContactsTableSkeleton } from './components/ContactsTableSkeleton';
import { ContactCardSkeleton } from './components/ContactCardSkeleton';
import { ContactsErrorFallback } from './components/ContactsErrorFallback';
import { ContactFormDrawer } from './components/ContactFormDrawer';
import { ContactQuickViewDrawer } from './components/ContactQuickViewDrawer';
import { CompanyContactsPopoverSheet } from './components/CompanyContactsPopoverSheet';

export const EntityContactsTab: React.FC<ContactsTabProps> = ({ readOnly = false }) => {
  const isDesktop = useMediaQuery('(min-width:768px)');
  const {
    terceros,
    filters,
    setFilters,
    isLoading,
    error,
    saveTercero,
    deactivateTercero,
    deactivateMultipleTerceros,
    refetch
  } = useEntityContacts();

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<TerceroEntity | null>(null);
  const [quickViewExpandedId, setQuickViewExpandedId] = useState<string | null>(null);

  // Estados de Contactos de Empresa (Popover en Desktop / Bottom Sheet en Móvil)
  const [contactsSheetState, setContactsSheetState] = useState<{
    open: boolean;
    anchorEl: HTMLElement | null;
    company: TerceroEntity | null;
  }>({
    open: false,
    anchorEl: null,
    company: null
  });

  const handleOpenCompanyContacts = (target: HTMLElement, company: TerceroEntity) => {
    setContactsSheetState({
      open: true,
      anchorEl: target,
      company
    });
  };

  // Estados de Selección Múltiple
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchMenuAnchorEl, setBatchMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);

  // Estados de Columnas Visibles
  const [columnAnchorEl, setColumnAnchorEl] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<ContactVisibleColumns>({
    clasificacion: false, // Oculto por defecto para ahorrar espacio horizontal
    ubicacion: true,
    contactoDirecto: true,
    referentes: true
  });

  // Estados de Ordenamiento
  const [sortKey, setSortKey] = useState<ContactSortKey | null>('nombre');
  const [sortDirection, setSortDirection] = useState<ContactSortDirection>('asc');

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Lista ordenada dinámicamente
  const sortedTerceros = useMemo(() => {
    let result = [...terceros];

    if (!sortKey) return result;

    return result.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'nombre') {
        comparison = (a.nombre_razon_social || '').localeCompare(b.nombre_razon_social || '', 'es', { sensitivity: 'base' });
      } else if (sortKey === 'identificacion') {
        comparison = (a.identificacion || '').localeCompare(b.identificacion || '', 'es', { numeric: true });
      } else if (sortKey === 'tipo') {
        comparison = (a.tipo || '').localeCompare(b.tipo || '');
      } else if (sortKey === 'ciudad') {
        const cityA = a.ciudad || '';
        const cityB = b.ciudad || '';
        comparison = cityA.localeCompare(cityB, 'es', { sensitivity: 'base' });
      } else if (sortKey === 'referentes') {
        const valA = a.parent_company_name || (a.contactos_referentes?.length ? `${a.contactos_referentes.length}` : '');
        const valB = b.parent_company_name || (b.contactos_referentes?.length ? `${b.contactos_referentes.length}` : '');
        comparison = valA.localeCompare(valB, 'es', { numeric: true });
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [terceros, sortKey, sortDirection]);

  const handleSort = (key: ContactSortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(sortedTerceros.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleConfirmBatchDelete = async () => {
    setBatchDeleteConfirmOpen(false);
    const count = selectedIds.length;
    const res = await deactivateMultipleTerceros(selectedIds);
    if (res.success) {
      setToast({
        open: true,
        message: count === 1 ? 'Contacto eliminado exitosamente' : `${count} contactos eliminados exitosamente`,
        severity: 'success'
      });
      setSelectedIds([]);
    } else {
      setToast({
        open: true,
        message: res.message || 'Error al eliminar contactos',
        severity: 'error'
      });
    }
  };

  const handleOpenCreate = () => {
    setCreateDrawerOpen(true);
  };

  const handleOpenQuickView = (tercero: TerceroEntity) => {
    if (tercero.parent_company_id) {
      const parentCompany = terceros.find(t => t.id === tercero.parent_company_id);
      if (parentCompany) {
        setSelectedContact(parentCompany);
        setQuickViewExpandedId(tercero.contact_person_ref?.id || null);
        setQuickViewOpen(true);
        return;
      }
    }
    setSelectedContact(tercero);
    setQuickViewExpandedId(null);
    setQuickViewOpen(true);
  };

  const handleSubmitForm = async (formData: TerceroFormData) => {
    const res = await saveTercero(formData);
    if (res.success) {
      setToast({
        open: true,
        message: 'Contacto creado exitosamente',
        severity: 'success'
      });
      setCreateDrawerOpen(false);
    } else {
      setToast({ open: true, message: res.message || 'Error al guardar el contacto', severity: 'error' });
    }
    return res;
  };

  const handleDeactivate = async (id: string) => {
    const res = await deactivateTercero(id);
    if (res.success) {
      setToast({ open: true, message: 'Contacto eliminado exitosamente', severity: 'success' });
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      setToast({ open: true, message: res.message || 'Error al eliminar el contacto', severity: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header (Coherencia visual exacta con Inventario) */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Typography variant="h4" className="font-bold text-[#1E1B2E]">
            Contactos & Directorio
          </Typography>
          <Typography variant="body2" className="text-textSecondary">
            Directorio de clientes, proveedores y empresas
          </Typography>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Controles de Selección Múltiple en Cabecera */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF] px-3 py-1.5 rounded-full text-xs font-semibold">
                  <span>{selectedIds.length} seleccionados</span>
                  <Tooltip title="Deseleccionar">
                    <IconButton
                      size="small"
                      onClick={() => setSelectedIds([])}
                      sx={{ p: 0.2, ml: 0.5, color: '#6C5CE7', '&:hover': { color: '#4B3AA6' } }}
                    >
                      <i className="tabler-x text-xs" />
                    </IconButton>
                  </Tooltip>
                </div>

                <Button
                  variant="outlined"
                  onClick={e => setBatchMenuAnchorEl(e.currentTarget)}
                  startIcon={<i className="tabler-settings text-base" />}
                  endIcon={<i className="tabler-chevron-down text-xs" />}
                  sx={{
                    borderRadius: '9999px',
                    borderColor: '#E6E4F0',
                    color: '#1E1B2E',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    px: 2.5,
                    py: 1,
                    backgroundColor: '#FFFFFF',
                    '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                  }}
                >
                  Acciones
                </Button>
              </div>
            )}

            <Button
              variant="contained"
              component={Link}
              href="/contacts/create"
              startIcon={<i className="tabler-user-plus" />}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                px: 3.5,
                py: 1.25,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 4px 14px 0 rgba(108, 92, 231, 0.35)',
                alignSelf: { xs: 'stretch', sm: 'auto' },
                '&:hover': { backgroundColor: '#5A4AD1' }
              }}
            >
              Nuevo
            </Button>
          </div>
        )}
      </div>

      {/* Contenedor Principal con Filtros y Tabla */}
      <Card
        sx={{
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
          overflow: 'hidden'
        }}
      >
        {/* Barra de Filtros y Búsqueda */}
        <CardContent className="flex flex-col gap-4 border-b border-[var(--mui-palette-divider)]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <Typography variant="h6" className="font-semibold text-[#1E1B2E]">
                Directorio Maestro
              </Typography>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF]">
                {sortedTerceros.length} {sortedTerceros.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="small"
                variant="outlined"
                startIcon={<i className="tabler-layout-columns text-base" />}
                onClick={e => setColumnAnchorEl(e.currentTarget)}
                sx={{
                  borderRadius: '8px',
                  borderColor: '#E6E4F0',
                  color: '#6C5CE7',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  px: 2,
                  py: 0.6,
                  '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F3F0FF' }
                }}
              >
                Columnas
              </Button>
            </div>
          </div>

          <Grid container spacing={3}>
            {/* Input de Búsqueda */}
            <Grid size={{ xs: 12, md: 5 }}>
              <CustomTextField
                fullWidth
                placeholder="Buscar por Razón Social, RIF, C.I., Ciudad o Teléfono..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="tabler-search text-lg text-[#6C5CE7]" />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>

            {/* Filtro Tipo de Entidad */}
            <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
              <CustomTextField
                select
                fullWidth
                value={filters.tipo}
                onChange={e => setFilters(prev => ({ ...prev, tipo: e.target.value as any }))}
              >
                <MenuItem value="ALL">
                  <div className="flex items-center gap-2">
                    <i className="tabler-users text-lg text-textSecondary" />
                    <span>Todos los Tipos</span>
                  </div>
                </MenuItem>
                <MenuItem value="EMPRESA">
                  <div className="flex items-center gap-2">
                    <i className="tabler-building text-lg text-textSecondary" />
                    <span>Empresas (Jurídicas)</span>
                  </div>
                </MenuItem>
                <MenuItem value="INDIVIDUAL">
                  <div className="flex items-center gap-2">
                    <i className="tabler-user text-lg text-textSecondary" />
                    <span>Personas Naturales</span>
                  </div>
                </MenuItem>
              </CustomTextField>
            </Grid>

            {/* Filtro Clasificación Comercial */}
            <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
              <CustomTextField
                select
                fullWidth
                value={filters.clasificacion}
                onChange={e => setFilters(prev => ({ ...prev, clasificacion: e.target.value as any }))}
              >
                <MenuItem value="ALL">
                  <div className="flex items-center gap-2">
                    <i className="tabler-tag text-lg text-textSecondary" />
                    <span>Toda Clasificación</span>
                  </div>
                </MenuItem>
                <MenuItem value="CLIENTE">
                  <div className="flex items-center gap-2">
                    <i className="tabler-user-check text-lg text-textSecondary" />
                    <span>Solo Clientes</span>
                  </div>
                </MenuItem>
                <MenuItem value="PROVEEDOR">
                  <div className="flex items-center gap-2">
                    <i className="tabler-truck text-lg text-textSecondary" />
                    <span>Solo Proveedores</span>
                  </div>
                </MenuItem>
              </CustomTextField>
            </Grid>
          </Grid>
        </CardContent>

        {/* Estado de Carga, Error o Lista */}
        {isLoading ? (
          isDesktop ? <ContactsTableSkeleton /> : <ContactCardSkeleton />
        ) : error ? (
          <ContactsErrorFallback message={error} onRetry={refetch} />
        ) : sortedTerceros.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <i className="tabler-users text-5xl text-[#9CA3AF] mb-3" />
            <Typography variant="h6" sx={{ color: '#1E1B2E', fontWeight: 600 }}>
              No se encontraron contactos
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
              {filters.search || filters.tipo !== 'ALL' || filters.clasificacion !== 'ALL'
                ? 'Prueba modificando los filtros de búsqueda.'
                : 'Comienza agregando el primer cliente, proveedor o contacto al directorio.'}
            </Typography>
            {!readOnly && (
              <Button
                variant="outlined"
                onClick={handleOpenCreate}
                startIcon={<i className="tabler-plus" />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#6C5CE7',
                  color: '#6C5CE7',
                  '&:hover': { borderColor: '#5A4AD1', backgroundColor: '#F3F0FF' }
                }}
              >
                Crear Primer Contacto
              </Button>
            )}
          </div>
        ) : isDesktop ? (
          <ContactsTable
            terceros={sortedTerceros}
            onView={handleOpenQuickView}
            onDeactivate={handleDeactivate}
            readOnly={readOnly}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            visibleColumns={visibleColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onOpenContacts={handleOpenCompanyContacts}
          />
        ) : (
          <ContactsMobileList
            terceros={sortedTerceros}
            onView={handleOpenQuickView}
            onDeactivate={handleDeactivate}
            readOnly={readOnly}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onOpenContacts={handleOpenCompanyContacts}
          />
        )}
      </Card>

      {/* Menú Flotante de Visibilidad de Columnas */}
      <Menu
        anchorEl={columnAnchorEl}
        open={Boolean(columnAnchorEl)}
        onClose={() => setColumnAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 1.5,
              minWidth: 230,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <Typography variant="caption" className="font-bold text-[#6B7280] uppercase tracking-wider px-2 py-1 block">
          Columnas Visibles
        </Typography>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, ubicacion: !prev.ubicacion }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={visibleColumns.ubicacion}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Ubicación</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, contactoDirecto: !prev.contactoDirecto }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={visibleColumns.contactoDirecto}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Contacto Directo</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, referentes: !prev.referentes }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={visibleColumns.referentes}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Empresa / Referentes</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, clasificacion: !prev.clasificacion }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.clasificacion)}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Clasificación (Cliente / Prov.)</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          dense
          onClick={() => {
            setVisibleColumns({
              clasificacion: false,
              ubicacion: true,
              contactoDirecto: true,
              referentes: true
            });
            setColumnAnchorEl(null);
          }}
          sx={{ borderRadius: '8px', color: '#6C5CE7', fontWeight: 600, fontSize: '0.8rem' }}
        >
          <i className="tabler-rotate text-sm mr-2" /> Restablecer Columnas
        </MenuItem>
      </Menu>

      {/* Menú de Acciones en Lote (Acciones / Engranaje) */}
      <Menu
        anchorEl={batchMenuAnchorEl}
        open={Boolean(batchMenuAnchorEl)}
        onClose={() => setBatchMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 0.75,
              minWidth: 190,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <MenuItem
          onClick={() => {
            setBatchMenuAnchorEl(null);
            setBatchDeleteConfirmOpen(true);
          }}
          sx={{
            color: '#EF4444',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#FEF2F2' }
          }}
        >
          <i className="tabler-trash text-lg text-[#EF4444]" />
          <span className="font-semibold text-sm">Eliminar ({selectedIds.length})</span>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setBatchMenuAnchorEl(null);
            setSelectedIds([]);
          }}
          sx={{
            color: '#6B7280',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#F9FAFB' }
          }}
        >
          <i className="tabler-x text-base text-[#6B7280]" />
          <span className="text-sm">Deseleccionar</span>
        </MenuItem>
      </Menu>

      {/* Diálogo de Confirmación para Eliminación en Lote */}
      <Dialog
        open={batchDeleteConfirmOpen}
        onClose={() => setBatchDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle className="flex items-center gap-2 text-error font-bold pb-2">
          <i className="tabler-alert-triangle text-2xl text-red-500" />
          <span>Eliminar {selectedIds.length} seleccionados</span>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="text-[#4B5563]">
            ¿Estás seguro de que deseas eliminar los{' '}
            <strong className="text-[#1E1B2E]">
              {selectedIds.length} seleccionados
            </strong>? Esta acción los desactivará del directorio maestro.
          </Typography>
        </DialogContent>
        <DialogActions className="pt-2 pb-3 px-4">
          <Button
            variant="outlined"
            onClick={() => setBatchDeleteConfirmOpen(false)}
            sx={{ borderRadius: '9999px', color: '#6B7280' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<i className="tabler-trash" />}
            onClick={handleConfirmBatchDelete}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#EF4444',
              px: 3,
              fontWeight: 600,
              '&:hover': { backgroundColor: '#DC2626' }
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drawer de Consulta Rápida (Solo Lectura) */}
      <ContactQuickViewDrawer
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        contact={selectedContact}
        initialExpandedContactId={quickViewExpandedId}
      />

      {/* Popover en Desktop / Bottom Sheet en Móvil para Contactos de Empresa */}
      <CompanyContactsPopoverSheet
        open={contactsSheetState.open}
        anchorEl={contactsSheetState.anchorEl}
        company={contactsSheetState.company}
        onClose={() => setContactsSheetState(prev => ({ ...prev, open: false, anchorEl: null }))}
      />

      {/* Drawer Lateral de Formulario para Nuevo Contacto */}
      <ContactFormDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={null}
      />

      {/* Feedback Toast */}
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
            borderRadius: '12px',
            bgcolor: toast.severity === 'success' ? '#10B981' : '#EF4444'
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default EntityContactsTab;
