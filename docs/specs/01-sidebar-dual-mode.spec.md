# Especificación: Barra Lateral con Modo Dual (Lista / Grilla Táctil)

- **ID de Spec:** SPEC-001
- **Estado:** Propuesta (Esperando revisión del usuario)
- **Fecha:** 2026-09-28
- **Objetivo:** Permitir al usuario alternar la barra de navegación lateral entre el formato clásico de lista vertical y un formato moderno de grilla (2 columnas) optimizado para pantallas táctiles (*touch-friendly*).

---

## 1. Contexto y Justificación
Actualmente, la barra lateral muestra los enlaces de navegación en una lista vertical de una sola columna (`<VerticalMenu>`). Para casos de uso en pantallas táctiles (tablets, iPads, terminales de taller/punto de venta), una disposición en tarjetas tipo *App Launcher* con 2 elementos por fila ofrece un área táctil (*hit target*) significativamente más cómoda, rápida de reconocer y ergonómica.

---

## 2. Requisitos Funcionales

1. **Selector de Modo (Toggle Switch):**
   * Un control compacto e intuitivo que permita alternar entre `list` y `grid`.
   * **Ubicación propuesta:** En la cabecera de la barra lateral (`NavHeader`), junto a los controles de colapso, o en una barra de control sutil al inicio del área de menú.
   * Iconos representativos: `tabler-layout-list` y `tabler-layout-grid`.

2. **Persistencia de Preferencia:**
   * La selección del usuario (`list` o `grid`) se persistirá en `localStorage` (clave: `forge_sidebar_mode`), de modo que no se pierda al recargar o navegar entre rutas.

3. **Modo Lista (Existente):**
   * Se preserva el comportamiento estándar actual de Vuexy (`<Menu>` y `<MenuItem>`), con soporte completo para submenús futuros.

4. **Modo Grilla (Nuevo - Touch Friendly):**
   * Disposición en CSS Grid de **2 columnas** (`grid grid-cols-2 gap-3 px-3`).
   * Cada ítem se renderiza como una tarjeta interactiva (`Tile`):
     - **Icono grande centrado:** Tamaño `28px` - `32px` (mayor presencia visual).
     - **Texto centrado:** Debajo del icono, legible en 1 o 2 líneas (`12px` - `13px`).
     - **Dimensiones de tarjeta:** Aproximadamente `110px` de ancho × `90px - 100px` de alto. Cumple holgadamente con los estándares táctiles de accesibilidad (> 48×48px).
   * **Feedback táctil y estados:**
     - *Hover/Focus:* Elevación o fondo sutil.
     - *Active (Presionado / Touch):* Micro-animación de compresión (`active:scale-95`).
     - *Selected (Ruta actual):* Fondo con color primario del tema (`theme.palette.primary.main` / gradiente Vuexy), texto e icono en blanco con sombra suave.

5. **Comportamiento en estado Colapsado (Collapsed):**
   * Cuando la barra lateral se colapsa (modo mini-sidebar), se muestra el comportamiento estándar de iconos simples en una columna para respetar el ancho reducido de 71px.

---

## 3. Arquitectura y Componentes Afectados

```text
src/
├── components/
│   └── layout/
│       └── vertical/
│           ├── Navigation.tsx         <-- Inyecta o sincroniza el selector de modo
│           ├── VerticalMenu.tsx       <-- Alterna entre vista Lista o Grilla
│           └── GridMenu.tsx           <-- [NUEVO] Componente de renderizado en grilla de 2 columnas
```

### 3.1 Estructura de Datos Unificada
Para evitar duplicar código y mantener una única fuente de verdad para las rutas, los ítems de navegación se definirán en una estructura de datos clara:
```typescript
interface NavItem {
  title: string
  href: string
  icon: string // clase tabler-*
  badgeContent?: string
  badgeColor?: 'primary' | 'error' | 'warning' | 'success'
}
```
Tanto `VerticalMenu` (lista) como `GridMenu` (grilla) consumirán el mismo arreglo de rutas.

---

## 4. Criterios de Aceptación

- [ ] Existe un toggle visible para alternar entre Lista y Grilla.
- [ ] En modo Grilla, se muestran 2 tarjetas por fila con icono superior de ~28-32px y etiqueta inferior.
- [ ] Al hacer clic/touch en una tarjeta de la grilla, se navega correctamente a la ruta indicada.
- [ ] La ruta activa se resalta visualmente en la grilla con el estilo primario de Vuexy.
- [ ] La preferencia (`list` o `grid`) se recuerda al refrescar la página (`localStorage`).
- [ ] El scroll vertical funciona de manera fluida en pantallas táctiles y ratón.
- [ ] TypeScript compila con cero errores (`tsc --noEmit`).
- [ ] No se agregan archivos muertos ni dependencias externas innecesarias.

---

## 5. Plan de Implementación Paso a Paso

1. **Fase 1 - Centralización de ítems de menú:**
   * Extraer los enlaces de navegación actuales (`/home`, `/about`) a una constante/helper de navegación compartida para que ambos modos lean los mismos datos.
2. **Fase 2 - Creación de `GridMenu.tsx`:**
   * Construir el componente de tarjetas de 2 columnas con estilos Tailwind y soporte de estado activo mediante `usePathname()`.
3. **Fase 3 - Selector y Persistencia:**
   * Implementar el switch de modo y el hook/estado con persistencia en `localStorage`.
4. **Fase 4 - Integración y Pruebas:**
   * Integrar en `VerticalMenu.tsx` / `Navigation.tsx`.
   * Verificar en navegador y validar compilación estricta de TypeScript.
