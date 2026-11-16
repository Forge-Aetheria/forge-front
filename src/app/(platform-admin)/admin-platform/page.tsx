'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { PlatformAdminGuard } from '@/components/auth/PlatformAdminGuard'
import { GraphQLClientError } from '@/libs/graphqlClient'
import {
  platformAdminService,
  type PlatformElevation,
  type PlatformPlanTier,
  type PlatformTenant,
  type PlatformTenantDetail
} from '@/services/platformAdminService'

const FEATURE_MODULES = ['INVENTORY', 'SALES', 'CASH_REGISTER', 'ACCOUNTING', 'PURCHASES', 'POS'] as const
const PLAN_TIERS: PlatformPlanTier[] = ['FREE', 'PRO']

const errorMessage = (error: unknown): string => {
  if (error instanceof GraphQLClientError) return error.message
  if (error instanceof Error) return error.message
  
return 'Ocurrió un error inesperado'
}

const isElevationExpired = (error: unknown): boolean => {
  return error instanceof GraphQLClientError
    && (error.code === 'PLATFORM_ELEVATION_EXPIRED' || error.code === 'PLATFORM_ELEVATION_REQUIRED')
}

const dateInputValue = (value: string | null): string => (value ? value.slice(0, 10) : '')

const toIsoDate = (value: string): string | null =>
  value.trim() === '' ? null : new Date(`${value}T00:00:00.000Z`).toISOString()

const PlatformAdminConsole = () => {
  const [elevation, setElevation] = useState<PlatformElevation | null>(null)
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [elevating, setElevating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [search, setSearch] = useState('')
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [consoleError, setConsoleError] = useState<string | null>(null)
  const [consoleNotice, setConsoleNotice] = useState<string | null>(null)

  const [detail, setDetail] = useState<PlatformTenantDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [plan, setPlan] = useState<PlatformPlanTier>('FREE')
  const [validUntil, setValidUntil] = useState('')
  const [graceUntil, setGraceUntil] = useState('')
  const [modules, setModules] = useState<string[]>([])
  const [ownerUserId, setOwnerUserId] = useState('')
  const [saving, setSaving] = useState(false)

  const resetElevation = useCallback((message: string | null) => {
    setElevation(null)
    setDetail(null)
    setTenants([])
    setAuthError(message)
  }, [])

  const handleError = useCallback(
    (error: unknown) => {
      if (isElevationExpired(error)) {
        resetElevation('La elevación expiró. Introduce de nuevo tu contraseña y PIN.')
        
return
      }

      setConsoleError(errorMessage(error))
    },
    [resetElevation]
  )

  const loadTenants = useCallback(
    async (token: string, query: string) => {
      setLoadingTenants(true)
      setConsoleError(null)

      try {
        const rows = await platformAdminService.listTenants(token, {
          ...(query.trim() ? { search: query.trim() } : {})
        })

        setTenants(rows)
      } catch (error) {
        handleError(error)
      } finally {
        setLoadingTenants(false)
      }
    },
    [handleError]
  )

  const handleElevate = async () => {
    setAuthError(null)
    setElevating(true)

    try {
      const result = await platformAdminService.elevate(password, pin)

      setElevation(result)
      setPassword('')
      setPin('')
      await loadTenants(result.token, search)
    } catch (error) {
      setAuthError(errorMessage(error))
    } finally {
      setElevating(false)
    }
  }

  const handleRevoke = async () => {
    if (!elevation) return

    try {
      await platformAdminService.revokeElevation(elevation.token)
    } catch {
      // The elevation may already be expired; clearing local state is enough.
    }

    resetElevation('Elevación revocada. Introduce de nuevo contraseña y PIN.')
  }

  const handleSelectTenant = async (tenant: PlatformTenant) => {
    if (!elevation) return
    setDetailLoading(true)
    setConsoleError(null)
    setConsoleNotice(null)

    try {
      const result = await platformAdminService.getTenant(elevation.token, tenant.id)

      setDetail(result)
      setPlan(result.tenant.plan)
      setValidUntil(dateInputValue(result.tenant.validUntil))
      setGraceUntil(dateInputValue(result.tenant.graceUntil))
      setModules(result.tenant.activeModules)
      setOwnerUserId('')
    } catch (error) {
      handleError(error)
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshDetail = async () => {
    if (!elevation || !detail) return
    const result = await platformAdminService.getTenant(elevation.token, detail.tenant.id)

    setDetail(result)
    setPlan(result.tenant.plan)
    setValidUntil(dateInputValue(result.tenant.validUntil))
    setGraceUntil(dateInputValue(result.tenant.graceUntil))
    setModules(result.tenant.activeModules)
  }

  const handleSaveLicense = async () => {
    if (!elevation || !detail) return
    setSaving(true)
    setConsoleError(null)
    setConsoleNotice(null)

    try {
      await platformAdminService.updateLicense(elevation.token, {
        tenantId: detail.tenant.id,
        plan,
        validUntil: toIsoDate(validUntil),
        graceUntil: toIsoDate(graceUntil)
      })
      await refreshDetail()
      await loadTenants(elevation.token, search)
      setConsoleNotice('Licencia actualizada.')
    } catch (error) {
      handleError(error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveModules = async () => {
    if (!elevation || !detail) return
    setSaving(true)
    setConsoleError(null)
    setConsoleNotice(null)

    try {
      await platformAdminService.setModules(elevation.token, detail.tenant.id, modules)
      await refreshDetail()
      await loadTenants(elevation.token, search)
      setConsoleNotice('Módulos actualizados.')
    } catch (error) {
      handleError(error)
    } finally {
      setSaving(false)
    }
  }

  const handleReconcileOwner = async () => {
    if (!elevation || !detail || ownerUserId.trim() === '') return
    setSaving(true)
    setConsoleError(null)
    setConsoleNotice(null)

    try {
      const result = await platformAdminService.reconcileOwner(
        elevation.token,
        detail.tenant.id,
        ownerUserId.trim()
      )

      setDetail(result)
      setOwnerUserId('')
      setConsoleNotice('Owner reconciliado con el catálogo completo de permisos.')
    } catch (error) {
      handleError(error)
    } finally {
      setSaving(false)
    }
  }

  const toggleModule = (module: string) => {
    setModules((current) =>
      current.includes(module) ? current.filter((item) => item !== module) : [...current, module]
    )
  }

  useEffect(() => {
    if (elevation) {
      void loadTenants(elevation.token, search)
    }

    // Search is applied explicitly with the Buscar button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elevation])

  if (!elevation) {
    return (
      <Box className='flex items-center justify-center min-bs-screen w-full p-4'>
        <Card className='w-full max-is-[520px]'>
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant='h5' fontWeight={700}>
                  Verificación de administración
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Introduce tu contraseña actual y el PIN de administración para acceder a la consola.
                </Typography>
              </Box>
              {authError ? <Alert severity='error'>{authError}</Alert> : null}
              <TextField
                label='Contraseña'
                type='password'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete='current-password'
                fullWidth
              />
              <TextField
                label='PIN de administración'
                type='password'
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                autoComplete='off'
                fullWidth
              />
              <Button
                variant='contained'
                onClick={() => void handleElevate()}
                disabled={elevating || password.trim() === '' || pin.length !== 4}
              >
                {elevating ? 'Verificando…' : 'Acceder a la consola'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box className='p-4 sm:p-6'>
      <Stack spacing={3}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
          <Box>
            <Typography variant='h4' fontWeight={700}>
              Platform Admin
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Metadatos de tenants. No se muestran datos de negocio.
            </Typography>
          </Box>
          <Button variant='outlined' color='inherit' onClick={() => void handleRevoke()}>
            Revocar elevación
          </Button>
        </Stack>

        {consoleError ? <Alert severity='error'>{consoleError}</Alert> : null}
        {consoleNotice ? <Alert severity='success'>{consoleNotice}</Alert> : null}

        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <TextField
                label='Buscar por nombre o slug'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                size='small'
                fullWidth
              />
              <Button
                variant='contained'
                onClick={() => void loadTenants(elevation.token, search)}
                disabled={loadingTenants}
              >
                {loadingTenants ? 'Buscando…' : 'Buscar'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Licencia</TableCell>
                  <TableCell align='right'>Usuarios</TableCell>
                  <TableCell align='right'>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id} hover>
                    <TableCell>{tenant.name}</TableCell>
                    <TableCell>{tenant.slug}</TableCell>
                    <TableCell>{tenant.status}</TableCell>
                    <TableCell>{tenant.plan}</TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={tenant.licenseStatus}
                        color={
                          tenant.licenseStatus === 'ACTIVE'
                            ? 'success'
                            : tenant.licenseStatus === 'GRACE'
                              ? 'warning'
                              : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell align='right'>{tenant.userCount}</TableCell>
                    <TableCell align='right'>
                      <Button size='small' onClick={() => void handleSelectTenant(tenant)}>
                        Gestionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tenants.length === 0 && !loadingTenants ? (
                  <TableRow>
                    <TableCell colSpan={7} align='center'>
                      Sin tenants para el filtro actual.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {detailLoading ? (
          <Box className='flex justify-center p-4'>
            <CircularProgress size={28} />
          </Box>
        ) : null}

        {detail ? (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant='h6' fontWeight={700}>
                    {detail.tenant.name}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {detail.tenant.slug} · {detail.tenant.status} · {detail.tenant.licenseStatus}
                  </Typography>
                </Box>
                <Divider />
                <Typography variant='subtitle1' fontWeight={600}>
                  Licencia
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    select
                    label='Plan'
                    value={plan}
                    onChange={(event) => setPlan(event.target.value as PlatformPlanTier)}
                    size='small'
                    fullWidth
                  >
                    {PLAN_TIERS.map((tier) => (
                      <MenuItem key={tier} value={tier}>
                        {tier}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label='Válido hasta'
                    type='date'
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size='small'
                    fullWidth
                  />
                  <TextField
                    label='Gracia hasta'
                    type='date'
                    value={graceUntil}
                    onChange={(event) => setGraceUntil(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size='small'
                    fullWidth
                  />
                </Stack>
                <Box>
                  <Button variant='contained' onClick={() => void handleSaveLicense()} disabled={saving}>
                    Guardar licencia
                  </Button>
                </Box>

                <Divider />
                <Typography variant='subtitle1' fontWeight={600}>
                  Módulos activos
                </Typography>
                <Stack direction='row' flexWrap='wrap' gap={1}>
                  {FEATURE_MODULES.map((module) => (
                    <Chip
                      key={module}
                      label={module}
                      onClick={() => toggleModule(module)}
                      color={modules.includes(module) ? 'primary' : 'default'}
                      variant={modules.includes(module) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Stack>
                <Box>
                  <Button variant='contained' onClick={() => void handleSaveModules()} disabled={saving}>
                    Guardar módulos
                  </Button>
                </Box>

                <Divider />
                <Typography variant='subtitle1' fontWeight={600}>
                  Owners
                </Typography>
                <Stack spacing={1}>
                  {detail.ownerUsers.map((owner) => (
                    <Typography key={owner.userId} variant='body2'>
                      {owner.email} · {owner.roleNames.join(', ') || 'sin roles'}
                    </Typography>
                  ))}
                  {detail.ownerUsers.length === 0 ? (
                    <Typography variant='body2' color='text.secondary'>
                      Sin owners con rol admin.
                    </Typography>
                  ) : null}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label='User ID a reconciliar'
                    value={ownerUserId}
                    onChange={(event) => setOwnerUserId(event.target.value)}
                    size='small'
                    fullWidth
                  />
                  <Button
                    variant='outlined'
                    onClick={() => void handleReconcileOwner()}
                    disabled={saving || ownerUserId.trim() === ''}
                  >
                    Reconciliar owner
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </Box>
  )
}

const PlatformAdminPage = () => (
  <PlatformAdminGuard>
    <PlatformAdminConsole />
  </PlatformAdminGuard>
)

export default PlatformAdminPage
