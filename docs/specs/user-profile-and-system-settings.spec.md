# Especificación Formal: Reorganización de Menú de Usuario, Mi Perfil (`/profile`) y Ajustes Generales del Sistema (`/settings`)

- **ID de Spec:** SPEC-007
- **Épica:** Reorganización de Menú de Usuario, Mi Perfil (`/profile`) y Ajustes Generales del Sistema (`/settings`)
- **Estado:** Propuesta (Esperando Aprobación de Usuario)
- **Fecha:** 2026-10-19
- **Autor:** Antigravity (Pair Programming con Usuario)
- **Marco Metodológico:** Spec-Driven Development (SDD) conforme a `agent.md` y `constitution.md`.

---

## 1. Contexto, Objetivos y Límite Estricto de Alcance (Boundary)

### 1.1 Contexto de Negocio
Actualmente, el menú superior del avatar de usuario (`UserDropdown.tsx`) contiene botones residuales o desalineados que no corresponden a un ERP de gestión interna. Asimismo, la información personal del usuario logueado carece de una pantalla dedicada para actualización de identidad y credenciales (`/profile`), mientras que la configuración global de la empresa (Razón Social, RIF, Tasa BCV diaria, directorio de usuarios RBAC y reglas fiscales) se encuentra dispersa o no editable de forma centralizada.

Se requiere unificar la gobernanza del sistema separando tajantemente el **Ámbito Personal** (cualquier usuario) del **Ámbito Organizacional** (restringido al rol `ADMIN`), incorporando además un **Hub de Módulos estilo Odoo** que sirva de centro de mando hacia las configuraciones de los módulos ya existentes.

### 1.2 ⚠️ Restricción Estricta de Alcance (Boundary)
Este desarrollo se limita **exclusivamente** a:
1. El componente `src/components/layout/shared/UserDropdown.tsx`.
2. La vista de **Mi Perfil** en `/profile` (`src/app/(dashboard)/profile/page.tsx` y `src/views/profile/UserProfileView.tsx`).
3. El centro de **Ajustes Generales** en `/settings` (`src/app/(dashboard)/settings/page.tsx` y `src/views/settings/...`).

**Límites infranqueables:**
- **NO** se deben modificar ni recrear las vistas de configuración interna de otros módulos (`/inventory/settings/warehouses`, `/inventory/settings/categories`, `/pos/terminal`, ni compras o ventas).
- En la pestaña **Hub de Módulos (Estilo Odoo)**, únicamente se construirán tarjetas de resumen de estado y enlaces de navegación directa (`Link` / `router.push`) hacia esas rutas ya operativas.
- **Higiene de Código (Regla R1):** Limpieza estricta de imports en desuso, eliminación de ítems de plantilla muertos (*Pricing*, *FAQ*) y tipado sin `any`.
- **Reutilización Vuexy (Regla R3):** Reutilizar `CustomTextField`, `Tabs`, `Tab`, `Badge`, `Avatar`, `Chip`, `Card`, `Dialog` y `Switch` bajo la identidad **Foundly Clean Light UI**.
- **Navegación Dual (Regla R5):** Sincronizar el acceso a `/settings` y `/profile` asegurando coherencia entre `verticalMenuData.tsx`, `horizontalMenuData.tsx` y el `UserDropdown`.

---

## 2. Definición de Modelos y Contratos de Datos (TypeScript)

Los contratos de datos se formalizarán en `src/types/settingsTypes.ts` y complementarán a `src/types/authTypes.ts`:

```typescript
// Roles del Sistema ERP
export type SystemRole = 'ADMIN' | 'VENTAS' | 'COMPRAS' | 'ALMACEN' | 'CAJERO_POS'

export type UserAccountStatus = 'ACTIVO' | 'INACTIVO'

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
export interface ErpUser {
  id: string
  nombre: string
  email: string
  telefono?: string
  avatarUrl?: string
  rol: SystemRole
  estado: UserAccountStatus
  ultimoIngreso?: string
  creadoEn: string
}

export interface CreateUserInput {
  nombre: string
  email: string
  telefono?: string
  rol: SystemRole
  passwordInicial: string
  estado?: UserAccountStatus
}

export interface UpdateUserInput {
  nombre: string
  telefono?: string
  rol: SystemRole
  estado: UserAccountStatus
}

// 5. Fiscalidad y Reglas Comerciales (Regla R4)
export interface FiscalRulesConfig {
  localizacionVeActiva: boolean
  ivaGeneralPct: number        // 16%
  ivaReducidoPct: number       // 8%
  exentoPct: number            // 0%
  igtfPct: number              // 3%
  retencionIvaPorDefecto: number // 75% o 100%
  diasVigenciaCotizacion: number // ej. 15 días
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
```

---

## 3. Requisitos Funcionales en Sintaxis EARS

### 3.1 Menú del Avatar (`UserDropdown`)
- **EARS-UB-01 (Cabecera de Identidad Autenticada):** *The system shall* render in the `UserDropdown` header the user's avatar (or colored initial avatar if no image exists), their full name, their email address, and a pill chip badge (`rounded-full`) reflecting their system role in Spanish (`Administrador`, `Ventas`, `Compras`, `Almacén`, `Cajero POS`).
- **EARS-UB-02 (Eliminación de Elementos Obsoletos):** *The system shall* completely omit legacy template items (*Pricing*, *FAQ*, etc.) from the `UserDropdown` and its associated bundle.
- **EARS-UB-03 (Acceso a Mi Perfil):** *The system shall* display an interactive menu item labeled `"Mi Perfil"` with icon `tabler-user` that navigates the user directly to `/profile`.
- **EARS-ST-01 (Visibilidad Condicional de Ajustes por Rol):** *WHILE* the authenticated user has `rol === 'ADMIN'`, *the system shall* render the `"Ajustes del Sistema"` menu item with icon `tabler-settings` routing to `/settings`.
- **EARS-ST-02 (Ocultamiento de Ajustes para No-Admins):** *WHILE* the authenticated user has a role other than `'ADMIN'`, *the system shall* hide the `"Ajustes del Sistema"` menu item from the dropdown.
- **EARS-EV-01 (Cierre de Sesión):** *WHEN* the user clicks the `"Cerrar Sesión"` button, *the system shall* close the popper, invoke `signOut()`, clear local storage tokens, and redirect the browser to `/login`.

### 3.2 Pantalla de Mi Perfil (`/profile`)
- **EARS-UB-04 (Acceso Universal a Perfil):** *The system shall* allow any authenticated user with any role to access `/profile` and edit their personal information.
- **EARS-EV-02 (Actualización de Datos Personales):** *WHEN* the user modifies their name, phone number or avatar and clicks `"Guardar Perfil"`, *the system shall* persist the updated profile in mock storage, update the global `AuthContext`, and emit a success Toast: *"Perfil actualizado correctamente"*.
- **EARS-EV-03 (Cambio Exitoso de Contraseña):** *WHEN* the user enters a valid current password, a new password $\ge 6$ characters, and an exact matching confirmation, *the system shall* update the credentials and clear the password fields with a success Toast.
- **EARS-EX-01 (Validación de Contraseña Discrepante o Corta):** *IF* the new password has fewer than 6 characters or does not match `confirmPassword`, *THEN the system shall* highlight the invalid field in crimson `#EF4444`, display inline helper text, and prevent form submission.
- **EARS-UB-05 (Tarjeta Informativa de Permisos):** *The system shall* display a read-only informational card indicating the user's assigned role, belonging tenant/empresa, account creation date, and last login timestamp.

### 3.3 Pantalla de Ajustes Generales (`/settings`) — Pestaña 1: Empresa & Facturación
- **EARS-ST-03 (Protección RBAC de `/settings`):** *WHILE* a non-admin user attempts to navigate to `/settings`, *the system shall* redirect the browser to `/home` and display an error Toast: *"Acceso denegado: Se requieren privilegios de Administrador"*.
- **EARS-UB-06 (Formulario de Empresa):** *The system shall* render fields for Razón Social, Nombre Comercial, RIF, Dirección Fiscal, Teléfono Corporativo, Correo de Facturación y Carga de Logotipo corporativo.
- **EARS-EX-02 (Validación de RIF Venezolano - Regla R4):** *WHILE* `localizacionVeActiva === true`, *IF* the RIF value does not match regex `^[VEJG]-\d{8,9}$`, *THEN the system shall* mark the field as invalid and block submission with helper text: *"Formato RIF inválido (Ej: J-12345678-9)"*.

### 3.4 Pantalla de Ajustes Generales — Pestaña 2: Monedas y Tasa BCV
- **EARS-UB-07 (KPI Destacado de Tasa Activa):** *The system shall* present a primary KPI Card showcasing the active official BCV rate in `VES/USD` with the last sync timestamp.
- **EARS-ST-04 (Bloqueo en Modo Sincronización Automática):** *WHILE* `modoActualizacion === 'AUTOMATICO_7AM'`, *the system shall* keep the manual rate input disabled, displaying the badge `"Sincronizado vía BCV CRON diario (07:00 AM)"`.
- **EARS-EV-04 (Fijación Manual de Tasa por Administrador):** *WHEN* the administrator toggles the mode to `'MANUAL'`, inputs a new positive rate, specifies a reason, and clicks `"Actualizar Tasa"`, *the system shall* update `tasaActiva`, broadcast the new rate across all ERP modules, and append an immutable log entry into `BcvRateAuditEntry[]`.
- **EARS-UB-08 (Tabla de Auditoría de Tasas):** *The system shall* display a paginated DataGrid with historical rate changes, showing date/time, rate value, origin (`Automático` o `Manual`), responsible user, and change justification.

### 3.5 Pantalla de Ajustes Generales — Pestaña 3: Usuarios y Roles (RBAC)
- **EARS-UB-09 (Directorio de Usuarios ERP):** *The system shall* render a DataGrid displaying all internal user accounts with avatar, name, email, role chip (`rounded-full`), status chip (`Activo` en verde / `Inactivo` en gris), last login, and contextual action buttons.
- **EARS-EV-05 (Creación de Usuario):** *WHEN* an administrator submits the user creation drawer/modal with valid name, unique email, role, and temporary password, *the system shall* persist the new account and display a success Toast.
- **EARS-EV-06 (Conmutación de Estado de Usuario):** *WHEN* an administrator clicks to toggle a user between `ACTIVO` and `INACTIVO`, *the system shall* immediately update the user's status.
- **EARS-EX-03 (Protección del Último Administrador):** *IF* an administrator attempts to deactivate or delete the last active user with role `ADMIN`, *THEN the system shall* block the action with an alert: *"No se puede desactivar al único Administrador activo del sistema"*.

### 3.6 Pantalla de Ajustes Generales — Pestaña 4: Fiscalidad & Reglas Comerciales (Regla R4)
- **EARS-UB-10 (Switch Maestro de Localización Fiscal):** *The system shall* provide a master toggle for `localizacionVeActiva` that enables or disables Venezuelan tax fields across all ERP modules.
- **EARS-UB-11 (Alícuotas Configurables):** *The system shall* allow configuring the default VAT percentages (`IVA General 16%`, `IVA Reducido 8%`, `Exento 0%`), IGTF percentage (`3%`), default VAT withholding rate (`75%` o `100%`), and default quotation validity period in days.

### 3.7 Pantalla de Ajustes Generales — Pestaña 5: Hub de Módulos (Estilo Odoo)
- **EARS-UB-12 (Tarjetas de Mando de Módulos):** *The system shall* render a visual grid of interactive cards representing all existing module configuration endpoints:
  1. **Inventario - Almacenes y Ubicaciones:** Redirige a `/inventory/settings/warehouses` con métricas de almacenes activos.
  2. **Inventario - Categorías:** Redirige a `/inventory/settings/categories` con total de categorías.
  3. **Punto de Venta (POS) - Terminales:** Redirige a `/pos/terminal` con estado de terminal.
  4. **Punto de Venta (POS) - Turnos:** Redirige a `/pos/shifts` con resumen de turno.
  5. **Directorio de Terceros (Contactos):** Redirige a `/contacts` con conteo de clientes y proveedores.
  6. **Ventas & Cotizaciones:** Redirige a `/sales/quotes` con tasa aplicada.
  7. **Compras & Abastecimiento:** Redirige a `/purchases/quotes` con órdenes activas.
- **EARS-EV-07 (Navegación Inmediata desde el Hub):** *WHEN* the user clicks any module tile or its `"Configurar"` button, *the system shall* route directly to that sub-module.

### 3.8 Resiliencia, Skeletons y Prevención de Doble Envío
- **EARS-UB-13 (Prevención de Doble Envío):** *WHILE* an asynchronous save action is pending, *the system shall* disable the submit button and render an inline loading spinner.
- **EARS-UB-14 (Skeletons Durante Carga):** *WHILE* profile or settings data is being retrieved, *the system shall* display smooth skeleton loaders avoiding layout shifting.

---

## 4. Arquitectura de Archivos y Componentes

```
src/
├── app/
│   └── (dashboard)/
│       ├── profile/
│       │   └── page.tsx                         # Página /profile (Cualquier rol)
│       └── settings/
│           └── page.tsx                         # Página /settings (Solo ADMIN)
├── components/
│   └── layout/
│       └── shared/
│           └── UserDropdown.tsx                 # Avatar, Rol, Mi Perfil, Ajustes, Logout
├── services/
│   └── settingsService.ts                       # Servicio desacoplado de Ajustes y Perfil
├── types/
│   └── settingsTypes.ts                         # Interfaces TypeScript rigurosas
└── views/
    ├── profile/
    │   └── UserProfileView.tsx                  # Vista de Mi Perfil (Datos, Seguridad, Rol)
    └── settings/
        ├── SettingsMainView.tsx                 # Vista maestra con Tabs y protección RBAC
        ├── components/
        │   ├── BcvAuditHistoryTable.tsx         # Tabla de historial de tasas BCV
        │   ├── UserCreateEditDrawer.tsx         # Drawer para nuevo/editar usuario RBAC
        │   └── ModuleHubCard.tsx                # Tarjeta interactiva del Hub estilo Odoo
        └── tabs/
            ├── CompanySettingsTab.tsx           # Pestaña 1: Empresa & Facturación
            ├── BcvSettingsTab.tsx               # Pestaña 2: Monedas & Tasa BCV
            ├── UsersManagementTab.tsx           # Pestaña 3: Usuarios & Roles (RBAC)
            ├── FiscalRulesTab.tsx               # Pestaña 4: Fiscalidad & Reglas Comerciales
            └── OdooModulesHubTab.tsx            # Pestaña 5: Hub de Módulos estilo Odoo
```

---

## 5. Criterios de Aceptación Comprobables (BDD / DoD)

### Escenario 1: Limpieza e Identidad en `UserDropdown`
- **GIVEN** un usuario autenticado con rol `ADMIN`,
- **WHEN** despliega el menú del avatar en la barra superior,
- **THEN** observa su Avatar, Nombre, Correo, Chip de Rol `Administrador`, enlaces a `"Mi Perfil"` y `"Ajustes del Sistema"`, y el botón `"Cerrar Sesión"`. No existen menciones de *Pricing* ni *FAQ*.

### Escenario 2: Restricción de Ajustes para Usuario No-Admin
- **GIVEN** un usuario autenticado con rol `CAJERO_POS` o `VENTAS`,
- **WHEN** despliega el `UserDropdown`,
- **THEN** la opción `"Ajustes del Sistema"` NO aparece visible.
- **AND IF** intenta ingresar manualmente a la URL `/settings`, el sistema lo intercepta, redirige a `/home` y emite Toast de acceso denegado.

### Escenario 3: Modificación de Datos Personales y Clave en `/profile`
- **GIVEN** cualquier usuario en `/profile`,
- **WHEN** actualiza su teléfono y guarda cambios,
- **THEN** los datos persisten y se emite Toast de confirmación.
- **AND IF** intenta cambiar su contraseña con una confirmación que no coincide, el sistema bloquea el guardado y resalta el error en rojo.

### Escenario 4: Actualización de Tasa BCV en `/settings`
- **GIVEN** un administrador en `/settings` pestaña "Monedas y Tasa BCV",
- **WHEN** activa el modo manual, escribe `54.50 Bs/USD` con motivo `"Ajuste vespertino"` y guarda,
- **THEN** la tasa activa pasa a ser `54.50`, el Badge superior refleja el nuevo valor y se crea una fila en la tabla de Historial de Auditoría con fecha, valor y responsable.

### Escenario 5: Creación de Nuevo Usuario en RBAC
- **GIVEN** un administrador en `/settings` pestaña "Usuarios y Roles",
- **WHEN** hace clic en `"+ Nuevo"`, completa los datos de un nuevo comprador (`rol: COMPRAS`) y guarda,
- **THEN** el nuevo usuario aparece en la tabla con estado `Activo` y badge correspondiente.

### Escenario 6: Navegación desde el Hub Estilo Odoo
- **GIVEN** un administrador en la pestaña "Hub de Módulos",
- **WHEN** hace clic en la tarjeta de `"Almacenes y Ubicaciones"`,
- **THEN** la aplicación navega sin recarga hacia `/inventory/settings/warehouses`.

---

## 6. Plan de Implementación Paso a Paso

1. **Paso 1 - Contratos & Servicio (`src/types/settingsTypes.ts`, `src/services/settingsService.ts`):**
   - Definir interfaces TypeScript estrictas.
   - Crear servicio con mock storage pre-poblado (datos de la empresa demo, usuario actual, tasa BCV activa e historial, directorio de usuarios y reglas fiscales).
2. **Paso 2 - Limpieza de `UserDropdown.tsx`:**
   - Adaptar para consumir rol del usuario y mostrar chip de rol.
   - Enlazar `"Mi Perfil"` a `/profile` y `"Ajustes del Sistema"` a `/settings` (condicionado a `rol === 'ADMIN'`).
   - Depurar imports muertos y referencias huérfanas (Regla R1).
3. **Paso 3 - Vista de Mi Perfil (`/profile`):**
   - Implementar `src/app/(dashboard)/profile/page.tsx` y `src/views/profile/UserProfileView.tsx`.
   - Tarjeta de datos personales, tarjeta de seguridad y tarjeta de rol.
4. **Paso 4 - Vista de Ajustes Generales (`/settings`):**
   - Implementar contenedor maestro con Tabs de navegación (`SettingsMainView.tsx`).
   - Implementar las 5 pestañas: `CompanySettingsTab`, `BcvSettingsTab`, `UsersManagementTab`, `FiscalRulesTab` y `OdooModulesHubTab`.
   - Implementar drawer para crear/editar usuarios y tabla de historial de tasas.
5. **Paso 5 - Sincronización en Dual Menu (Regla R5):**
   - Si corresponde, agregar acceso a `/settings` en `verticalMenuData.tsx` y `horizontalMenuData.tsx` con su ícono `tabler-settings`.
6. **Paso 6 - Verificación Integral:**
   - Compilación estricta con `npx tsc --noEmit` (0 errores).
   - Verificación de la UI en el servidor en ejecución.
