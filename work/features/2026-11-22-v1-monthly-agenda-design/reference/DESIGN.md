---
name: Smart Agenda Notebook
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4638'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#7e7666'
  outline-variant: '#cfc6b3'
  surface-tint: '#735c0a'
  primary: '#564300'
  on-primary: '#ffffff'
  primary-container: '#715a08'
  on-primary-container: '#f3d379'
  inverse-primary: '#e3c46c'
  secondary: '#5e5e66'
  on-secondary: '#ffffff'
  secondary-container: '#e3e1eb'
  on-secondary-container: '#64646c'
  tertiary: '#735c03'
  on-tertiary: '#ffffff'
  tertiary-container: '#c6a950'
  on-tertiary-container: '#4e3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe08a'
  primary-fixed-dim: '#e3c46c'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574400'
  secondary-fixed: '#e3e1eb'
  secondary-fixed-dim: '#c7c5cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#ffe086'
  tertiary-fixed-dim: '#e3c467'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-lg:
    fontFamily: DM Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: DM Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

# Sales Academy · Smart Agenda Notebook

## Producto y alcance
Libreta diaria de trabajo para representantes. Módulos reales: Hoy, metas diarias, notas privadas, tareas, presentaciones y ventas, bloques flexibles, reflexión voluntaria, GoalSheet mensual, revisión semanal, historial, cierre personal, copias compartidas y coaching humano.
Navegación representante: Hoy, GoalSheet, Historial, Coaching. Solo manager añade Mi equipo. Cerrar sesión es una acción de cuenta. No añadir Registrar llamada, Ajustes, campanas, enlaces públicos, recibos de lectura, CRM, contratos, cursos, rankings, IA ni sincronización offline.

## Dirección visual
Material Design 3 adaptado a web, DM Sans, español en sentence case. Fondo claro #FAFAFA, contenedores #F0F0F2, texto #202124, texto secundario #56565E, primario dorado #715A08 con texto blanco. Tema oscuro futuro #131317, contenedores #1B1B20 y acento #E6C76A. Superficies tonales, filas compactas, jerarquía clara. Sin fotos, hero, gradientes ni decoración. Tipografía cuerpo16/24, labels14/20, título28/36. Espaciado4/8/12/16/24/32. Radio8 campos,16 secciones,24 diálogos, acciones píldora. Objetivo táctil48px. Contraste y accesibilidad por verificar; no afirmar certificación.

## Layouts
Móvil390px: una columna con margen16, captura al inicio, barra inferior con etiquetas y espacio seguro. Desktop: sidebar224px, contenido y contexto; list-detail para historial/coaching. No estirar móvil. Cortes CSS propuestos600/840/1200/1600; reorganizar según espacio real.

## Reglas obligatorias
Notas privadas por defecto. Cerrar jornada no comparte ni completa tareas. Compartir inicia vacío, muestra destinatario y copia exacta, confirma explícitamente. Manager solo accede a copias vigentes autorizadas. Revocar bloquea consultas futuras de esa copia y conserva libreta. Propuesta de manager se convierte en tarea solo por aceptación del rep.
Fecha de tour distinta de fecha de venta. Pendiente/procesable independiente del resultado. Comisiones manuales, monedas separadas, ausente distinto de0. No inventar fórmulas.
Borrador en memoria de la pantalla no equivale a offline persistente ni sincronización. Formularios tienen guardado explícito, error/reintento, conflicto y protección al salir. Bloques5–180min; mover bloque no mueve tareas; solapamiento requiere decisión. Hasta3prioridades.

## Componentes
AppShell; navegación4/5destinos; header/fecha; botones filled/tonal/outlined/text; campos con label/ayuda/error; checkbox; filas de tareas/notas; avance; importes por moneda; tabla/lista mensual; snapshot; selección/preview; comentarios; diálogo; empty/loading/error/conflict/session states. Nueva nota es la acción principal de Hoy; Registrar presentación secundaria. Textos breves y comprensibles; no mostrar IDs técnicos, promesas de autoguardado ni datos de módulos inexistentes.