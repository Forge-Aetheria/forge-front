# Especificación: Adopción del Design System Foundly (Clean Light UI)

- **ID de Spec:** SPEC-005
- **Estado:** Propuesta (Esperando revisión y aprobación del usuario)
- **Fecha:** 2026-10-15
- **Alcance:** Sistema de diseño, tokens de color, bordes, radios, tipografía y estilo visual de `forge-front` conforme a los contratos `ui-contract.md` y `design.md`.
- **Objetivo:** Transformar la estética general del frontend de la plantilla base hacia la identidad visual de **Foundly**: Clean Light UI (gradiente lavanda superior `#C8B6FF` a blanco `#FAFAFC`, tarjetas blancas `#FFFFFF` suspendidas con bordes ultrafinos lavanda `#E6E4F0`, tokens semánticos e iconos morados `#6C5CE7`), preservando la operatividad de los módulos existentes (Login, Inventario, POS).

---

## 1. Contexto y Objetivos

Los documentos [`ui-contract.md`](file:///Users/franciscomaneiro/Downloads/ui-contract.md) y [`design.md`](file:///Users/franciscomaneiro/Downloads/design.md) definen la gramática visual inmutable del ecosistema **Foundly**:
- **Filosofía Clean Light UI:** Solo modo claro. Sin superficies oscuras en contenedores principales (el único elemento oscuro es el backdrop translúcido de modales/drawers).
- **Gradiente Vertical:** Zona superior lavanda suave (`#C8B6FF` / `#D8B4FE` del 0% al 30%) que difumina hacia el fondo del cuerpo claro (`#FAFAFC` / `#F4F3F8`).
- **Superficies & Tarjetas:** Tarjetas purificadas en `#FFFFFF`, con bordes sutiles lavanda (`#E6E4F0`), esquinas redondeadas generosas (`16px` a `24px`) y sombras suaves (`opacity: 0.05`).
- **Color de Acento & Marca:** `#6C5CE7` (púrpura neón vibrante), con pills/badges lavanda (`#F0EEF9` con texto `#4A3E85`), ingresos/positivo `#10B981` y gastos/negativo `#EF4444`.

---

## 2. Mapeo de Tokens de Color & Estilos

### 2.1 Paleta Principal
| Token Foundly | Valor Hex | Destino en `forge-front` (MUI & Tailwind) |
| :--- | :--- | :--- |
| `accent` / `primary` | `#6C5CE7` | `palette.primary.main`, `--color-primary`, `primaryColorConfig[0]` |
| `primaryLight` / `primary100` | `#C3B4FF` | `palette.primary.light`, `--color-primaryLight` |
| `primary700` / `pillText` | `#4A3E85` | `palette.primary.dark`, texto de badges y pills activos |
| `bg-gradient-top` | `#C8B6FF` | Gradiente superior de layout / body |
| `bg-app-body` / `app` | `#FAFAFC` | `palette.background.default`, `--color-backgroundDefault` |
| `card` / `cardSurface` | `#FFFFFF` | `palette.background.paper`, modales, tarjetas |
| `surface` | `#F4F3F8` | Inputs, chips, banners elevados |
| `pillSurface` | `#F0EEF9` | Badges, pills, item activo de navegación |
| `cardBorder` / `borderSubtle`| `#E6E4F0` | `palette.divider`, bordes de tarjetas y tablas |
| `fieldBorder` | `#DCD8EC` | Bordes de inputs y textfields |
| `text-primary` / `textOnCard` | `#1E1B2E` | `palette.text.primary`, `mainColorChannels.light: '30 27 46'` |
| `text-secondary` | `#6B7280` | `palette.text.secondary` |
| `text-muted` | `#9CA3AF` | `palette.text.disabled` |
| `income` / `success` | `#10B981` | `palette.success.main` |
| `expense` / `error` | `#EF4444` | `palette.error.main` |
| `warning` / `gold` | `#F59E0B` | `palette.warning.main` |
| `info` | `#38BDF8` | `palette.info.main` |

### 2.2 Radios de Borde (Shape)
- Tarjetas destacadas (`Card`): `20px` - `24px` (`rounded-3xl` / radius `customBorderRadius.xl`).
- Inputs, botones secundarios, celdas: `16px` (`rounded-2xl`).
- Pills, Badges, Botones primarios, Avatares: `9999px` (`rounded-full`).

### 2.3 Sombras
- Tarjetas: Sombra suspendida suave `0px 4px 16px rgba(0, 0, 0, 0.04)`.
- Glow primario: `0px 4px 14px rgba(108, 92, 231, 0.35)`.

---

## 3. Plan de Implementación Paso a Paso

1. **Paso 1: Configuración de Tokens Centrales (`primaryColorConfig.ts` y `themeConfig.ts`)**
   - Establecer `#6C5CE7` como color primario predeterminado.
   - Forzar modo por defecto claro (`mode: 'light'`).
2. **Paso 2: Esquemas de Color MUI (`src/@core/theme/colorSchemes.ts` y `index.ts`)**
   - Actualizar `palette.primary`, `palette.secondary`, `palette.background`, `palette.text`, `palette.divider`, `customColors`.
   - Ajustar `mainColorChannels.light` al canal de `#1E1B2E` (`30 27 46`).
3. **Paso 3: Variables CSS Globales & Gradiente (`src/app/globals.css`)**
   - Definir variables CSS personalizadas de Foundly (`--foundly-gradient-top`, `--foundly-pill-surface`, `--foundly-pill-text`, `--foundly-border-subtle`).
   - Aplicar el gradiente vertical de pantalla (0% `#C8B6FF` a 30% `#FAFAFC`) sobre el body / wrapper principal.
4. **Paso 4: Overrides de Componentes MUI (`src/@core/theme/overrides/`)**
   - `card.ts`: Fondo `#FFFFFF`, borde `1px solid #E6E4F0`, radio 20px, sombra sutil.
   - `button.ts`: Botones con radio `rounded-full` (`9999px`), sombras de botón primario con acento `#6C5CE7`.
   - `input.ts` / `inputLabel.ts`: Fondo `$surface` (`#F4F3F8`), borde `$fieldBorder` (`#DCD8EC`), focus `#6C5CE7`.
   - `chip.ts`: Estilos tipo pill con fondo `#F0EEF9` y texto `#4A3E85`.
5. **Paso 5: Ajuste de Navegación & Sidebar**
   - Sidebar en blanco purificado `#FFFFFF` con borde derecho `#E6E4F0`.
   - Elemento activo con fondo lavanda `#F0EEF9` y texto/ícono morado `#6C5CE7`.
6. **Paso 6: Verificación y Pruebas**
   - Comprobar compilación TypeScript con `npx tsc --noEmit`.
   - Verificar armonía visual en Login, Inventario y Terminal POS.

---

## 4. Criterios de Aceptación Comprobables

- [ ] El color primario del ERP es `#6C5CE7`.
- [ ] El fondo general tiene el gradiente vertical lavanda (0% `#C8B6FF` a 30% `#FAFAFC`).
- [ ] Las tarjetas tienen fondo blanco, borde de 1px `#E6E4F0`, radio redondeado generoso y sombra sutil.
- [ ] Los botones principales tienen radio de píldora (`rounded-full`).
- [ ] Badges y chips utilizan el contenedor lavanda `#F0EEF9` con texto `#4A3E85` o colores semánticos correspondientes (`#10B981`, `#EF4444`, `#F59E0B`).
- [ ] `npx tsc --noEmit` compila sin errores.
