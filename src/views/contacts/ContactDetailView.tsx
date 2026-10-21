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
import Switch from '@mui/material/Switch';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
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
import { accountingService } from '@/services/accountingService';
import type { Account } from '@/types/accountingTypes';
import { ContactRoleChip } from './components/ContactRoleChip';
import type { BankAccount } from '@/types/bankAccountTypes';
import { bankAccountsService } from '@/services/bankAccountsService';
import { BankAccountModal } from './components/BankAccountModal';

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
  const [activeTab, setActiveTab] = useState<'general' | 'referentes' | 'direcciones' | 'contabilidad' | 'bancos'>('general');

  // Cuentas Bancarias del Contacto
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [allSystemBankAccounts, setAllSystemBankAccounts] = useState<BankAccount[]>([]);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);

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
  const [cuentasBancarias, setCuentasBancarias] = useState<BankAccount[]>([]);

  const isCreate = id === 'create' || id === 'new';

  // Apartado de Contabilidad y Cuentas Contables (SPEC-008)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cuentaCxcId, setCuentaCxcId] = useState('acc-110201');
  const [cuentaCxcNombre, setCuentaCxcNombre] = useState('Cuentas por Cobrar Clientes Nacionales (CxC)');
  const [cuentaCxpId, setCuentaCxpId] = useState('acc-210101');
  const [cuentaCxpNombre, setCuentaCxpNombre] = useState('Cuentas por Pagar Proveedores Nacionales (CxP)');
  const [plazoPagoDias, setPlazoPagoDias] = useState<number>(15);
  const [limiteCreditoUsd, setLimiteCreditoUsd] = useState<number>(0);
  const [esContribuyenteEspecial, setEsContribuyenteEspecial] = useState<boolean>(false);
  const [porcentajeRetencionIva, setPorcentajeRetencionIva] = useState<number>(75);

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

  // Modales anidados: Direcciones
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
    if (isCreate) {
      setLoading(false);
      setIsCliente(true);
      setCuentasBancarias([]);
      return;
    }

    try {
      setLoading(true);
      const [current, list, accList, contactConfigs, bankList, allBanks] = await Promise.all([
        contactsService.getTerceroById(id),
        contactsService.getTerceros(),
        accountingService.getAccounts(),
        accountingService.getContactAccountingConfigs(),
        bankAccountsService.getContactBankAccounts(id),
        bankAccountsService.getBankAccounts()
      ]);

      setAccounts(accList);
      setBankAccounts(bankList);
      setAllSystemBankAccounts(allBanks);

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
        setCuentasBancarias(current.cuentas_bancarias || []);

        // Cargar cuentas contables y condiciones fiscales
        const existingConfig = contactConfigs.find(
          c => c.contactoId === id || c.contactoRif === current.identificacion
        );

        const cxcId = current.cuenta_cxc_id || existingConfig?.cuentaCxcId || 'acc-110201';
        const cxcAcc = accList.find(a => a.id === cxcId);
        setCuentaCxcId(cxcId);
        setCuentaCxcNombre(current.cuenta_cxc_nombre || existingConfig?.cuentaCxcNombre || cxcAcc?.nombre || 'Cuentas por Cobrar Clientes Nacionales (CxC)');

        const cxpId = current.cuenta_cxp_id || existingConfig?.cuentaCxpId || 'acc-210101';
        const cxpAcc = accList.find(a => a.id === cxpId);
        setCuentaCxpId(cxpId);
        setCuentaCxpNombre(current.cuenta_cxp_nombre || existingConfig?.cuentaCxpNombre || cxpAcc?.nombre || 'Cuentas por Pagar Proveedores Nacionales (CxP)');

        setPlazoPagoDias(current.plazo_pago_dias ?? 15);
        setLimiteCreditoUsd(current.limite_credito_usd ?? 0);
        setEsContribuyenteEspecial(current.es_contribuyente_especial ?? false);
        setPorcentajeRetencionIva(current.porcentaje_retencion_iva ?? 75);
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

  // Gestión de Cuentas Bancarias del Contacto
  const handleOpenNewBankAccount = () => {
    setEditingBankAccount(null);
    setBankModalOpen(true);
  };

  const handleOpenEditBankAccount = (acc: BankAccount) => {
    setEditingBankAccount(acc);
    setBankModalOpen(true);
  };

  const handleDeleteBankAccount = async (accId: string, bancoName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta bancaria de ${bancoName}?`)) return;
    try {
      await bankAccountsService.deleteBankAccount(accId);
      setBankAccounts(prev => prev.filter(a => a.id !== accId));
      setToast({ open: true, message: 'Cuenta bancaria eliminada con éxito', severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
    }
  };

  const handleSetDefaultBankAccount = async (acc: BankAccount) => {
    try {
      await bankAccountsService.setDefaultBankAccount(acc.id, id, false);
      const refreshed = await bankAccountsService.getContactBankAccounts(id);
      setBankAccounts(refreshed);
      setToast({ open: true, message: 'Cuenta establecida como principal', severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Error al actualizar', severity: 'error' });
    }
  };

  const handleBankAccountSaved = async (saved: BankAccount) => {
    const refreshed = await bankAccountsService.getContactBankAccounts(id);
    const allRefreshed = await bankAccountsService.getBankAccounts();
    setBankAccounts(refreshed);
    setAllSystemBankAccounts(allRefreshed);
    setToast({ open: true, message: `Cuenta de ${saved.banco} guardada con éxito`, severity: 'success' });
  };

  const handleLinkExistingAccount = async (bankAccountId: string) => {
    if (!bankAccountId || bankAccountId === 'NONE') return;
    try {
      await bankAccountsService.updateBankAccount(bankAccountId, {
        contacto_id: id,
        contacto_nombre: nombreRazonSocial,
        contacto_tipo: isCliente && isProveedor ? 'AMBOS' : isCliente ? 'CLIENTE' : 'PROVEEDOR',
        is_empresa: false,
        is_predeterminada: bankAccounts.length === 0
      });
      const refreshed = await bankAccountsService.getContactBankAccounts(id);
      const allRefreshed = await bankAccountsService.getBankAccounts();
      setBankAccounts(refreshed);
      setAllSystemBankAccounts(allRefreshed);
      setToast({ open: true, message: 'Cuenta bancaria vinculada al contacto con éxito', severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Error al vincular cuenta', severity: 'error' });
    }
  };

  // Guardar Cambios o Crear Contacto
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
        direcciones_adicionales: tipo === 'EMPRESA' ? direccionesAdicionales : [],
        cuentas_bancarias: cuentasBancarias,

        // Contabilidad
        cuenta_cxc_id: cuentaCxcId,
        cuenta_cxc_nombre: cuentaCxcNombre,
        cuenta_cxp_id: cuentaCxpId,
        cuenta_cxp_nombre: cuentaCxpNombre,
        plazo_pago_dias: plazoPagoDias,
        limite_credito_usd: Number(limiteCreditoUsd) || 0,
        es_contribuyente_especial: esContribuyenteEspecial,
        porcentaje_retencion_iva: porcentajeRetencionIva
      };

      if (isCreate) {
        const created = await contactsService.createTercero(payload);
        setToast({ open: true, message: '¡Contacto registrado exitosamente!', severity: 'success' });
        setTimeout(() => {
          router.push(`/contacts/${created.id}`);
        }, 500);
      } else {
        const updated = await contactsService.updateTercero(id, payload);
        setContact(updated);

        // Sincronizar en mapping contable para facturas y diarios
        try {
          await accountingService.updateContactAccountingConfig({
            contactoId: id,
            contactoNombre: nombreRazonSocial.trim(),
            contactoRif: identificacion.trim().toUpperCase(),
            cuentaCxcId,
            cuentaCxcNombre,
            cuentaCxpId,
            cuentaCxpNombre
          });
        } catch (syncErr) {
          console.error('Error al sincronizar mapeo contable:', syncErr);
        }

        setToast({ open: true, message: 'Contacto y configuración contable actualizados con éxito', severity: 'success' });
      }
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al guardar el contacto', severity: 'error' });
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

  if (!isCreate && !contact) {
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
    <div className='flex flex-col gap-6 w-full pb-12'>
      {/* Top Navigation Bar (Coherencia visual exacta con Inventario) */}
      <div className='flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap'>
        {/* Izquierda: Botón Volver + Título + Chip Tipo + Subtítulo */}
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          <Tooltip title='Volver al directorio'>
            <Button
              component={Link}
              href='/contacts'
              variant='text'
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
              <i className='tabler-arrow-left text-lg' />
            </Button>
          </Tooltip>
          <div className='min-w-0 flex-1'>
            <Tooltip title={isCreate ? 'Nuevo Contacto' : (nombreRazonSocial || 'Contacto')}>
              <Typography variant='h4' className='font-bold text-textPrimary truncate'>
                {isCreate ? 'Nuevo Contacto' : (nombreRazonSocial || 'Contacto')}
              </Typography>
            </Tooltip>
          </div>
        </div>

        {/* Derecha: Paginador secuencial + Badges comerciales + Cancelar + Guardar Cambios */}
        <div className='flex items-center gap-2.5 shrink-0'>
          {/* Navegador Secuencial entre Contactos (Limpio y Compacto) */}
          {!isCreate && totalContacts > 0 && (
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
            {saving
              ? isCreate
                ? 'Creando...'
                : 'Guardando...'
              : isCreate
              ? 'Crear Contacto'
              : 'Guardar Cambios'}
          </Button>

          {/* Eliminar */}
          {!isCreate && (
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
          )}
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

            {/* Perfil y Resumen Contable */}
            <Card
              sx={{
                borderRadius: '20px',
                border: '1px solid #E6E4F0',
                backgroundColor: '#FFFFFF',
                p: 3,
                boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <Typography variant="subtitle2" className="font-bold text-[#1E1B2E] flex items-center gap-1.5">
                  <i className="tabler-building-bank text-base text-[#6C5CE7]" />
                  Perfil Contable
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setActiveTab('contabilidad')}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0, color: '#6C5CE7', minWidth: 0, fontWeight: 600 }}
                >
                  Configurar
                </Button>
              </div>
              <div className="space-y-2 text-xs text-[#6B7280]">
                <div className="flex justify-between py-1 border-b border-[#F4F3F8] items-center">
                  <span>Cuenta CxC (Clientes):</span>
                  <span className="font-semibold text-[#1E1B2E] font-mono text-[11px] truncate max-w-[160px]" title={cuentaCxcNombre}>
                    {accounts.find(a => a.id === cuentaCxcId)?.codigo || '1.1.02.01'} CxC
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4F3F8] items-center">
                  <span>Cuenta CxP (Proveed.):</span>
                  <span className="font-semibold text-[#1E1B2E] font-mono text-[11px] truncate max-w-[160px]" title={cuentaCxpNombre}>
                    {accounts.find(a => a.id === cuentaCxpId)?.codigo || '2.1.01.01'} CxP
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4F3F8]">
                  <span>Plazo de Pago:</span>
                  <span className="font-semibold text-[#1E1B2E]">
                    {plazoPagoDias === 0 ? 'Contado (0 días)' : `${plazoPagoDias} días crédito`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4F3F8]">
                  <span>Cuentas Bancarias:</span>
                  <span
                    className="font-semibold text-[#6C5CE7] cursor-pointer hover:underline"
                    onClick={() => setActiveTab('bancos')}
                  >
                    {bankAccounts.length} registradas
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F4F3F8]">
                  <span>Contribuyente Esp.:</span>
                  <span className={`font-semibold ${esContribuyenteEspecial ? 'text-[#6C5CE7]' : 'text-[#6B7280]'}`}>
                    {esContribuyenteEspecial ? `Sí (${porcentajeRetencionIva}% IVA)` : 'No'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Límite de Crédito:</span>
                  <span className="font-semibold text-[#1E1B2E]">
                    {limiteCreditoUsd > 0 ? `$${limiteCreditoUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'Sin límite fijado'}
                  </span>
                </div>
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
              <Tab value="general" icon={<i className="tabler-id text-lg mr-1.5" />} iconPosition="start" label="Información General" />
              {tipo === 'EMPRESA' && (
                <Tab
                  value="referentes"
                  icon={<i className="tabler-users text-lg mr-1.5" />}
                  iconPosition="start"
                  label={`Personas Referentes (${contactosReferentes.length})`}
                />
              )}
              {tipo === 'EMPRESA' && (
                <Tab
                  value="direcciones"
                  icon={<i className="tabler-map-pins text-lg mr-1.5" />}
                  iconPosition="start"
                  label={`Direcciones / Sucursales (${direccionesAdicionales.length})`}
                />
              )}
              <Tab
                value="contabilidad"
                icon={<i className="tabler-report-money text-lg mr-1.5" />}
                iconPosition="start"
                label="Contabilidad"
              />
              <Tab
                value="bancos"
                icon={<i className="tabler-building-bank text-lg mr-1.5" />}
                iconPosition="start"
                label={`Cuentas Bancarias (${bankAccounts.length})`}
              />
            </Tabs>

            <CardContent className="p-6">
              {/* PESTAÑA 0: INFORMACIÓN GENERAL & FISCAL */}
              {activeTab === 'general' && (
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

              {/* PESTAÑA: PERSONAS REFERENTES (EMPRESAS) */}
              {activeTab === 'referentes' && tipo === 'EMPRESA' && (                <div className="space-y-4">
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

              {/* PESTAÑA: DIRECCIONES ADICIONALES (EMPRESAS) */}
              {activeTab === 'direcciones' && tipo === 'EMPRESA' && (
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

              {/* PESTAÑA 3: CONTABILIDAD Y CUENTAS CONTABLES */}
              {activeTab === 'contabilidad' && (
                <div className="space-y-6">
                  {/* Encabezado descriptivo */}
                  <div className="flex items-start gap-3.5 p-4 bg-[#F8F7FD] rounded-2xl border border-[#EBE8F8]">
                    <div className="w-10 h-10 rounded-xl bg-[#F0EDFD] flex items-center justify-center text-[#6C5CE7] shrink-0 mt-0.5">
                      <i className="tabler-building-bank text-xl" />
                    </div>
                    <div className="flex-1">
                      <Typography variant="subtitle1" className="font-bold text-[#1E1B2E]">
                        Parametrización Contable y Fiscal del Contacto
                      </Typography>
                      <Typography variant="body2" className="text-[#6B7280]">
                        Define las cuentas contables del Plan Único de Cuentas (PUC) asignadas a este tercero para automatizar el registro de facturas, condiciones de pago y retenciones impositivas ante el SENIAT.
                      </Typography>
                    </div>
                  </div>

                  {/* Sección Cuentas Contables */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <i className="tabler-book-2 text-lg text-[#6C5CE7]" />
                      <Typography variant="subtitle2" className="font-bold text-[#1E1B2E]">
                        Cuentas Contables en el Plan de Cuentas (PUC)
                      </Typography>
                    </div>

                    <Grid container spacing={3}>
                      {/* Cuenta CxC */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <div className="space-y-1.5">
                          <Typography variant="caption" className="font-semibold text-[#1E1B2E] block">
                            Cuenta por Cobrar (Clientes - CxC) *
                          </Typography>
                          <Autocomplete
                            options={accounts}
                            getOptionLabel={opt => `${opt.codigo} - ${opt.nombre}`}
                            value={accounts.find(a => a.id === cuentaCxcId) || null}
                            onChange={(_, val) => {
                              if (val) {
                                setCuentaCxcId(val.id);
                                setCuentaCxcNombre(val.nombre);
                              }
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={params => (
                              <CustomTextField
                                {...params}
                                fullWidth
                                placeholder="Escribe el código o nombre de la cuenta CxC..."
                              />
                            )}
                            renderOption={(props, option) => (
                              <li {...props} key={option.id} className="p-2.5 hover:bg-[#F8F7FD] border-b border-[#F4F3F8] last:border-b-0 cursor-pointer">
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-[#F0EDFD] text-[#6C5CE7]">
                                        {option.codigo}
                                      </span>
                                      <span className="text-sm font-semibold text-[#1E1B2E]">{option.nombre}</span>
                                    </div>
                                    <span className="text-xs text-[#6B7280]">{option.tipoCuentaNombre || option.tipo}</span>
                                  </div>
                                  <span className="text-xs font-mono font-medium text-[#6B7280]">{option.moneda}</span>
                                </div>
                              </li>
                            )}
                          />
                          <Typography variant="caption" className="text-[#6B7280] block text-[11px]">
                            Cuenta de Activo Corriente donde se asientan las facturas de venta y deudas a favor de la empresa.
                          </Typography>
                        </div>
                      </Grid>

                      {/* Cuenta CxP */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <div className="space-y-1.5">
                          <Typography variant="caption" className="font-semibold text-[#1E1B2E] block">
                            Cuenta por Pagar (Proveedores - CxP) *
                          </Typography>
                          <Autocomplete
                            options={accounts}
                            getOptionLabel={opt => `${opt.codigo} - ${opt.nombre}`}
                            value={accounts.find(a => a.id === cuentaCxpId) || null}
                            onChange={(_, val) => {
                              if (val) {
                                setCuentaCxpId(val.id);
                                setCuentaCxpNombre(val.nombre);
                              }
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={params => (
                              <CustomTextField
                                {...params}
                                fullWidth
                                placeholder="Escribe el código o nombre de la cuenta CxP..."
                              />
                            )}
                            renderOption={(props, option) => (
                              <li {...props} key={option.id} className="p-2.5 hover:bg-[#F8F7FD] border-b border-[#F4F3F8] last:border-b-0 cursor-pointer">
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#EF4444]">
                                        {option.codigo}
                                      </span>
                                      <span className="text-sm font-semibold text-[#1E1B2E]">{option.nombre}</span>
                                    </div>
                                    <span className="text-xs text-[#6B7280]">{option.tipoCuentaNombre || option.tipo}</span>
                                  </div>
                                  <span className="text-xs font-mono font-medium text-[#6B7280]">{option.moneda}</span>
                                </div>
                              </li>
                            )}
                          />
                          <Typography variant="caption" className="text-[#6B7280] block text-[11px]">
                            Cuenta de Pasivo Corriente donde se asientan las facturas de compras, gastos y compromisos de pago.
                          </Typography>
                        </div>
                      </Grid>
                    </Grid>
                  </div>

                  <Divider />

                  {/* Sección Cuentas Bancarias del Contacto (Cobros y Pagos) */}
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <i className="tabler-building-bank text-lg text-[#6C5CE7]" />
                        <Typography variant="subtitle2" className="font-bold text-[#1E1B2E]">
                          Cuentas Bancarias del Contacto (Cobros y Pagos)
                        </Typography>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<i className="tabler-plus text-xs" />}
                          onClick={handleOpenNewBankAccount}
                          sx={{
                            borderRadius: '9999px',
                            borderColor: '#6C5CE7',
                            color: '#6C5CE7',
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5
                          }}
                        >
                          + Crear Nueva Cuenta
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#E6E4F0] bg-[#FAF9FD] space-y-4">
                      <Grid container spacing={3}>
                        {/* Selector de Cuenta Principal del Contacto */}
                        <Grid size={{ xs: 12, md: 7 }}>
                          <Typography variant="caption" className="font-semibold text-[#1E1B2E] block mb-1">
                            Cuenta Bancaria Principal / Predeterminada
                          </Typography>
                          <CustomTextField
                            select
                            fullWidth
                            size="small"
                            value={bankAccounts.find(a => a.is_predeterminada)?.id || (bankAccounts.length > 0 ? bankAccounts[0].id : 'NONE')}
                            onChange={e => {
                              const targetId = e.target.value;
                              if (targetId && targetId !== 'NONE') {
                                const found = bankAccounts.find(a => a.id === targetId);
                                if (found) handleSetDefaultBankAccount(found);
                              }
                            }}
                            disabled={bankAccounts.length === 0}
                          >
                            {bankAccounts.length === 0 ? (
                              <MenuItem value="NONE">
                                <em>Sin cuentas bancarias registradas para este contacto</em>
                              </MenuItem>
                            ) : (
                              bankAccounts.map(acc => (
                                <MenuItem key={acc.id} value={acc.id}>
                                  {acc.banco} — {acc.numero_cuenta} ({acc.moneda}) {acc.is_pago_movil && acc.telefono_pago_movil ? `• PM: ${acc.telefono_pago_movil}` : ''}
                                </MenuItem>
                              ))
                            )}
                          </CustomTextField>
                          <Typography variant="caption" className="text-[#6B7280] block mt-1 text-[11px]">
                            Cuenta receptora o emisora para registrar transferencias bancarias y pago móvil en conciliaciones.
                          </Typography>
                        </Grid>

                        {/* Vincular cuenta ya existente en el sistema */}
                        <Grid size={{ xs: 12, md: 5 }}>
                          <Typography variant="caption" className="font-semibold text-[#1E1B2E] block mb-1">
                            Vincular Cuenta ya Existente en el Sistema
                          </Typography>
                          <CustomTextField
                            select
                            fullWidth
                            size="small"
                            defaultValue="NONE"
                            onChange={e => {
                              if (e.target.value && e.target.value !== 'NONE') {
                                handleLinkExistingAccount(e.target.value);
                              }
                            }}
                          >
                            <MenuItem value="NONE">
                              <em>Seleccionar cuenta existente para asignar...</em>
                            </MenuItem>
                            {allSystemBankAccounts
                              .filter(a => a.contacto_id !== id && !a.is_empresa)
                              .map(acc => (
                                <MenuItem key={acc.id} value={acc.id}>
                                  {acc.banco} ({acc.numero_cuenta}) — {acc.titular}
                                </MenuItem>
                              ))}
                          </CustomTextField>
                          <Typography variant="caption" className="text-[#6B7280] block mt-1 text-[11px]">
                            Asocia al contacto una cuenta bancaria ya registrada previamente en el directorio.
                          </Typography>
                        </Grid>
                      </Grid>

                      {/* Tarjetas de Cuentas del Contacto */}
                      {bankAccounts.length > 0 ? (
                        <div className="pt-2 border-t border-[#EAE8F2] space-y-2">
                          <div className="flex items-center justify-between">
                            <Typography variant="caption" className="text-[#64748B] font-bold text-[11px]">
                              Cuentas asociadas en nuestro modelo bancario ({bankAccounts.length}):
                            </Typography>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setActiveTab('bancos')}
                              sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0, color: '#6C5CE7', minWidth: 0, fontWeight: 600 }}
                            >
                              Ver todas en pestaña de bancos →
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {bankAccounts.map(acc => (
                              <div
                                key={acc.id}
                                className="p-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] flex items-center justify-between gap-2 shadow-xs"
                              >
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-[#1E1B2E]">{acc.banco}</span>
                                    <Chip
                                      label={acc.moneda}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.6rem',
                                        fontWeight: 800,
                                        backgroundColor: acc.moneda === 'USD' ? 'rgba(108, 92, 231, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                        color: acc.moneda === 'USD' ? '#6C5CE7' : '#10B981'
                                      }}
                                    />
                                    {acc.is_predeterminada && (
                                      <Chip
                                        label="Predeterminada"
                                        size="small"
                                        sx={{
                                          height: 18,
                                          fontSize: '0.6rem',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                          color: '#10B981'
                                        }}
                                      />
                                    )}
                                  </div>
                                  <span className="font-mono text-[11px] text-[#475569] font-semibold block truncate mt-0.5">
                                    {acc.numero_cuenta}
                                  </span>
                                  <span className="text-[10px] text-[#64748B] block truncate">
                                    {acc.titular} ({acc.identificacion_titular})
                                    {acc.is_pago_movil && acc.telefono_pago_movil ? ` · PM: ${acc.telefono_pago_movil}` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {!acc.is_predeterminada && (
                                    <Tooltip title="Establecer como cuenta principal">
                                      <IconButton size="small" onClick={() => handleSetDefaultBankAccount(acc)} sx={{ color: '#F59E0B', p: 0.5 }}>
                                        <i className="tabler-star text-sm" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="Editar Cuenta">
                                    <IconButton size="small" onClick={() => handleOpenEditBankAccount(acc)} sx={{ color: '#6C5CE7', p: 0.5 }}>
                                      <i className="tabler-edit text-sm" />
                                    </IconButton>
                                  </Tooltip>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-[#EAE8F2] flex items-center justify-between">
                          <Typography variant="caption" className="text-[#94A3B8]">
                            Este contacto no posee cuentas bancarias en el modelo. Puedes crearlas o vincular una existente arriba.
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<i className="tabler-plus" />}
                            onClick={handleOpenNewBankAccount}
                            sx={{
                              borderRadius: '9999px',
                              backgroundColor: '#6C5CE7',
                              fontWeight: 700,
                              textTransform: 'none',
                              px: 3,
                              '&:hover': { backgroundColor: '#5b4bc4' }
                            }}
                          >
                            Crear Cuenta Ahora
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Divider />

                  {/* Sección Condiciones Comerciales */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <i className="tabler-calendar-time text-lg text-[#6C5CE7]" />
                      <Typography variant="subtitle2" className="font-bold text-[#1E1B2E]">
                        Términos de Crédito y Cobranza
                      </Typography>
                    </div>

                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          select
                          fullWidth
                          label="Plazo de Pago / Días de Crédito"
                          value={plazoPagoDias}
                          onChange={e => setPlazoPagoDias(Number(e.target.value))}
                        >
                          <MenuItem value={0}>De Contado / Pago Inmediato (0 días)</MenuItem>
                          <MenuItem value={7}>Crédito a 7 días (Semanal)</MenuItem>
                          <MenuItem value={15}>Crédito a 15 días (Quincenal)</MenuItem>
                          <MenuItem value={30}>Crédito a 30 días (Mensual)</MenuItem>
                          <MenuItem value={45}>Crédito a 45 días</MenuItem>
                          <MenuItem value={60}>Crédito a 60 días (Bimestral)</MenuItem>
                          <MenuItem value={90}>Crédito a 90 días</MenuItem>
                        </CustomTextField>
                        <Typography variant="caption" className="text-[#6B7280] block mt-1 text-[11px]">
                          Determina la fecha de vencimiento automática al emitir o recibir facturas con este tercero.
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          type="number"
                          label="Límite de Crédito ($ USD)"
                          placeholder="0.00"
                          value={limiteCreditoUsd}
                          onChange={e => setLimiteCreditoUsd(Math.max(0, Number(e.target.value)))}
                          slotProps={{
                            input: {
                              startAdornment: <span className="text-[#6B7280] font-semibold mr-1.5 text-sm">$</span>
                            }
                          }}
                        />
                        <Typography variant="caption" className="text-[#6B7280] block mt-1 text-[11px]">
                          Límite de exposición crediticia permitida. Ingresa 0 para dejarlo sin límite o sin evaluación de riesgo.
                        </Typography>
                      </Grid>
                    </Grid>
                  </div>

                  <Divider />

                  {/* Sección Régimen Fiscal SENIAT */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <i className="tabler-receipt-tax text-lg text-[#6C5CE7]" />
                      <Typography variant="subtitle2" className="font-bold text-[#1E1B2E]">
                        Régimen Fiscal y Retenciones SENIAT (Venezuela)
                      </Typography>
                    </div>

                    <div className="p-4 rounded-xl border border-[#E6E4F0] bg-[#FAF9FD] space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <Typography variant="body2" className="font-bold text-[#1E1B2E]">
                            Contribuyente Especial (Sujeto Pasivo Especial)
                          </Typography>
                          <Typography variant="caption" className="text-[#6B7280] block">
                            Marcar si la entidad es formalmente agente de retención conforme a designación del SENIAT.
                          </Typography>
                        </div>
                        <Switch
                          checked={esContribuyenteEspecial}
                          onChange={e => setEsContribuyenteEspecial(e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#6C5CE7'
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#6C5CE7'
                            }
                          }}
                        />
                      </div>

                      <Grid container spacing={3} className="pt-2">
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <CustomTextField
                            select
                            fullWidth
                            label="Porcentaje de Retención de IVA (% Retención)"
                            value={porcentajeRetencionIva}
                            onChange={e => setPorcentajeRetencionIva(Number(e.target.value))}
                          >
                            <MenuItem value={75}>75% - Retención General Estándar SENIAT (SNAT/2015/0049)</MenuItem>
                            <MenuItem value={100}>100% - Retención Total (Sin RIF actualizado / Casos especiales)</MenuItem>
                            <MenuItem value={0}>0% - No Retiene IVA (Contribuyente Ordinario o No Sujeto)</MenuItem>
                          </CustomTextField>
                          <Typography variant="caption" className="text-[#6B7280] block mt-1 text-[11px]">
                            Porcentaje aplicado al Débito Fiscal IVA en comprobantes de retención.
                          </Typography>
                        </Grid>
                      </Grid>
                    </div>
                  </div>

                  {/* Banner de automatización */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF]">
                    <i className="tabler-info-circle text-xl shrink-0 text-[#2563EB]" />
                    <Typography variant="caption" className="text-[#1E40AF] leading-relaxed">
                      <strong>Automatización Contable:</strong> Al seleccionar a este contacto en la emisión de Facturas de Cliente o registro de Facturas de Proveedor, el sistema cargará automáticamente estas cuentas contables y calculará las retenciones fiscales de acuerdo a esta configuración.
                    </Typography>
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: CUENTAS BANCARIAS */}
              {activeTab === 'bancos' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#F1F5F9]">
                    <div>
                      <Typography variant="subtitle1" className="font-bold text-[#1E1B2E] flex items-center gap-2">
                        <i className="tabler-building-bank text-xl text-[#6C5CE7]" />
                        Cuentas Bancarias y Métodos de Cobro/Pago
                      </Typography>
                      <Typography variant="caption" className="text-[#6B7280]">
                        Cuentas asociadas a este contacto para transferencias bancarias, pago móvil y conciliación de facturas
                      </Typography>
                    </div>

                    <Button
                      variant="contained"
                      startIcon={<i className="tabler-plus" />}
                      onClick={handleOpenNewBankAccount}
                      sx={{
                        borderRadius: '9999px',
                        backgroundColor: '#6C5CE7',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        textTransform: 'none',
                        px: 3,
                        boxShadow: '0 4px 12px rgba(108, 92, 231, 0.25)',
                        '&:hover': { backgroundColor: '#5b4bc4' }
                      }}
                    >
                      Nueva Cuenta
                    </Button>
                  </div>

                  {bankAccounts.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-[#FAF9FD]">
                      <i className="tabler-building-bank text-4xl text-[#CBD5E1] mb-2 block mx-auto" />
                      <Typography variant="subtitle2" className="font-bold text-[#475569]">
                        No hay cuentas bancarias registradas
                      </Typography>
                      <Typography variant="caption" className="text-[#94A3B8] block mb-4">
                        Agrega las cuentas de este contacto para utilizarlas en órdenes de pago y cobranzas.
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<i className="tabler-plus" />}
                        onClick={handleOpenNewBankAccount}
                        sx={{
                          borderRadius: '9999px',
                          borderColor: '#6C5CE7',
                          color: '#6C5CE7',
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        Agregar Primera Cuenta
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bankAccounts.map(acc => (
                        <div
                          key={acc.id}
                          className="p-4 rounded-2xl border border-[#E6E4F0] bg-[#FFFFFF] hover:border-[#6C5CE7] transition-all flex items-center justify-between flex-wrap gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-[rgba(108,92,231,0.1)] text-[#6C5CE7] flex items-center justify-center text-xl shrink-0">
                              <i className="tabler-building-bank" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Typography variant="subtitle2" className="font-bold text-[#1E1B2E]">
                                  {acc.banco}
                                </Typography>
                                <Chip
                                  label={acc.moneda}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    backgroundColor: acc.moneda === 'USD' ? 'rgba(108, 92, 231, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                    color: acc.moneda === 'USD' ? '#6C5CE7' : '#10B981'
                                  }}
                                />
                                {acc.is_predeterminada && (
                                  <Chip
                                    label="Predeterminada"
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                      color: '#10B981'
                                    }}
                                  />
                                )}
                              </div>
                              <Typography variant="body2" className="font-mono text-[#475569] text-xs mt-0.5 font-semibold">
                                {acc.numero_cuenta}
                              </Typography>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                                <span>Titular: <strong>{acc.titular}</strong> ({acc.identificacion_titular})</span>
                                <span>•</span>
                                <span>Tipo: <span className="capitalize">{acc.tipo_cuenta.toLowerCase()}</span></span>
                                {acc.is_pago_movil && acc.telefono_pago_movil && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[#10B981] font-bold">Pago Móvil: {acc.telefono_pago_movil}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {!acc.is_predeterminada && (
                              <Tooltip title="Establecer como cuenta principal">
                                <IconButton size="small" onClick={() => handleSetDefaultBankAccount(acc)} sx={{ color: '#F59E0B' }}>
                                  <i className="tabler-star text-base" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Editar Cuenta">
                              <IconButton size="small" onClick={() => handleOpenEditBankAccount(acc)} sx={{ color: '#6C5CE7' }}>
                                <i className="tabler-edit text-base" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar Cuenta">
                              <IconButton size="small" onClick={() => handleDeleteBankAccount(acc.id, acc.banco)} sx={{ color: '#EF4444' }}>
                                <i className="tabler-trash text-base" />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </div>
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

      {/* Modal Cuenta Bancaria */}
      <BankAccountModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onSuccess={handleBankAccountSaved}
        initialAccount={editingBankAccount}
        lockedContactId={contact?.id}
        lockedContactName={contact?.nombre_razon_social}
        lockedContactRif={contact?.identificacion}
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
