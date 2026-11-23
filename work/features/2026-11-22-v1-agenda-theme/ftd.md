# FTD · Agenda sin barra decorativa y con tema de la app

**Status:** done (publicado y verificado el 2026-11-22, America/Cancun)
**Lane:** FTD
**Branch:** feature/v1-monthly-agenda-design
**Date:** 2026-11-22

## Claridad

- **Solicitud:** «excelente solo que quita esto de la imagen y tambien conserva el tema de la app dependiendo si es light o dark».
- **Entendimiento:** retirar la franja decorativa superior del calendario (9:41, isla, señal, wifi y batería) y hacer que sus superficies, texto, tarjetas y controles sigan el tema elegido en la aplicación.
- **Hecho cuando:** la agenda no contiene esa franja ni reserva su espacio, conserva el calendario y el FAB, respeta `html[data-theme]` tanto claro como oscuro al navegar/recargar y está publicada y verificada en V1.

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| 1 | ¿Qué se retira? | La barra superior completa señalada en la captura adjunta. | Respondida |
| 2 | ¿De dónde viene el tema? | Selector y preferencia existentes de App (`sa.pilot.theme` → `html[data-theme]`); sin añadir un selector o una preferencia independiente. | Respondida |

## Intencion

Integrar visualmente la agenda con la aplicación y eliminar la simulación de la barra de estado del teléfono solicitada por el usuario.

## Alcance

- Solo frontend: `SmartAgenda.jsx` y `smart-agenda.css`.
- Eliminar `StatusBar` y sus estilos; el encabezado real de calendario ocupa la parte superior.
- Mantener geometría y navegación del calendario aprobado, FAB Agregar seguimiento y flujo existente.
- Usar variables CSS locales para la paleta, con variante oscura basada en los tokens existentes de la app. Conservar los acentos semánticos rojo/verde/dorado del diseño.
- Cubrir calendario, etiquetas, panel inferior, tarjeta, filtros, navegación, FAB, búsqueda, foco y selector nativo de mes; respetar el modo de color de controles nativos.
- Publicar únicamente frontend de aisalesv1.softvibes.pro con nueva raíz y respaldo del vhost. Sin cambio de API, autenticación, base de datos, dependencias ni reglas de negocio.

## Escalamiento

Ajuste visual solicitado de una capa bajo el contrato existente de agenda; no aplica criterio de escalamiento. La publicación reutiliza el procedimiento V1 existente.

## Checklist

- [x] T01: observar y registrar la barra decorativa y el fondo claro forzado en modo oscuro antes de editar.
- [x] T02: retirar la barra y adaptar la paleta al tema existente.
- [x] T03: revisión visual light/dark en móvil y escritorio, navegación/cambio de tema/recarga y flujo del FAB; builds y checks proporcionales.
- [x] T04: gobierno, despliegue aislado V1, verificación pública y commit/push.

Excepcion TDD: cambio puramente visual de estructura decorativa y CSS, sin lógica ni contrato nuevo. Se valida con evidencia de navegador antes/después y regresión de las interacciones existentes; no se añaden pruebas unitarias que reflejen reglas CSS.

## Evidencia

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01 | RED visual | `THEME_QA_PHASE=red node work/features/2026-11-22-v1-agenda-theme/verify-theme.cjs` | Barra presente (1), fondo blanco y color-scheme light con tema dark; `evidence/red/results.json` |
| T02/T03 | GREEN visual | `node work/features/2026-11-22-v1-agenda-theme/verify-theme.cjs` | 10 grupos, 18 capturas light/dark a 390/320/1440; barra y hueco ausentes, preferencia desde HOME persiste al navegar/recargar, controles y FAB funcionan; `evidence/green/results.json` |
| T03 | GREEN | `npm run build:v1` y `npm run build:web` | Ambos builds completados; evidencia build-v1.txt y build-current.txt |
| T03 | GREEN | Comandos de regresión del perfil y modelos del calendario | 79 pruebas backend y 37 de modelos frontend/dominio pasan; evidencia backend.txt y models.txt |
| T03 | GREEN | `a11y-audit/scripts/contrast_checker.py` (funciones de contraste) | 11 pares de texto oscuro alcanzan 4.5:1, mínimo 4.83:1; `evidence/dark-contrast.json` |
| Revisión | Observado | Revisión independiente de JSX/CSS y capturas light/dark | Sin hallazgos accionables, tokens faltantes ni colisiones globales. La paleta clara conserva el diseño previo; no se declara auditoría WCAG completa. |
| T04 | GREEN | `verify-governance.sh --feature esta carpeta --profile producto --strict` | Gobierno completo y adaptadores sincronizados; `evidence/governance.txt` |
| T04 | GREEN | `nginx -t` y recarga con respaldo | Solo root V1 cambia a release agenda-theme; V5 conserva configuración, HTML y contenedor; `evidence/deployment-activation.txt` |
| T04 | GREEN | `node work/features/2026-11-22-v1-agenda-theme/verify-live.cjs` | 10 checks, cuatro capturas; hashes coinciden, light/dark persistidos, barra ausente, navegación/FAB sin guardar y V5 idéntica; `evidence/live/results.json` |
| Alcance | Observado | Lectura del JSX, CSS y tokens de `training-design.css` | La agenda tiene `StatusBar`, fondos blancos fijos y `color-scheme: light`; App ya administra la preferencia persistida. |

## TRUST 5

- [x] Tested: evidencia visual antes/después, regresión del perfil y builds pasan.
- [x] Readable: paleta con nombres semánticos y eliminación del componente decorativo sin uso.
- [x] Unified: reutiliza `html[data-theme]` y tokens de la app; sin preferencia nueva.
- [x] Secured: sin datos privados, secretos, escrituras de negocio o cambios de contratos.
- [x] Trackable: evidencia local/pública, gobierno, runbook y cambios versionados en la rama de la agenda.

## Siguiente

Entrega disponible en https://aisalesv1.softvibes.pro/#agenda. No quedan tareas pendientes de implementación para este ajuste.
