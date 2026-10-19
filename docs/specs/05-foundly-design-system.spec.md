# Especificación: Adopción del Design System Foundly (Clean Light UI)

- **ID de Spec:** SPEC-005
- **Estado:** Implementado (Conforme a EARS y Constitución)
- **Fecha:** 2026-10-15
- **Alcance:** Sistema de diseño, tokens de color, bordes, radios, tipografía, branding (ícono/favicon) y estilo visual de `forge-front` conforme a `ui-contract.md`, `design.md` y `constitution.md`.
- **Objetivo:** Transformar la estética general del frontend hacia la identidad visual de **Foundly**: Clean Light UI (gradiente lavanda superior `#C8B6FF` a blanco `#FAFAFC`, tarjetas blancas `#FFFFFF` suspendidas con bordes ultrafinos lavanda `#E6E4F0`, tokens semánticos e iconos morados `#6C5CE7`), integrando el logotipo oficial y favicon transparente.

---

## 1. Requisitos Funcionales bajo Sintaxis EARS

### 1.1 Ubiquitous (Requisitos Universales)
- `The system shall operate strictly in Clean Light UI mode without dark panels or dark containers.`
- `The system shall apply a vertical linear gradient on the screen starting from #C8B6FF (0%) down to #FAFAFC (28-30%).`
- `The system shall render all primary cards with pure white background #FFFFFF, 1px border #E6E4F0, 20px border radius, and soft suspended elevation (opacity 0.04).`
- `The system shall render the official transparent splash icon in the top header brand logo and as the web favicon.`
- `The system shall render main action buttons, badges, chips, and the central FAB with rounded-full geometry (9999px).`

### 1.2 Event-driven (Por Evento)
- `WHEN a navigation item in the sidebar is active, the system shall render its background in lavender #F0EEF9 with purple text and icon #6C5CE7.`
- `WHEN an input or textfield receives focus, the system shall display an accent focus ring in #6C5CE7.`
- `WHEN a modal or slide-over drawer is opened, the system shall display a translucent dark backdrop over the application while keeping modal content on white #FFFFFF.`

### 1.3 State-driven (Por Estado)
- `WHILE in light mode, the system shall map text-primary to #1E1B2E and text-secondary to #6B7280 for maximum contrast.`
- `WHILE displaying financial metrics, the system shall render positive amounts and income in emerald #10B981 and negative amounts or expenses in crimson #EF4444.`

### 1.4 Unwanted Behavior (Manejo de Excepciones)
- `IF a component attempts to apply dark surface backgrounds to cards or navigation, THEN the system theme shall override them with pure white #FFFFFF and #E6E4F0 border.`

### 1.5 DataGrid Master Standard (Sintaxis EARS)
- `The system shall render a master checkbox in every main table header supporting checked, unchecked, and indeterminate states.`
- `The system shall render individual row selection checkboxes with stopPropagation to isolate selection from row-click inspection.`
- `WHILE one or more table rows are selected, the system shall display a pill badge with the count of selected items and an "Acciones" batch action button.`
- `WHEN the user clicks the "Columnas" button, the system shall display a menu allowing toggling of non-essential columns and a "Restablecer Columnas" action.`
- `WHEN a batch destructive action is triggered, the system shall require explicit confirmation through a styled confirmation Dialog before executing the change.`
- `The system shall render the primary creation action button labeled simply as "Nuevo" (or "+ Nuevo") with vector icon rather than verbose phrases, maximizing visual cleanliness.`
- `The system shall present short, single-line header subtitles under section titles (max ~50 chars) to conserve screen real estate and reduce vertical footprint.`

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

---

## 3. Plan de Implementación Ejecutado

1. **Tokens y Paleta Base:**
   - [`primaryColorConfig.ts`](file:///Users/franciscomaneiro/Trabajo/forge-front/src/configs/primaryColorConfig.ts) y [`colorSchemes.ts`](file:///Users/franciscomaneiro/Trabajo/forge-front/src/@core/theme/colorSchemes.ts) actualizados con `#6C5CE7` y tokens semánticos.
   - Forzado de modo `light` en [`themeConfig.ts`](file:///Users/franciscomaneiro/Trabajo/forge-front/src/configs/themeConfig.ts).
2. **Gradiente Vertical:**
   - Configurado en [`globals.css`](file:///Users/franciscomaneiro/Trabajo/forge-front/src/app/globals.css) sobre `body` (`#C8B6FF` 0% a `#FAFAFC` 28%).
3. **Overrides de Componentes:**
   - `card.ts`: 20px radius, 1px `#E6E4F0`, sombra sutil suspendida.
   - `button.ts` y `chip.ts`: radio completo `rounded-full` (9999px).
   - `input.ts`: radio 16px, fondo `#F4F3F8`, borde `#DCD8EC`.
   - `menuItemStyles.ts`: item activo en `#F0EEF9` con texto/ícono en `#6C5CE7`.
4. **Branding e Íconos:**
   - Ícono transparente `foundly-icon.png` en `public/images/foundly-icon.png` y favicon en `src/app/favicon.ico`.
   - [`Logo.tsx`](file:///Users/franciscomaneiro/Trabajo/forge-front/src/components/layout/shared/Logo.tsx) mostrando el ícono y "Found" (`#1E1B2E`) + "ly" (`#6C5CE7`).

---

## 4. Criterios de Aceptación (DoD) Verificados

- [x] El color primario del ERP es `#6C5CE7`.
- [x] El fondo general tiene el gradiente vertical lavanda (0% `#C8B6FF` a 28% `#FAFAFC`).
- [x] Las tarjetas tienen fondo blanco, borde de 1px `#E6E4F0`, radio 20px y sombra sutil.
- [x] Los botones principales y chips tienen radio de píldora (`rounded-full`).
- [x] El ícono transparente de Foundly está presente en el logo del header y como favicon web.
- [x] `npx tsc --noEmit` compila al 100% sin errores.
