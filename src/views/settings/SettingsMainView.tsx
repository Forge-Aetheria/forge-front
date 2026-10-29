'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import CustomChip from '@core/components/mui/Chip'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import { useAuth } from '@/contexts/AuthContext'
import { settingsService } from '@/services/settingsService'

import { CompanySettingsTab } from './tabs/CompanySettingsTab'
import { BcvSettingsTab } from './tabs/BcvSettingsTab'
import { UsersManagementTab } from './tabs/UsersManagementTab'
import { FiscalRulesTab } from './tabs/FiscalRulesTab'

import type {
  UserProfile,
  CompanySettings,
  BcvRateConfig,
  ErpUser,
  FiscalRulesConfig,
  SystemRole,
  BackendRole,
  UserAccountStatus
} from '@/types/settingsTypes'

const SettingsMainView: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  // Data States
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [company, setCompany] = useState<CompanySettings | null>(null)
  const [bcvConfig, setBcvConfig] = useState<BcvRateConfig | null>(null)
  const [erpUsers, setErpUsers] = useState<ErpUser[]>([])
  const [fiscalRules, setFiscalRules] = useState<FiscalRulesConfig | null>(null)
  const [availableRoles, setAvailableRoles] = useState<BackendRole[]>([])

  // Toast
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  }>({ open: false, message: '', severity: 'success' })

  const loadData = async () => {
    setLoading(true)

    try {
      const [prof, comp, bcv, usrs, rules, backendRoles] = await Promise.all([
        settingsService.getUserProfile(),
        settingsService.getCompanySettings(),
        settingsService.getBcvSettings(),
        settingsService.getErpUsers(),
        settingsService.getFiscalRules(),
        settingsService.getAvailableRoles()
      ])

      setProfile(prof)
      setCompany(comp)
      setBcvConfig(bcv)
      setErpUsers(usrs)
      setFiscalRules(rules)
      setAvailableRoles(backendRoles)
    } catch {
      setToast({ open: true, message: 'Error al cargar la configuración.', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Handlers for Company
  const handleSaveCompany = async (data: Partial<CompanySettings>) => {
    try {
      const updated = await settingsService.updateCompanySettings(data)

      setCompany(updated)
      setToast({ open: true, message: 'Datos de la empresa actualizados exitosamente.', severity: 'success' })
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al guardar datos de empresa.', severity: 'error' })
    }
  }

  // Handlers for BCV
  const handleUpdateBcvRate = async (
    tasa: number,
    modo: 'AUTOMATICO_7AM' | 'MANUAL',
    motivo: string
  ) => {
    try {
      const responsable = profile?.nombre ? `${profile.nombre} (${profile.rol})` : 'Administrador'
      const updated = await settingsService.updateBcvRate(tasa, modo, motivo, responsable)

      setBcvConfig(updated)
      setToast({ open: true, message: `Tasa BCV fijada en ${tasa.toFixed(2)} Bs/USD.`, severity: 'success' })
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al actualizar tasa BCV.', severity: 'error' })
    }
  }

  const handleToggleBcvAutoMode = async (auto: boolean) => {
    try {
      const responsable = profile?.nombre ? `${profile.nombre} (${profile.rol})` : 'Administrador'
      const updated = await settingsService.toggleBcvAutoMode(auto, responsable)

      setBcvConfig(updated)
      setToast({
        open: true,
        message: auto
          ? 'Sincronización desatendida BCV activada.'
          : 'Modo manual activado para sobreescritura.',
        severity: 'info'
      })
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al cambiar modo BCV.', severity: 'error' })
    }
  }

  // Handlers for ERP Users
  const handleCreateErpUser = async (data: {
    nombre: string
    email: string
    telefono?: string
    rol: SystemRole
    passwordInicial?: string
    estado?: UserAccountStatus
  }) => {
    try {
      await settingsService.createErpUser({
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        rol: data.rol,
        passwordInicial: data.passwordInicial || '123456',
        estado: data.estado
      })
      const freshUsers = await settingsService.getErpUsers()

      setErpUsers(freshUsers)
      setToast({ open: true, message: `Usuario ${data.nombre} creado exitosamente.`, severity: 'success' })
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al crear usuario.', severity: 'error' })
      throw err
    }
  }

  const handleUpdateErpUser = async (
    id: string,
    data: {
      nombre: string
      email?: string
      telefono?: string
      rol: SystemRole
      estado: UserAccountStatus
      password?: string
    }
  ) => {
    try {
      await settingsService.updateErpUser(id, data)
      const freshUsers = await settingsService.getErpUsers()

      setErpUsers(freshUsers)

      const successMsg = data.password
        ? 'Usuario y contraseña actualizados exitosamente.'
        : 'Usuario actualizado exitosamente.'

      setToast({ open: true, message: successMsg, severity: 'success' })
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al actualizar usuario.', severity: 'error' })
      throw err
    }
  }

  const handleToggleUserStatus = async (id: string) => {
    try {
      const updated = await settingsService.toggleErpUserStatus(id)
      const freshUsers = await settingsService.getErpUsers()

      setErpUsers(freshUsers)
      setToast({
        open: true,
        message: `Estado de ${updated.nombre} cambiado a ${updated.estado}.`,
        severity: updated.estado === 'ACTIVO' ? 'success' : 'warning'
      })
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al cambiar estado.', severity: 'error' })
    }
  }

  // Handlers for Fiscal Rules
  const handleSaveFiscalRules = async (data: Partial<FiscalRulesConfig>) => {
    try {
      const updated = await settingsService.updateFiscalRules(data)

      setFiscalRules(updated)
      setToast({ open: true, message: 'Reglas fiscales guardadas correctamente.', severity: 'success' })
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al guardar reglas fiscales.', severity: 'error' })
    }
  }

  // RBAC Guard: Only ADMIN or OWNER (Strict RBAC based on backend role)
  const effectiveRole = profile?.rol
    ? String(profile.rol).toUpperCase()
    : String(user?.role || (user?.roles && user?.roles[0]) || 'UNASSIGNED').toUpperCase()

  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER'

  if (loading) {
    return (
      <div className='flex flex-col gap-6 p-1'>
        <div className='flex items-center justify-between'>
          <Skeleton variant='text' width={260} height={40} />
          <Skeleton variant='rounded' width={160} height={36} sx={{ borderRadius: '9999px' }} />
        </div>
        <Skeleton variant='rounded' height={60} sx={{ borderRadius: '20px' }} />
        <Skeleton variant='rounded' height={400} sx={{ borderRadius: '20px' }} />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] p-6 text-center'>
        <Card
          sx={{
            maxWidth: 500,
            borderRadius: '24px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 8px 30px rgba(108, 92, 231, 0.08)'
          }}
        >
          <CardContent className='p-8 flex flex-col items-center gap-4'>
            <div className='w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#EF4444] text-3xl'>
              <i className='tabler-lock-access' />
            </div>
            <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
              Acceso Restringido
            </Typography>
            <Typography variant='body2' className='text-[#6B7280] leading-relaxed'>
              El módulo de <strong>Ajustes Generales del Sistema</strong> está reservado exclusivamente para usuarios con el rol de <strong>Administrador</strong>.
            </Typography>
            <Button
              variant='contained'
              onClick={() => router.push('/home')}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 600,
                mt: 2,
                px: 4
              }}
            >
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6 p-1'>
      {/* Header Principal */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
            Ajustes del Sistema
          </Typography>
        </div>

        {company && (
          <div className='flex items-center gap-2.5 bg-[#FFFFFF] border border-[#E6E4F0] px-4 py-2 rounded-full shadow-xs'>
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.nombreComercial}
                className='w-5 h-5 object-contain rounded'
              />
            ) : (
              <i className='tabler-building text-[#6C5CE7] text-base' />
            )}
            <span className='text-xs font-bold text-[#1E1B2E]'>{company.nombreComercial}</span>
            <CustomChip
              size='small'
              variant='tonal'
              color='secondary'
              label={company.rif}
            />
          </div>
        )}
      </div>

      {/* Tabs de Navegación de Ajustes (4 Pestañas) */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)',
          overflow: 'hidden'
        }}
      >
        <CardContent className='p-2 sm:p-3 border-b border-[#E6E4F0] bg-[#FAFAFC]'>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{
              minHeight: 46,
              '& .MuiTabs-indicator': {
                backgroundColor: '#6C5CE7',
                height: 3,
                borderRadius: '3px'
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#6B7280',
                minHeight: 44,
                px: 2.5,
                borderRadius: '12px',
                '&.Mui-selected': {
                  color: '#6C5CE7'
                }
              }
            }}
          >
            <Tab
              icon={<i className='tabler-building text-base' />}
              iconPosition='start'
              label='Empresa & Facturación'
            />
            <Tab
              icon={<i className='tabler-currency-dollar text-base' />}
              iconPosition='start'
              label='Monedas & Tasa BCV'
            />
            <Tab
              icon={<i className='tabler-users text-base' />}
              iconPosition='start'
              label='Usuarios & Roles (RBAC)'
            />
            <Tab
              icon={<i className='tabler-scale text-base' />}
              iconPosition='start'
              label='Fiscalidad & Reglas'
            />
          </Tabs>
        </CardContent>

        <div className='p-4 sm:p-6'>
          {activeTab === 0 && company && (
            <CompanySettingsTab company={company} onSave={handleSaveCompany} />
          )}

          {activeTab === 1 && bcvConfig && (
            <BcvSettingsTab
              bcvConfig={bcvConfig}
              onUpdateRate={handleUpdateBcvRate}
              onToggleAutoMode={handleToggleBcvAutoMode}
            />
          )}

          {activeTab === 2 && (
            <UsersManagementTab
              users={erpUsers}
              availableRoles={availableRoles}
              isAdmin={isAdmin}
              onCreateUser={handleCreateErpUser}
              onUpdateUser={handleUpdateErpUser}
              onToggleStatus={handleToggleUserStatus}
            />
          )}

          {activeTab === 3 && fiscalRules && (
            <FiscalRulesTab fiscalRules={fiscalRules} onSave={handleSaveFiscalRules} />
          )}
        </div>
      </Card>

      {/* Snackbar Notificaciones */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          sx={{ borderRadius: '14px', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default SettingsMainView
