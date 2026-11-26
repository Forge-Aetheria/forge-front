import type {
  SalesInvoicingPolicy,
  PurchaseControlPolicy,
  DeliveryPolicy,
  NegativeStockPolicy
} from './inventoryTypes'

// Tipos de dominio para el módulo de Ajustes Generales y Perfil de Usuario (SPEC-007)

export type SystemRole = 'ADMIN' | 'VENTAS' | 'COMPRAS' | 'ALMACEN' | 'CAJERO_POS' | 'UNASSIGNED'

export type UserAccountStatus = 'ACTIVO' | 'INACTIVO' | 'INVITADO'

// 1. Datos del Usuario Autenticado / Mi Perfil
export interface UserProfile {
  id: string
  nombre: string
  email: string
  telefono?: string
  avatarUrl?: string
  rol: SystemRole
  tenantId: string
  tenantName: string
  ultimoIngreso?: string
  creadoEn: string
}

export interface UpdateProfileInput {
  nombre: string
  telefono?: string
  avatarUrl?: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// 2. Ajustes de Empresa & Facturación
export interface CompanySettings {
  razonSocial: string
  nombreComercial: string
  rif: string
  direccionFiscal: string
  telefonoCorporativo: string
  emailFacturacion: string
  logoUrl?: string
  monedaBase: 'USD' | 'VES'

  // Políticas Comerciales por Defecto (Regla R6)
  salesInvoicingPolicyDefault?: SalesInvoicingPolicy
  purchaseControlPolicyDefault?: PurchaseControlPolicy
  deliveryPolicyDefault?: DeliveryPolicy
  negativeStockPolicy?: NegativeStockPolicy
  costosEnDestinoActivos?: boolean
}

// 2.1 Políticas Comerciales y de Control (Regla R6)
export interface CommercialPoliciesSettings {
  salesInvoicingPolicyDefault: SalesInvoicingPolicy // 'ORDERED' | 'DELIVERED'
  purchaseControlPolicyDefault: PurchaseControlPolicy // 'ORDERED' | 'RECEIVED'
  deliveryPolicyDefault: DeliveryPolicy // 'ALL_AT_ONCE' | 'PARTIAL'
  negativeStockPolicy?: NegativeStockPolicy
  costosEnDestinoActivos?: boolean
}

// 3. Control de Monedas y Tasa BCV
export type BcvUpdateMode = 'AUTOMATICO_7AM' | 'MANUAL'

export interface BcvRateAuditEntry {
  id: string
  fechaHora: string
  tasaVes: number
  origen: BcvUpdateMode
  responsableNombre: string
  motivo?: string
}

export interface BcvRateConfig {
  tasaActiva: number
  ultimaSincronizacion: string
  modoActualizacion: BcvUpdateMode
  fuenteOficial: string
  historial: BcvRateAuditEntry[]
}

// 4. Gestión de Usuarios y Roles (RBAC)
export interface ErpPermission {
  id: string
  action: string
  module: string
  description?: string
}

export interface PermissionModuleGroup {
  module: string
  permissions: ErpPermission[]
}

export interface ErpRole {
  id: string
  name: string
  description?: string
  isSystem: boolean

  /** Permissions granted to the role (action-level catalog). */
  permissions?: ErpPermission[]

  /** Provider `updatedAt`, used as the optimistic-concurrency precondition. */
  updatedAt?: string
}

export interface CreateRoleInput {
  name: string
  description?: string
}

export interface UpdateRoleInput {
  id: string
  name?: string
  description?: string
}

export interface SetRolePermissionsInput {
  id: string

  /** Complete next set (the backend replaces the whole set). */
  permissionIds: string[]

  /** Current persisted set, used to detect reductions and set `confirmReplace`. */
  previousPermissionIds?: string[]
  confirmReplace?: boolean
  expectedUpdatedAt?: string
}

export interface ErpUser {
  id: string
  nombre: string
  email: string
  telefono?: string
  avatarUrl?: string

  /** Every role assigned to the user, preserving the provider IDs. */
  roles: ErpRole[]

  /** Derived primary role for legacy display, search and colour mapping. */
  rol: SystemRole

  /** Derived primary role ID for display only; never use it for writes. */
  roleId?: string

  /** Derived primary role name for display only. */
  roleName?: string
  estado: UserAccountStatus
  ultimoIngreso?: string
  creadoEn: string
}

export interface CreateUserInput {
  nombre: string
  email: string
  telefono?: string

  /** Explicit role selected in the create form; sent as `roleIds: [initialRoleId]`. */
  initialRoleId: string
  passwordInicial: string
  estado?: UserAccountStatus
}

export interface UpdateUserInput {
  nombre: string
  telefono?: string

  /** Complete next role set. The service diffs it against the persisted assignments. */
  roleIds: string[]
  estado: UserAccountStatus
  password?: string
}

// 5. Fiscalidad y Reglas Comerciales (Regla R4 & R6)
export interface FiscalRulesConfig {
  localizacionVeActiva: boolean
  ivaGeneralPct: number        // 16%
  ivaReducidoPct: number       // 8%
  exentoPct: number            // 0%
  igtfPct: number              // 3%
  retencionIvaPorDefecto: number // 75% o 100%
  diasVigenciaCotizacion: number // ej. 15 días
  // Políticas Comerciales y de Control (Regla R6)
  salesInvoicingPolicyDefault?: SalesInvoicingPolicy
  purchaseControlPolicyDefault?: PurchaseControlPolicy
  deliveryPolicyDefault?: DeliveryPolicy
  negativeStockPolicy?: NegativeStockPolicy // 'FLEXIBLE' (despacha en negativo) o 'BLOCK' (bloquea si stock insuf.)
  costosEnDestinoActivos?: boolean // Encender o apagar módulo de Costos en Destino (Landed Costs)
}

// 6. Hub de Módulos Estilo Odoo
export interface ModuleHubTile {
  id: string
  modulo: 'INVENTARIO' | 'VENTAS' | 'COMPRAS' | 'POS' | 'CONTACTOS'
  titulo: string
  descripcionCorta: string
  icono: string
  colorAccent: string
  bgAccent: string
  rutaDestino: string
  metricasResumen?: {
    label: string
    valor: string | number
  }[]
}
