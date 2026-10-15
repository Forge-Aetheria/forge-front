'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import Tooltip from '@mui/material/Tooltip';
import CustomTextField from '@core/components/mui/TextField';
import {
  TerceroEntity,
  TerceroFormData,
  EntityType,
  EntityOrigin,
  ContactPerson,
  EntityAddress,
  ContactPersonRole,
  AddressType
} from '@/types/contactsTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TerceroFormData) => Promise<{ success: boolean; message?: string }>;
  initialData?: TerceroEntity | null;
}

export const ContactFormDrawer: React.FC<Props> = ({ open, onClose, onSubmit, initialData }) => {
  const router = useRouter();

  // Estado del formulario
  const [codigo, setCodigo] = useState('');
  const [origen, setOrigen] = useState<EntityOrigin>('NACIONAL');
  const [tipo, setTipo] = useState<EntityType>('EMPRESA');
  const [nombreRazonSocial, setNombreRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [isCliente, setIsCliente] = useState(true);
  const [isProveedor, setIsProveedor] = useState(false);
  const [isContacto, setIsContacto] = useState(false);
  const [telefonoPrincipal, setTelefonoPrincipal] = useState('');
  const [emailPrincipal, setEmailPrincipal] = useState('');

  // Ubicación
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [estado, setEstado] = useState('');
  const [pais, setPais] = useState('Venezuela');
  const [codigoPostal, setCodigoPostal] = useState('');

  // Sub-listas (Empresa)
  const [contactosReferentes, setContactosReferentes] = useState<ContactPerson[]>([]);
  const [direccionesAdicionales, setDireccionesAdicionales] = useState<EntityAddress[]>([]);

  // Estados modales internos para agregar persona / dirección
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonNombre, setNewPersonNombre] = useState('');
  const [newPersonCargo, setNewPersonCargo] = useState('');
  const [newPersonTelefono, setNewPersonTelefono] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonRol, setNewPersonRol] = useState<ContactPersonRole>('OPERATIVO');
  const [newPersonCI, setNewPersonCI] = useState('');
  const [newPersonPrincipal, setNewPersonPrincipal] = useState(false);

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrTipo, setNewAddrTipo] = useState<AddressType>('ENTREGA');
  const [newAddrDireccion, setNewAddrDireccion] = useState('');
  const [newAddrCiudad, setNewAddrCiudad] = useState('');
  const [newAddrEstado, setNewAddrEstado] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCodigo(initialData.codigo || '');
      setOrigen(initialData.origen || 'NACIONAL');
      setTipo(initialData.tipo);
      setNombreRazonSocial(initialData.nombre_razon_social);
      setNombreComercial(initialData.nombre_comercial || '');
      setIdentificacion(initialData.identificacion);
      setIsCliente(initialData.is_cliente);
      setIsProveedor(initialData.is_proveedor);
      setIsContacto(initialData.is_contacto);
      setTelefonoPrincipal(initialData.telefono_principal);
      setEmailPrincipal(initialData.email_principal || '');
      setDireccion(initialData.direccion);
      setCiudad(initialData.ciudad);
      setEstado(initialData.estado);
      setPais(initialData.pais || 'Venezuela');
      setCodigoPostal(initialData.codigo_postal || '');
      setContactosReferentes(initialData.contactos_referentes || []);
      setDireccionesAdicionales(initialData.direcciones_adicionales || []);
    } else {
      setCodigo('');
      setOrigen('NACIONAL');
      setTipo('EMPRESA');
      setNombreRazonSocial('');
      setNombreComercial('');
      setIdentificacion('');
      setIsCliente(true);
      setIsProveedor(false);
      setIsContacto(false);
      setTelefonoPrincipal('');
      setEmailPrincipal('');
      setDireccion('');
      setCiudad('');
      setEstado('');
      setPais('Venezuela');
      setCodigoPostal('');
      setContactosReferentes([]);
      setDireccionesAdicionales([]);
    }
    setFormError(null);
    setShowAddPerson(false);
    setShowAddAddress(false);
  }, [initialData, open]);

  // Agregar persona de contacto referente a la empresa
  const handleAddPerson = () => {
    if (!newPersonNombre.trim() || !newPersonTelefono.trim()) {
      alert('Nombre y teléfono de la persona son obligatorios');
      return;
    }
    const newPerson: ContactPerson = {
      id: `ref-${Date.now()}`,
      nombre: newPersonNombre.trim(),
      cargo: newPersonCargo.trim() || 'Contacto',
      telefono: newPersonTelefono.trim(),
      email: newPersonEmail.trim(),
      rol: newPersonRol,
      is_principal: newPersonPrincipal,
      cedula_identidad: newPersonCI.trim() || undefined
    };

    setContactosReferentes(prev => {
      let updated = [...prev, newPerson];
      if (newPersonPrincipal) {
        updated = updated.map(p => (p.id !== newPerson.id ? { ...p, is_principal: false } : p));
      }
      return updated;
    });

    // Reset modal interno
    setNewPersonNombre('');
    setNewPersonCargo('');
    setNewPersonTelefono('');
    setNewPersonEmail('');
    setNewPersonRol('OPERATIVO');
    setNewPersonCI('');
    setNewPersonPrincipal(false);
    setShowAddPerson(false);
  };

  const handleRemovePerson = (id: string) => {
    setContactosReferentes(prev => prev.filter(p => p.id !== id));
  };

  // Agregar dirección adicional
  const handleAddAddress = () => {
    if (!newAddrDireccion.trim()) {
      alert('La dirección es obligatoria');
      return;
    }
    const newAddr: EntityAddress = {
      id: `dir-${Date.now()}`,
      tipo: newAddrTipo,
      direccion: newAddrDireccion.trim(),
      ciudad: newAddrCiudad.trim() || ciudad,
      estado: newAddrEstado.trim() || estado,
      pais: pais,
      is_predeterminada: false
    };
    setDireccionesAdicionales(prev => [...prev, newAddr]);
    setNewAddrDireccion('');
    setNewAddrCiudad('');
    setNewAddrEstado('');
    setShowAddAddress(false);
  };

  const handleRemoveAddress = (id: string) => {
    setDireccionesAdicionales(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nombreRazonSocial.trim()) {
      setFormError('El nombre o razón social es obligatorio');
      return;
    }
    if (!identificacion.trim()) {
      setFormError('El RIF o Cédula de Identidad es obligatorio');
      return;
    }
    if (!isCliente && !isProveedor && !isContacto) {
      setFormError('Debe marcar al menos una relación comercial (Cliente o Proveedor)');
      return;
    }
    if (!direccion.trim() || !ciudad.trim() || !estado.trim()) {
      setFormError('La dirección, ciudad y estado son obligatorios');
      return;
    }

    const payload: TerceroFormData = {
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

    setIsSubmitting(true);
    const res = await onSubmit(payload);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setFormError(res.message || 'Error al guardar');
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 540 },
          p: { xs: 3, sm: 4 },
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E6E4F0'
        }
      }}
    >
      <div className="flex justify-between items-center pb-3 border-b border-[#E6E4F0] mb-4">
        <div>
          <Typography variant="h5" sx={{ color: '#1E1B2E', fontWeight: 700 }}>
            {initialData ? 'Editar Contacto' : 'Nuevo Contacto'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            {tipo === 'EMPRESA'
              ? 'Empresa (Persona Jurídica) con personas referentes y sucursales'
              : 'Contacto Individual (Persona Natural)'}
          </Typography>
        </div>
        <div className="flex items-center gap-1">
          {initialData && (
            <Tooltip title="Abrir ficha completa">
              <IconButton
                size="small"
                onClick={() => {
                  onClose();
                  router.push(`/contacts/${initialData.id}`);
                }}
                sx={{ color: '#6C5CE7' }}
              >
                <i className="tabler-maximize text-lg" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={onClose} sx={{ color: '#6B7280' }}>
            <i className="tabler-x text-xl" />
          </IconButton>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col justify-between overflow-y-auto pr-1">
        <div className="space-y-5">
          {formError && (
            <div className="p-3 bg-[#FEE2E2] border border-[#EF4444] rounded-xl text-xs text-[#EF4444] font-medium">
              {formError}
            </div>
          )}

          {/* 1. Selector de Tipo: Empresa vs Individual */}
          <div>
            <Typography variant="subtitle2" sx={{ color: '#1E1B2E', fontWeight: 600, mb: 1.5 }}>
              Tipo de Entidad
            </Typography>
            <div className="flex gap-3">
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

          {/* 2. Clasificación Comercial */}
          <div>
            <Typography variant="subtitle2" sx={{ color: '#1E1B2E', fontWeight: 600, mb: 1 }}>
              Relación Comercial (Marcar aplicables) *
            </Typography>
            <div className="flex gap-2 flex-wrap">
              <Chip
                label="Cliente"
                clickable
                color={isCliente ? 'primary' : 'default'}
                variant={isCliente ? 'filled' : 'outlined'}
                onClick={() => setIsCliente(!isCliente)}
                icon={<i className="tabler-check text-xs" />}
                sx={{ borderRadius: '9999px', fontWeight: 600 }}
              />
              <Chip
                label="Proveedor"
                clickable
                color={isProveedor ? 'info' : 'default'}
                variant={isProveedor ? 'filled' : 'outlined'}
                onClick={() => setIsProveedor(!isProveedor)}
                icon={<i className="tabler-truck text-xs" />}
                sx={{ borderRadius: '9999px', fontWeight: 600 }}
              />
              <Chip
                label="Contacto General"
                clickable
                color={isContacto ? 'warning' : 'default'}
                variant={isContacto ? 'filled' : 'outlined'}
                onClick={() => setIsContacto(!isContacto)}
                sx={{ borderRadius: '9999px', fontWeight: 600 }}
              />
            </div>
          </div>

          <Divider sx={{ borderColor: '#E6E4F0' }} />

          {/* 3. Datos Generales */}
          <div className="space-y-3">
            <Typography variant="subtitle2" sx={{ color: '#6C5CE7', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>
              Información General
            </Typography>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomTextField
                fullWidth
                label="Código"
                placeholder="Ej: CLI-001"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
              />
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
            </div>
            <CustomTextField
              fullWidth
              label={tipo === 'EMPRESA' ? 'Razón Social *' : 'Nombre Completo *'}
              placeholder={tipo === 'EMPRESA' ? 'Ej: Inversiones Polar C.A.' : 'Ej: Juan Carlos Pérez'}
              value={nombreRazonSocial}
              onChange={e => setNombreRazonSocial(e.target.value)}
            />
            {tipo === 'EMPRESA' && (
              <CustomTextField
                fullWidth
                label="Nombre Comercial / Fantasía (Opcional)"
                placeholder="Ej: Alimentos Polar"
                value={nombreComercial}
                onChange={e => setNombreComercial(e.target.value)}
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomTextField
                fullWidth
                label={
                  origen === 'EXTRANJERO'
                    ? 'Tax ID / ID Extranjero *'
                    : tipo === 'EMPRESA'
                    ? 'RIF (J-...) *'
                    : 'Cédula / Documento *'
                }
                placeholder={
                  origen === 'EXTRANJERO'
                    ? 'Ej: EIN-91-1646860 o VAT'
                    : tipo === 'EMPRESA'
                    ? 'J-12345678-9'
                    : 'V-16890432'
                }
                value={identificacion}
                onChange={e => setIdentificacion(e.target.value)}
              />
              <CustomTextField
                fullWidth
                label="Teléfono Principal *"
                placeholder="02122023111 / 0414..."
                value={telefonoPrincipal}
                onChange={e => setTelefonoPrincipal(e.target.value)}
              />
            </div>
            <CustomTextField
              fullWidth
              label={tipo === 'EMPRESA' ? 'Razón Social *' : 'Nombre Completo *'}
              placeholder={tipo === 'EMPRESA' ? 'Ej: Inversiones Polar C.A.' : 'Ej: Juan Carlos Pérez'}
              value={nombreRazonSocial}
              onChange={e => setNombreRazonSocial(e.target.value)}
            />
            {tipo === 'EMPRESA' && (
              <CustomTextField
                fullWidth
                label="Nombre Comercial / Fantasía (Opcional)"
                placeholder="Ej: Alimentos Polar"
                value={nombreComercial}
                onChange={e => setNombreComercial(e.target.value)}
              />
            )}
            <CustomTextField
              fullWidth
              label="Teléfono Principal *"
              placeholder="02122023111 / 0414..."
              value={telefonoPrincipal}
              onChange={e => setTelefonoPrincipal(e.target.value)}
            />
            <CustomTextField
              fullWidth
              label="Correo Electrónico Principal"
              placeholder="contacto@empresa.com"
              value={emailPrincipal}
              onChange={e => setEmailPrincipal(e.target.value)}
            />
          </div>

          <Divider sx={{ borderColor: '#E6E4F0' }} />

          {/* 4. Ubicación Geográfica */}
          <div className="space-y-3">
            <Typography variant="subtitle2" sx={{ color: '#6C5CE7', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>
              Ubicación Geográfica
            </Typography>
            <CustomTextField
              fullWidth
              multiline
              rows={2}
              label="Dirección Principal *"
              placeholder="Calle, avenida, edificio, galpón o local..."
              value={direccion}
              onChange={e => setDireccion(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <CustomTextField
                fullWidth
                label="Ciudad *"
                placeholder="Ej: Caracas"
                value={ciudad}
                onChange={e => setCiudad(e.target.value)}
              />
              <CustomTextField
                fullWidth
                label="Estado / Región *"
                placeholder="Ej: Miranda"
                value={estado}
                onChange={e => setEstado(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CustomTextField
                fullWidth
                label="País *"
                value={pais}
                onChange={e => setPais(e.target.value)}
              />
              <CustomTextField
                fullWidth
                label="Código Postal"
                placeholder="1071"
                value={codigoPostal}
                onChange={e => setCodigoPostal(e.target.value)}
              />
            </div>
          </div>

          {/* 5. SECCIÓN CONDICIONAL: Solo si es EMPRESA */}
          {tipo === 'EMPRESA' && (
            <>
              <Divider sx={{ borderColor: '#E6E4F0' }} />

              {/* Sub-panel: Personas de Contacto de Referencia */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <Typography variant="subtitle2" sx={{ color: '#6C5CE7', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      Personas de Contacto en la Empresa
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      Roles de entidad: Rep. Legal, Pagos, Compras, etc.
                    </Typography>
                  </div>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<i className="tabler-plus" />}
                    onClick={() => setShowAddPerson(true)}
                    sx={{ borderRadius: '9999px', fontSize: '0.75rem' }}
                  >
                    Agregar Persona
                  </Button>
                </div>

                {contactosReferentes.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF] italic bg-[#FAFAFC] p-3 rounded-xl border border-dashed border-[#DCD8EC]">
                    No se han registrado personas de contacto aún.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contactosReferentes.map(p => (
                      <Card
                        key={p.id}
                        sx={{
                          p: 1.5,
                          borderRadius: '12px',
                          border: '1px solid #E6E4F0',
                          backgroundColor: '#FAFAFC',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-[#1E1B2E]">{p.nombre}</span>
                            {p.is_principal && (
                              <Chip size="small" label="Principal" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#F3F0FF', color: '#6C5CE7' }} />
                            )}
                          </div>
                          <p className="text-xs text-[#6B7280]">
                            {p.cargo} • <strong className="text-[#6C5CE7]">{p.rol}</strong> • {p.telefono}
                          </p>
                        </div>
                        <IconButton size="small" onClick={() => handleRemovePerson(p.id)} sx={{ color: '#EF4444' }}>
                          <i className="tabler-trash text-sm" />
                        </IconButton>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Sub-formulario Modal para agregar persona */}
                {showAddPerson && (
                  <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #6C5CE7', bgcolor: '#FBFBFF' }} className="space-y-3">
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6C5CE7' }}>
                      Nueva Persona de Contacto
                    </Typography>
                    <CustomTextField
                      fullWidth
                      label="Nombre y Apellido *"
                      value={newPersonNombre}
                      onChange={e => setNewPersonNombre(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <CustomTextField
                        fullWidth
                        label="Cargo en la Empresa *"
                        placeholder="Ej: Gerente de Finanzas"
                        value={newPersonCargo}
                        onChange={e => setNewPersonCargo(e.target.value)}
                      />
                      <CustomTextField
                        fullWidth
                        select
                        label="Rol de Entidad *"
                        value={newPersonRol}
                        onChange={e => setNewPersonRol(e.target.value as ContactPersonRole)}
                      >
                        <MenuItem value="REPRESENTANTE_LEGAL">Representante Legal</MenuItem>
                        <MenuItem value="PAGOS_RETENCIONES">Pagos y Retenciones (Fiscal)</MenuItem>
                        <MenuItem value="COMPRAS">Compras</MenuItem>
                        <MenuItem value="VENTAS">Ventas</MenuItem>
                        <MenuItem value="ADMINISTRATIVO">Administrativo</MenuItem>
                        <MenuItem value="OPERATIVO">Operativo</MenuItem>
                      </CustomTextField>
                    </div>

                    {newPersonRol === 'REPRESENTANTE_LEGAL' && (
                      <CustomTextField
                        fullWidth
                        label="Cédula de Identidad (V/E) *"
                        placeholder="V-12345678"
                        value={newPersonCI}
                        onChange={e => setNewPersonCI(e.target.value)}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <CustomTextField
                        fullWidth
                        label="Teléfono Móvil *"
                        placeholder="04141234567"
                        value={newPersonTelefono}
                        onChange={e => setNewPersonTelefono(e.target.value)}
                      />
                      <CustomTextField
                        fullWidth
                        label="Correo Directo"
                        placeholder="persona@empresa.com"
                        value={newPersonEmail}
                        onChange={e => setNewPersonEmail(e.target.value)}
                      />
                    </div>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newPersonPrincipal}
                          onChange={e => setNewPersonPrincipal(e.target.checked)}
                          sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                        />
                      }
                      label={<span className="text-xs font-medium">Contacto Principal de la Empresa</span>}
                    />

                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="small" variant="text" onClick={() => setShowAddPerson(false)}>
                        Cancelar
                      </Button>
                      <Button size="small" variant="contained" onClick={handleAddPerson} sx={{ borderRadius: '9999px', bgcolor: '#6C5CE7' }}>
                        Guardar Persona
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              <Divider sx={{ borderColor: '#E6E4F0' }} />

              {/* Sub-panel: Direcciones Adicionales (Entrega / Facturación) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <Typography variant="subtitle2" sx={{ color: '#6C5CE7', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      Direcciones de Entrega y Facturación
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      Sucursales, almacenes y puntos de despacho
                    </Typography>
                  </div>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<i className="tabler-plus" />}
                    onClick={() => setShowAddAddress(true)}
                    sx={{ borderRadius: '9999px', fontSize: '0.75rem' }}
                  >
                    Agregar Dirección
                  </Button>
                </div>

                {direccionesAdicionales.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF] italic bg-[#FAFAFC] p-3 rounded-xl border border-dashed border-[#DCD8EC]">
                    No hay direcciones adicionales. Se utilizará la dirección principal para despachos.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {direccionesAdicionales.map(a => (
                      <Card
                        key={a.id}
                        sx={{
                          p: 1.5,
                          borderRadius: '12px',
                          border: '1px solid #E6E4F0',
                          backgroundColor: '#FAFAFC',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <Chip size="small" label={a.tipo} sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#E6E4F0' }} />
                          <p className="text-xs font-medium text-[#1E1B2E] mt-1">{a.direccion}</p>
                          <p className="text-xs text-[#6B7280]">{a.ciudad}, {a.estado}</p>
                        </div>
                        <IconButton size="small" onClick={() => handleRemoveAddress(a.id)} sx={{ color: '#EF4444' }}>
                          <i className="tabler-trash text-sm" />
                        </IconButton>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Sub-formulario Modal para agregar dirección */}
                {showAddAddress && (
                  <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #6C5CE7', bgcolor: '#FBFBFF' }} className="space-y-3">
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6C5CE7' }}>
                      Nueva Dirección Adicional
                    </Typography>
                    <CustomTextField
                      fullWidth
                      select
                      label="Tipo de Dirección"
                      value={newAddrTipo}
                      onChange={e => setNewAddrTipo(e.target.value as AddressType)}
                    >
                      <MenuItem value="ENTREGA">Dirección de Entrega / Despacho</MenuItem>
                      <MenuItem value="FACTURACION">Dirección de Facturación</MenuItem>
                      <MenuItem value="FISCAL">Sucursal Fiscal Alternativa</MenuItem>
                    </CustomTextField>
                    <CustomTextField
                      fullWidth
                      label="Dirección Completa *"
                      placeholder="Galpón, centro de distribución o local..."
                      value={newAddrDireccion}
                      onChange={e => setNewAddrDireccion(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <CustomTextField
                        fullWidth
                        label="Ciudad"
                        placeholder={ciudad || 'Ciudad'}
                        value={newAddrCiudad}
                        onChange={e => setNewAddrCiudad(e.target.value)}
                      />
                      <CustomTextField
                        fullWidth
                        label="Estado"
                        placeholder={estado || 'Estado'}
                        value={newAddrEstado}
                        onChange={e => setNewAddrEstado(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="small" variant="text" onClick={() => setShowAddAddress(false)}>
                        Cancelar
                      </Button>
                      <Button size="small" variant="contained" onClick={handleAddAddress} sx={{ borderRadius: '9999px', bgcolor: '#6C5CE7' }}>
                        Guardar Dirección
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer con Botones */}
        <div className="pt-4 border-t border-[#E6E4F0] flex items-center justify-between gap-2 bg-white sticky bottom-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={isSubmitting}
              sx={{ borderRadius: '9999px', borderColor: '#DCD8EC', color: '#6B7280' }}
            >
              Cancelar
            </Button>
            {initialData && (
              <Button
                variant="outlined"
                onClick={() => {
                  onClose();
                  router.push(`/contacts/${initialData.id}`);
                }}
                endIcon={<i className="tabler-arrows-maximize text-sm" />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#6C5CE7',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F3F0FF' }
                }}
              >
                Ficha Completa
              </Button>
            )}
          </div>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              px: 4,
              '&:hover': { backgroundColor: '#5A4AD1' }
            }}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
                <span>Guardando...</span>
              </div>
            ) : (
              'Guardar Contacto'
            )}
          </Button>
        </div>
      </form>
    </Drawer>
  );
};
