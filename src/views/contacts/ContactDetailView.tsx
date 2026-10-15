'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CustomTextField from '@core/components/mui/TextField';

import {
  TerceroEntity,
  EntityType,
  EntityOrigin,
  ContactPerson,
  EntityAddress,
  ContactPersonRole,
  AddressType,
  TerceroFormData
} from '@/types/contactsTypes';
import { contactsService } from '@/services/contactsService';
import { ContactRoleChip } from './components/ContactRoleChip';

interface Props {
  id: string;
}

const roleOptions: { value: ContactPersonRole; label: string }[] = [
  { value: 'REPRESENTANTE_LEGAL', label: 'Representante Legal' },
  { value: 'PAGOS_RETENCIONES', label: 'Pagos / Retenciones' },
  { value: 'COMPRAS', label: 'Compras' },
  { value: 'VENTAS', label: 'Ventas' },
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' }
];

export const ContactDetailView: React.FC<Props> = ({ id }) => {
  const router = useRouter();

  const [contact, setContact] = useState<TerceroEntity | null>(null);
  const [allContacts, setAllContacts] = useState<TerceroEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Form Fields
  const [codigo, setCodigo] = useState('');
  const [origen, setOrigen] = useState<EntityOrigin>('NACIONAL');
  const [tipo, setTipo] = useState<EntityType>('EMPRESA');
  const [nombreRazonSocial, setNombreRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [isCliente, setIsCliente] = useState(false);
  const [isProveedor, setIsProveedor] = useState(false);
  const [isContacto, setIsContacto] = useState(false);
  const [telefonoPrincipal, setTelefonoPrincipal] = useState('');
  const [emailPrincipal, setEmailPrincipal] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [estado, setEstado] = useState('');
  const [pais, setPais] = useState('Venezuela');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [contactosReferentes, setContactosReferentes] = useState<ContactPerson[]>([]);
  const [direccionesAdicionales, setDireccionesAdicionales] = useState<EntityAddress[]>([]);

  // Modales anidados
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personNombre, setPersonNombre] = useState('');
  const [personCargo, setPersonCargo] = useState('');
  const [personTelefono, setPersonTelefono] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [personCI, setPersonCI] = useState('');
  const [personRol, setPersonRol] = useState<ContactPersonRole>('ADMINISTRATIVO');
  const [personPrincipal, setPersonPrincipal] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressTipo, setAddressTipo] = useState<AddressType>('ENTREGA');
  const [addressDireccion, setAddressDireccion] = useState('');
  const [addressCiudad, setAddressCiudad] = useState('');
  const [addressEstado, setAddressEstado] = useState('');
  const [addressPais, setAddressPais] = useState('Venezuela');
  const [addressCP, setAddressCP] = useState('');
  const [addressPredeterminada, setAddressPredeterminada] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [current, list] = await Promise.all([
        contactsService.getTerceroById(id),
        contactsService.getTerceros()
      ]);

      if (current) {
        setContact(current);
        setCodigo(current.codigo || '');
        setOrigen(current.origen || 'NACIONAL');
        setTipo(current.tipo);
        setNombreRazonSocial(current.nombre_razon_social);
        setNombreComercial(current.nombre_comercial || '');
        setIdentificacion(current.identificacion);
        setIsCliente(current.is_cliente);
        setIsProveedor(current.is_proveedor);
        setIsContacto(current.is_contacto);
        setTelefonoPrincipal(current.telefono_principal);
        setEmailPrincipal(current.email_principal);
        setDireccion(current.direccion);
        setCiudad(current.ciudad);
        setEstado(current.estado);
        setPais(current.pais || 'Venezuela');
        setCodigoPostal(current.codigo_postal || '');
        setContactosReferentes(current.contactos_referentes || []);
        setDireccionesAdicionales(current.direcciones_adicionales || []);
      }
      setAllContacts(list);
    } catch (err: any) {
      setToast({ open: true, message: 'Error al cargar el contacto', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Cálculo de índices para navegación secuencial
  const currentIndex = allContacts.findIndex(c => c.id === id);
  const totalContacts = allContacts.length;
  const prevContact = currentIndex > 0 ? allContacts[currentIndex - 1] : null;
  const nextContact =
    currentIndex >= 0 && currentIndex < allContacts.length - 1 ? allContacts[currentIndex + 1] : null;

  const handleCopyRIF = () => {
    if (!identificacion) return;
    navigator.clipboard.writeText(identificacion);
    setToast({ open: true, message: '¡Identificación copiada al portapapeles!', severity: 'info' });
  };

  // Guardar Cambios
  const handleSaveChanges = async () => {
    if (!nombreRazonSocial.trim()) {
      setToast({ open: true, message: 'La razón social o nombre es obligatorio', severity: 'error' });
      return;
    }
    if (!identificacion.trim()) {
      setToast({ open: true, message: 'El RIF o C.I. es obligatorio', severity: 'error' });
      return;
    }
    if (!isCliente && !isProveedor && !isContacto) {
      setToast({ open: true, message: 'Debe marcar al menos una clasificación comercial', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<TerceroFormData> = {
        codigo: codigo.trim() || undefined,
        origen,
        tipo,
        nombre_razon_social: nombreRazonSocial.trim(),
        nombre_comercial: nombreComercial.trim() || undefined,
        identificacion: identificacion.trim().toUpperCase(),
        is_cliente: isCliente,
        is_proveedor: isProveedor,
        is_contacto: isContacto,
        telefono_principal: telefonoPrincipal.trim(),
        email_principal: emailPrincipal.trim(),
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        estado: estado.trim(),
        pais: pais.trim(),
        codigo_postal: codigoPostal.trim() || undefined,
        contactos_referentes: tipo === 'EMPRESA' ? contactosReferentes : [],
        direcciones_adicionales: tipo === 'EMPRESA' ? direccionesAdicionales : []
      };

      const updated = await contactsService.updateTercero(id, payload);
      setContact(updated);
      setToast({ open: true, message: 'Contacto actualizado exitosamente', severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al actualizar el contacto', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Eliminar / Desactivar
  const handleConfirmDelete = async () => {
    try {
      await contactsService.deactivateTercero(id);
      setToast({ open: true, message: 'Contacto eliminado exitosamente', severity: 'success' });
      setDeleteConfirmOpen(false);
      setTimeout(() => {
        router.push('/contacts');
      }, 700);
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al eliminar el contacto', severity: 'error' });
    }
  };

  // Gestión de personas referentes
  const handleOpenAddPerson = () => {
    setEditingPersonId(null);
    setPersonNombre('');
    setPersonCargo('');
    setPersonTelefono('');
    setPersonEmail('');
    setPersonCI('');
    setPersonRol('ADMINISTRATIVO');
    setPersonPrincipal(false);
    setPersonModalOpen(true);
  };

  const handleOpenEditPerson = (p: ContactPerson) => {
    setEditingPersonId(p.id);
    setPersonNombre(p.nombre);
    setPersonCargo(p.cargo);
    setPersonTelefono(p.telefono);
    setPersonEmail(p.email);
    setPersonCI(p.cedula_identidad || '');
    setPersonRol(p.rol);
    setPersonPrincipal(p.is_principal);
    setPersonModalOpen(true);
  };

  const handleSavePerson = () => {
    if (!personNombre.trim() || !personTelefono.trim()) {
      alert('Nombre y teléfono son obligatorios');
      return;
    }

    if (editingPersonId) {
      setContactosReferentes(prev =>
        prev.map(p =>
          p.id === editingPersonId
            ? {
                ...p,
                nombre: personNombre.trim(),
                cargo: personCargo.trim() || 'Contacto',
                telefono: personTelefono.trim(),
                email: personEmail.trim(),
                cedula_identidad: personCI.trim() || undefined,
                rol: personRol,
                is_principal: personPrincipal
              }
            : personPrincipal
            ? { ...p, is_principal: false }
            : p
        )
      );
    } else {
      const newPerson: ContactPerson = {
        id: `ref-${Date.now()}`,
        nombre: personNombre.trim(),
        cargo: personCargo.trim() || 'Contacto',
        telefono: personTelefono.trim(),
        email: personEmail.trim(),
        cedula_identidad: personCI.trim() || undefined,
        rol: personRol,
        is_principal: personPrincipal
      };
      setContactosReferentes(prev => {
        let updated = [...prev, newPerson];
        if (personPrincipal) {
          updated = updated.map(p => (p.id !== newPerson.id ? { ...p, is_principal: false } : p));
        }
        return updated;
      });
    }

    setPersonModalOpen(false);
  };

  const handleDeletePerson = (personId: string) => {
    setContactosReferentes(prev => prev.filter(p => p.id !== personId));
  };

  // Gestión de direcciones adicionales
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressTipo('ENTREGA');
    setAddressDireccion('');
    setAddressCiudad('');
    setAddressEstado('');
    setAddressPais('Venezuela');
    setAddressCP('');
    setAddressPredeterminada(false);
    setAddressModalOpen(true);
  };

  const handleSaveAddress = () => {
    if (!addressDireccion.trim() || !addressCiudad.trim()) {
      alert('Dirección y ciudad son obligatorias');
      return;
    }

    if (editingAddressId) {
      setDireccionesAdicionales(prev =>
        prev.map(a =>
          a.id === editingAddressId
            ? {
                ...a,
                tipo: addressTipo,
                direccion: addressDireccion.trim(),
                ciudad: addressCiudad.trim(),
                estado: addressEstado.trim(),
                pais: addressPais.trim(),
                codigo_postal: addressCP.trim() || undefined,
                is_predeterminada: addressPredeterminada
              }
            : addressPredeterminada
            ? { ...a, is_predeterminada: false }
            : a
        )
      );
    } else {
      const newAddr: EntityAddress = {
        id: `addr-${Date.now()}`,
        tipo: addressTipo,
        direccion: addressDireccion.trim(),
        ciudad: addressCiudad.trim(),
        estado: addressEstado.trim(),
        pais: addressPais.trim(),
        codigo_postal: addressCP.trim() || undefined,
        is_predeterminada: addressPredeterminada
      };
      setDireccionesAdicionales(prev => {
        let updated = [...prev, newAddr];
        if (addressPredeterminada) {
          updated = updated.map(a => (a.id !== newAddr.id ? { ...a, is_predeterminada: false } : a));
        }
        return updated;
      });
    }

    setAddressModalOpen(false);
  };

  const handleDeleteAddress = (addrId: string) => {
    setDireccionesAdicionales(prev => prev.filter(a => a.id !== addrId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <i className="tabler-loader-2 text-4xl text-[#6C5CE7] animate-spin" />
          <Typography className="text-[#6B7280]">Cargando ficha del contacto...</Typography>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto rounded-2xl border border-[#E6E4F0]">
        <i className="tabler-user-off text-5xl text-[#EF4444] mb-3" />
        <Typography variant="h5" className="font-bold text-[#1E1B2E] mb-2">
          Contacto no encontrado
        </Typography>
        <Typography className="text-[#6B7280] mb-5">
          El contacto con identificador &quot;{id}&quot; no existe en el directorio o fue desactivado.
        </Typography>
        <Button
          component={Link}
          href="/contacts"
          variant="contained"
          startIcon={<i className="tabler-arrow-left" />}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            px: 3,
            '&:hover': { backgroundColor: '#5A4AD1' }
          }}
        >
          Volver al Directorio
        </Button>
      </Card>
    );
  }

  return (
    <div className='flex flex-col gap-6 max-w-7xl mx-auto pb-12'>
      {/* Top Navigation Bar (Coherencia visual exacta con Inventario) */}
      <div className='flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap'>
        {/* Izquierda: Botón Volver + Título + Chip Tipo + Subtítulo */}
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          <Button
            component={Link}
            href='/contacts'
            variant='tonal'
            size='small'
            startIcon={<i className='tabler-arrow-left' />}
            className='shrink-0'
          >
            Volver
          </Button>
          <div className='min-w-0 flex-1'>
            <Tooltip title={nombreRazonSocial || 'Contacto'}>
              <Typography variant='h4' className='font-bold text-textPrimary truncate'>
                {nombreRazonSocial || 'Contacto'}
              </Typography>
            </Tooltip>
          </div>
        </div>

        {/* Derecha: Paginador secuencial + Badges comerciales + Cancelar + Guardar Cambios */}
        <div className='flex items-center gap-2.5 shrink-0'>
          {/* Navegador Secuencial entre Contactos (Limpio y Compacto) */}
          {totalContacts > 0 && (
            <div className='flex items-center gap-1 bg-[var(--mui-palette-action-hover)] px-2 py-0.5 rounded-lg border border-[var(--mui-palette-divider)] shrink-0'>
              <Tooltip title={prevContact ? `Anterior: ${prevContact.nombre_razon_social}` : 'Primer contacto'}>
                <span>
                  <IconButton
                    size='small'
                    disabled={!prevContact}
                    onClick={() => prevContact && router.push(`/contacts/${prevContact.id}`)}
                    className='text-primary'
                  >
                    <i className='tabler-chevron-left text-base' />
                  </IconButton>
                </span>
              </Tooltip>

              <Typography variant='caption' className='font-semibold text-textPrimary select-none px-1 font-mono'>
                {currentIndex + 1} / {totalContacts}
              </Typography>

              <Tooltip title={nextContact ? `Siguiente: ${nextContact.nombre_razon_social}` : 'Último contacto'}>
                <span>
                  <IconButton
                    size='small'
                    disabled={!nextContact}
                    onClick={() => nextContact && router.push(`/contacts/${nextContact.id}`)}
                    className='text-primary'
                  >
                    <i className='tabler-chevron-right text-base' />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          )}



          {/* Cancelar */}
          <Button
            component={Link}
            href='/contacts'
            variant='tonal'
            color='secondary'
            size='small'
            className='shrink-0'
          >
            Cancelar
          </Button>

          {/* Guardar Cambios */}
          <Button
            variant='contained'
            color='primary'
            size='small'
            disabled={saving}
            startIcon={
              saving ? <i className='tabler-loader-2 animate-spin' /> : <i className='tabler-device-floppy' />
            }
            onClick={handleSaveChanges}
            className='shrink-0'
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>

          {/* Eliminar */}
          <Tooltip title='Eliminar contacto'>
            <IconButton
              size='small'
              color='error'
              onClick={() => setDeleteConfirmOpen(true)}
              className='shrink-0'
            >
              <i className='tabler-trash text-lg' />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Main Grid a 2 Columnas */}
      <Grid container spacing={6}>
        {/* Columna Izquierda: Tarjeta Resumen & Ubicación Rápida */}
        <Grid size={{ xs: 12, md: 4 }}>
          <div className='space-y-4'>
            <Card
              sx={{
                borderRadius: '20px',
                border: '1px solid #E6E4F0',
                backgroundColor: '#FFFFFF',
                p: 3,
                boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
              }}
            >
              <div className='flex items-center gap-3 mb-4'>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: tipo === 'EMPRESA' ? '#F3F0FF' : '#F0FDF4',
                    color: tipo === 'EMPRESA' ? '#6C5CE7' : '#16A34A',
                    border: tipo === 'EMPRESA' ? '1px solid #E9D5FF' : '1px solid #BBF7D0'
                  }}
                >
                  <i className={tipo === 'EMPRESA' ? 'tabler-building text-2xl' : 'tabler-user text-2xl'} />
                </Avatar>
                <div>
                  <div className='flex items-center gap-1.5'>
                    <span className='font-mono font-bold text-sm text-[#6C5CE7]'>{identificacion || 'Sin ID'}</span>
                    <Tooltip title='Copiar Identificación'>
                      <IconButton size='small' onClick={handleCopyRIF} sx={{ p: 0.5 }}>
                        <i className='tabler-copy text-xs text-[#6B7280]' />
                      </IconButton>
                    </Tooltip>
                  </div>
                  <Typography variant='caption' className='text-[#6B7280] block'>
                    {tipo === 'EMPRESA' ? 'Persona Jurídica' : 'Persona Natural'} · {origen === 'EXTRANJERO' ? 'Extranjero' : 'Nacional'}
                    {codigo ? ` · Cód: ${codigo}` : ''}
                  </Typography>
                </div>
              </div>

              <Typography variant='subtitle1' className='font-bold text-[#1E1B2E] mb-3'>
                Datos de Contacto Directo
              </Typography>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#F3F0FF] flex items-center justify-center text-[#6C5CE7] shrink-0">
                    <i className="tabler-phone text-base" />
                  </div>
                  <div>
                    <Typography variant="caption" className="text-[#6B7280] block">
                      Teléfono Principal
                    </Typography>
                    <span className="font-medium text-[#1E1B2E]">
                      {telefonoPrincipal || 'Sin registrar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#F3F0FF] flex items-center justify-center text-[#6C5CE7] shrink-0">
                    <i className="tabler-mail text-base" />
                  </div>
                  <div className="overflow-hidden">
                    <Typography variant="caption" className="text-[#6B7280] block">
                      Correo Electrónico
                    </Typography>
                    {emailPrincipal ? (
                      <a href={`mailto:${emailPrincipal}`} className="font-medium text-[#6C5CE7] hover:underline truncate block">
                        {emailPrincipal}
                      </a>
                    ) : (
                      <span className="text-[#9CA3AF]">Sin registrar</span>
                    )}
                  </div>
                </div>
              </div>

              <Divider className="my-4" />

              <Typography variant="subtitle1" className="font-bold text-[#1E1B2E] mb-3">
                Ubicación Principal
              </Typography>
              <div className="space-y-2 text-sm text-[#1E1B2E]">
                <div className="flex items-start gap-2">
                  <i className="tabler-map-pin text-[#6C5CE7] text-lg mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium block">{direccion || 'Dirección no registrada'}</span>
                    <span className="text-[#6B7280] text-xs block">
                      {ciudad ? `${ciudad}, ` : ''}{estado ? `${estado}, ` : ''}{pais}
                      {codigoPostal ? ` · C.P. ${codigoPostal}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Resumen de Entidad */}
            <Card
              sx={{
                borderRadius: '20px',
                border: '1px solid #E6E4F0',
                backgroundColor: '#FFFFFF',
                p: 3,
                boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
              }}
            >
              <Typography variant="subtitle2" className="font-bold text-[#1E1B2E] mb-2">
                Clasificación en el Sistema
              </Typography>
              <div className="space-y-1.5 text-xs text-[#6B7280]">
                <div className="flex justify-between py-1 border-b border-[#F4F3F8]">
                  <span>Código Interno:</span>
                  <span className="font-semibold text-[#1E1B2E] font-mono">{codigo || 'No asignado'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4F3F8]">
                  <span>Origen / Residencia:</span>
                  <span className="font-semibold text-[#1E1B2E] flex items-center gap-1">
                    <i className={origen === 'EXTRANJERO' ? 'tabler-world text-xs text-warning' : 'tabler-flag text-xs text-primary'} />
                    {origen === 'EXTRANJERO' ? 'Extranjero' : 'Nacional'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4F3F8]">
                  <span>Tipo de Entidad:</span>
                  <span className="font-semibold text-[#1E1B2E]">{tipo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4F3F8]">
                  <span>Rol Comercial:</span>
                  <span className="font-semibold text-[#1E1B2E]">
                    {[isCliente && 'Cliente', isProveedor && 'Proveedor', isContacto && 'Contacto']
                      .filter(Boolean)
                      .join(' / ') || 'Ninguno'}
                  </span>
                </div>
                {tipo === 'EMPRESA' && (
                  <>
                    <div className="flex justify-between py-1 border-b border-[#F4F3F8]">
                      <span>Personas Referentes:</span>
                      <span className="font-semibold text-[#1E1B2E]">{contactosReferentes.length} registradas</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Direcciones Adicionales:</span>
                      <span className="font-semibold text-[#1E1B2E]">{direccionesAdicionales.length} sucursales</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </Grid>

        {/* Columna Derecha: Pestañas de Gestión Detallada */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              overflow: 'hidden'
            }}
          >
            {/* Cabecera de Pestañas */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                borderBottom: '1px solid #E6E4F0',
                px: 3,
                pt: 1,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  minHeight: 48
                },
                '& .Mui-selected': {
                  color: '#6C5CE7 !important'
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#6C5CE7'
                }
              }}
            >
              <Tab icon={<i className="tabler-id text-lg mr-1.5" />} iconPosition="start" label="Información General" />
              {tipo === 'EMPRESA' && (
                <Tab
                  icon={<i className="tabler-users text-lg mr-1.5" />}
                  iconPosition="start"
                  label={`Personas Referentes (${contactosReferentes.length})`}
                />
              )}
              {tipo === 'EMPRESA' && (
                <Tab
                  icon={<i className="tabler-map-pins text-lg mr-1.5" />}
                  iconPosition="start"
                  label={`Direcciones / Sucursales (${direccionesAdicionales.length})`}
                />
              )}
            </Tabs>

            <CardContent className="p-6">
              {/* PESTAÑA 0: INFORMACIÓN GENERAL & FISCAL */}
              {activeTab === 0 && (
                <div className="space-y-6">
                  {/* Selector de Tipo */}
                  <div>
                    <Typography variant="subtitle2" className="font-bold text-[#1E1B2E] mb-2">
                      Tipo de Entidad
                    </Typography>
                    <div className="flex gap-3 max-w-md">
                      <Button
                        variant={tipo === 'EMPRESA' ? 'contained' : 'outlined'}
                        onClick={() => setTipo('EMPRESA')}
                        startIcon={<i className="tabler-building" />}
                        sx={{
                          flex: 1,
                          borderRadius: '9999px',
                          backgroundColor: tipo === 'EMPRESA' ? '#6C5CE7' : 'transparent',
                          borderColor: tipo === 'EMPRESA' ? '#6C5CE7' : '#DCD8EC',
                          color: tipo === 'EMPRESA' ? '#FFFFFF' : '#1E1B2E',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: tipo === 'EMPRESA' ? '#5A4AD1' : '#F4F3F8' }
                        }}
                      >
                        Empresa (Jurídica)
                      </Button>
                      <Button
                        variant={tipo === 'INDIVIDUAL' ? 'contained' : 'outlined'}
                        onClick={() => setTipo('INDIVIDUAL')}
                        startIcon={<i className="tabler-user" />}
                        sx={{
                          flex: 1,
                          borderRadius: '9999px',
                          backgroundColor: tipo === 'INDIVIDUAL' ? '#6C5CE7' : 'transparent',
                          borderColor: tipo === 'INDIVIDUAL' ? '#6C5CE7' : '#DCD8EC',
                          color: tipo === 'INDIVIDUAL' ? '#FFFFFF' : '#1E1B2E',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: tipo === 'INDIVIDUAL' ? '#5A4AD1' : '#F4F3F8' }
                        }}
                      >
                        Individual (Natural)
                      </Button>
                    </div>
                  </div>

                  {/* Clasificación Comercial */}
                  <div>
                    <Typography variant="subtitle2" className="font-bold text-[#1E1B2E] mb-1">
                      Relación Comercial
                    </Typography>
                    <div className="flex flex-wrap gap-4">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isCliente}
                            onChange={e => setIsCliente(e.target.checked)}
                            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                          />
                        }
                        label={<span className="text-sm font-medium text-[#1E1B2E]">Cliente</span>}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isProveedor}
                            onChange={e => setIsProveedor(e.target.checked)}
                            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                          />
                        }
                        label={<span className="text-sm font-medium text-[#1E1B2E]">Proveedor</span>}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isContacto}
                            onChange={e => setIsContacto(e.target.checked)}
                            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                          />
                        }
                        label={<span className="text-sm font-medium text-[#1E1B2E]">Contacto General</span>}
                      />
                    </div>
                  </div>

                  <Divider />

                  {/* Identificación, Código, Origen y Razón Social */}
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        fullWidth
                        label="Código"
                        placeholder="Ej: CLI-001"
                        value={codigo}
                        onChange={e => setCodigo(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        select
                        fullWidth
                        label="Origen"
                        value={origen}
                        onChange={e => {
                          const val = e.target.value as EntityOrigin;
                          setOrigen(val);
                          if (val === 'NACIONAL' && (!pais || pais === '')) setPais('Venezuela');
                        }}
                      >
                        <MenuItem value="NACIONAL">Nacional</MenuItem>
                        <MenuItem value="EXTRANJERO">Extranjero</MenuItem>
                      </CustomTextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        fullWidth
                        label={
                          origen === 'EXTRANJERO'
                            ? 'Tax ID / ID Extranjero *'
                            : tipo === 'EMPRESA'
                            ? 'RIF Fiscal (J-...) *'
                            : 'Cédula de Identidad (V-...) *'
                        }
                        placeholder={
                          origen === 'EXTRANJERO'
                            ? 'Ej: EIN-91-1646860 o VAT'
                            : tipo === 'EMPRESA'
                            ? 'Ej: J-00041312-1'
                            : 'Ej: V-12345678'
                        }
                        value={identificacion}
                        onChange={e => setIdentificacion(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: tipo === 'EMPRESA' ? 6 : 12 }}>
                      <CustomTextField
                        fullWidth
                        label={tipo === 'EMPRESA' ? 'Razón Social *' : 'Nombre Completo *'}
                        placeholder={tipo === 'EMPRESA' ? 'Ej: C.A. Ron Santa Teresa' : 'Ej: María Rodríguez'}
                        value={nombreRazonSocial}
                        onChange={e => setNombreRazonSocial(e.target.value)}
                      />
                    </Grid>
                    {tipo === 'EMPRESA' && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          label="Nombre Comercial (Opcional)"
                          placeholder="Ej: Santa Teresa"
                          value={nombreComercial}
                          onChange={e => setNombreComercial(e.target.value)}
                        />
                      </Grid>
                    )}
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        fullWidth
                        label="Teléfono Principal"
                        placeholder="Ej: 0212-2023111 o +1 206 555 0199"
                        value={telefonoPrincipal}
                        onChange={e => setTelefonoPrincipal(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        fullWidth
                        label="Correo Electrónico Principal"
                        placeholder="contacto@empresa.com"
                        type="email"
                        value={emailPrincipal}
                        onChange={e => setEmailPrincipal(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <Divider />

                  {/* Ubicación Geográfica */}
                  <div>
                    <Typography variant="subtitle2" className="font-bold text-[#1E1B2E] mb-3">
                      Ubicación Geográfica Principal
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12 }}>
                        <CustomTextField
                          fullWidth
                          label="Dirección Fiscal o Principal"
                          placeholder="Av. Francisco de Miranda, Edif. Torre..."
                          value={direccion}
                          onChange={e => setDireccion(e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          label="Ciudad"
                          placeholder="Caracas"
                          value={ciudad}
                          onChange={e => setCiudad(e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          label="Estado / Región"
                          placeholder="Miranda"
                          value={estado}
                          onChange={e => setEstado(e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          label="País"
                          value={pais}
                          onChange={e => setPais(e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          label="Código Postal"
                          placeholder="1060"
                          value={codigoPostal}
                          onChange={e => setCodigoPostal(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </div>
                </div>
              )}

              {/* PESTAÑA 1: PERSONAS REFERENTES (EMPRESAS) */}
              {activeTab === 1 && tipo === 'EMPRESA' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <Typography variant="h6" className="font-bold text-[#1E1B2E]">
                        Personas de Contacto Referentes
                      </Typography>
                      <Typography variant="caption" className="text-[#6B7280]">
                        Representantes legales, compras, tesorería y otros cargos clave dentro de la empresa
                      </Typography>
                    </div>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<i className="tabler-plus" />}
                      onClick={handleOpenAddPerson}
                      sx={{
                        borderRadius: '9999px',
                        backgroundColor: '#6C5CE7',
                        fontWeight: 600,
                        '&:hover': { backgroundColor: '#5A4AD1' }
                      }}
                    >
                      Agregar Persona Referente
                    </Button>
                  </div>

                  {contactosReferentes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-[#E6E4F0] rounded-2xl bg-[#F8F7FC]">
                      <i className="tabler-users text-4xl text-[#9CA3AF] mb-2" />
                      <Typography variant="body1" className="font-semibold text-[#1E1B2E]">
                        Sin personas de contacto asociadas
                      </Typography>
                      <Typography variant="caption" className="text-[#6B7280] mb-3">
                        Registra a los representantes o responsables operativos de esta empresa.
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleOpenAddPerson}
                        sx={{ borderRadius: '9999px', borderColor: '#6C5CE7', color: '#6C5CE7' }}
                      >
                        Registrar Primera Persona
                      </Button>
                    </div>
                  ) : (
                    <TableContainer className="border border-[#E6E4F0] rounded-xl overflow-hidden">
                      <Table>
                        <TableHead className="bg-[#F8F7FC]">
                          <TableRow sx={{ '& th': { fontWeight: 600, color: '#6B7280', fontSize: '0.78rem' } }}>
                            <TableCell>NOMBRE Y CARGO</TableCell>
                            <TableCell>ROL EN LA EMPRESA</TableCell>
                            <TableCell>TELÉFONO</TableCell>
                            <TableCell>CORREO ELECTRÓNICO</TableCell>
                            <TableCell align="right">ACCIONES</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {contactosReferentes.map(p => (
                            <TableRow key={p.id} hover sx={{ '& td': { py: 1.5, borderColor: '#F4F3F8' } }}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div>
                                    <span className="font-semibold text-sm text-[#1E1B2E] block">{p.nombre}</span>
                                    <span className="text-xs text-[#6B7280]">
                                      {p.cargo} {p.cedula_identidad ? `· C.I: ${p.cedula_identidad}` : ''}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <ContactRoleChip rol={p.rol} isPrincipal={p.is_principal} />
                              </TableCell>
                              <TableCell className="text-xs font-mono font-medium text-[#1E1B2E]">
                                {p.telefono}
                              </TableCell>
                              <TableCell>
                                {p.email ? (
                                  <a href={`mailto:${p.email}`} className="text-xs text-[#6C5CE7] hover:underline">
                                    {p.email}
                                  </a>
                                ) : (
                                  <span className="text-xs text-[#9CA3AF]">-</span>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <div className="flex justify-end gap-1">
                                  <Tooltip title="Editar">
                                    <IconButton size="small" onClick={() => handleOpenEditPerson(p)} sx={{ color: '#6C5CE7' }}>
                                      <i className="tabler-edit text-base" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Eliminar">
                                    <IconButton size="small" onClick={() => handleDeletePerson(p.id)} sx={{ color: '#EF4444' }}>
                                      <i className="tabler-trash text-base" />
                                    </IconButton>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </div>
              )}

              {/* PESTAÑA 2: DIRECCIONES ADICIONALES (EMPRESAS) */}
              {activeTab === 2 && tipo === 'EMPRESA' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <Typography variant="h6" className="font-bold text-[#1E1B2E]">
                        Sucursales y Direcciones Adicionales
                      </Typography>
                      <Typography variant="caption" className="text-[#6B7280]">
                        Puntos de entrega, almacenes de recepción y sedes de facturación secundaria
                      </Typography>
                    </div>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<i className="tabler-plus" />}
                      onClick={handleOpenAddAddress}
                      sx={{
                        borderRadius: '9999px',
                        backgroundColor: '#6C5CE7',
                        fontWeight: 600,
                        '&:hover': { backgroundColor: '#5A4AD1' }
                      }}
                    >
                      Agregar Dirección
                    </Button>
                  </div>

                  {direccionesAdicionales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-[#E6E4F0] rounded-2xl bg-[#F8F7FC]">
                      <i className="tabler-map-pin text-4xl text-[#9CA3AF] mb-2" />
                      <Typography variant="body1" className="font-semibold text-[#1E1B2E]">
                        No hay direcciones adicionales registradas
                      </Typography>
                      <Typography variant="caption" className="text-[#6B7280] mb-3">
                        Se utilizará la dirección fiscal principal como destino predeterminado.
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleOpenAddAddress}
                        sx={{ borderRadius: '9999px', borderColor: '#6C5CE7', color: '#6C5CE7' }}
                      >
                        Registrar Sucursal o Almacén
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {direccionesAdicionales.map(addr => (
                        <Card
                          key={addr.id}
                          sx={{
                            borderRadius: '16px',
                            border: '1px solid #E6E4F0',
                            p: 2.5,
                            backgroundColor: '#FFFFFF',
                            boxShadow: 'none'
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                  addr.tipo === 'ENTREGA'
                                    ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                                    : addr.tipo === 'FACTURACION'
                                    ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                                }`}
                              >
                                {addr.tipo === 'ENTREGA'
                                  ? 'Despacho / Entrega'
                                  : addr.tipo === 'FACTURACION'
                                  ? 'Facturación'
                                  : 'Fiscal'}
                              </span>
                              {addr.is_predeterminada && (
                                <span className="text-[10px] bg-[#F3F0FF] text-[#6C5CE7] font-semibold px-2 py-0.5 rounded border border-[#E9D5FF]">
                                  Predeterminada
                                </span>
                              )}
                            </div>
                            <IconButton size="small" onClick={() => handleDeleteAddress(addr.id)} sx={{ color: '#EF4444' }}>
                              <i className="tabler-trash text-sm" />
                            </IconButton>
                          </div>
                          <Typography variant="body2" className="font-semibold text-[#1E1B2E] mb-1">
                            {addr.direccion}
                          </Typography>
                          <Typography variant="caption" className="text-[#6B7280]">
                            {addr.ciudad}, {addr.estado} ({addr.pais}) {addr.codigo_postal ? `· C.P. ${addr.codigo_postal}` : ''}
                          </Typography>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modal Agregar / Editar Persona Referente */}
      <Dialog
        open={personModalOpen}
        onClose={() => setPersonModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle className="font-bold text-[#1E1B2E]">
          {editingPersonId ? 'Editar Persona Referente' : 'Agregar Persona de Contacto en la Empresa'}
        </DialogTitle>
        <DialogContent className="space-y-4 pt-2">
          <Typography variant="caption" className="text-[#6B7280] block mb-2">
            Indica el rol que desempeña esta persona en la estructura de la empresa.
          </Typography>
          <CustomTextField
            fullWidth
            label="Nombre Completo *"
            placeholder="Ej: Lic. Carlos Mendoza"
            value={personNombre}
            onChange={e => setPersonNombre(e.target.value)}
          />
          <CustomTextField
            fullWidth
            label="Cargo o Posición"
            placeholder="Ej: Gerente de Compras y Suministros"
            value={personCargo}
            onChange={e => setPersonCargo(e.target.value)}
          />
          <CustomTextField
            select
            fullWidth
            label="Rol de Entidad en la Empresa *"
            value={personRol}
            onChange={e => setPersonRol(e.target.value as ContactPersonRole)}
          >
            {roleOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </CustomTextField>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label="Teléfono Directo *"
                placeholder="0414-1234567"
                value={personTelefono}
                onChange={e => setPersonTelefono(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label="Cédula de Identidad (Opcional)"
                placeholder="V-12345678"
                value={personCI}
                onChange={e => setPersonCI(e.target.value)}
              />
            </Grid>
          </Grid>
          <CustomTextField
            fullWidth
            label="Correo Electrónico"
            placeholder="carlos.mendoza@polar.com"
            type="email"
            value={personEmail}
            onChange={e => setPersonEmail(e.target.value)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={personPrincipal}
                onChange={e => setPersonPrincipal(e.target.checked)}
                sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
              />
            }
            label={<span className="text-sm font-medium text-[#1E1B2E]">Marcar como persona de contacto principal</span>}
          />
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setPersonModalOpen(false)} sx={{ color: '#6B7280' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePerson}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              px: 3,
              '&:hover': { backgroundColor: '#5A4AD1' }
            }}
          >
            Guardar Persona
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Agregar Dirección */}
      <Dialog
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle className="font-bold text-[#1E1B2E]">
          {editingAddressId ? 'Editar Dirección' : 'Agregar Dirección Adicional'}
        </DialogTitle>
        <DialogContent className="space-y-4 pt-2">
          <CustomTextField
            select
            fullWidth
            label="Tipo de Dirección"
            value={addressTipo}
            onChange={e => setAddressTipo(e.target.value as AddressType)}
          >
            <MenuItem value="ENTREGA">Despacho / Entrega de Mercancía</MenuItem>
            <MenuItem value="FACTURACION">Facturación y Cobranzas</MenuItem>
            <MenuItem value="FISCAL">Sede Fiscal / Sucursal</MenuItem>
          </CustomTextField>
          <CustomTextField
            fullWidth
            label="Dirección Completa *"
            placeholder="Zona Industrial Los Cortijos, Galpón B-12"
            value={addressDireccion}
            onChange={e => setAddressDireccion(e.target.value)}
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label="Ciudad *"
                placeholder="Caracas"
                value={addressCiudad}
                onChange={e => setAddressCiudad(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label="Estado / Región *"
                placeholder="Miranda"
                value={addressEstado}
                onChange={e => setAddressEstado(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label="País"
                value={addressPais}
                onChange={e => setAddressPais(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                label="Código Postal"
                placeholder="1071"
                value={addressCP}
                onChange={e => setAddressCP(e.target.value)}
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={
              <Checkbox
                checked={addressPredeterminada}
                onChange={e => setAddressPredeterminada(e.target.checked)}
                sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
              />
            }
            label={<span className="text-sm font-medium text-[#1E1B2E]">Dirección predeterminada para este tipo</span>}
          />
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setAddressModalOpen(false)} sx={{ color: '#6B7280' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAddress}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              px: 3,
              '&:hover': { backgroundColor: '#5A4AD1' }
            }}
          >
            Guardar Dirección
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar Eliminación */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle className="font-bold text-[#EF4444] flex items-center gap-2">
          <i className="tabler-alert-triangle text-2xl" /> ¿Eliminar Contacto?
        </DialogTitle>
        <DialogContent>
          <Typography className="text-[#6B7280]">
            ¿Estás seguro de que deseas eliminar a <strong>{nombreRazonSocial}</strong> del directorio? Esta entidad
            pasará a estado inactivo.
          </Typography>
        </DialogContent>
        <DialogActions className="p-3">
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: '#6B7280' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ borderRadius: '9999px' }}
          >
            Sí, Eliminar
          </Button>
        </DialogActions>
      </Dialog>

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
            bgcolor:
              toast.severity === 'success' ? '#10B981' : toast.severity === 'error' ? '#EF4444' : '#6C5CE7'
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ContactDetailView;
