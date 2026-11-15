# Corrección de referencia · evidencia

Fecha: 13 noviembre 2026. Estado: publicado.

## Resultado

- Inicio público: https://aisales.softvibes.pro/ abre la app React de entrenamiento.
- `/academia/` mantiene la misma app como alias.
- `/stitch/` y `/wireframe/` contienen el explorador de las 43 pantallas del proyecto 11832430028020238900 (ocho recorridos A–H).
- La interfaz comercial se conserva en `/comercial/`; su referencia anterior en `/comercial-stitch/`. No es la referencia visual del producto de entrenamiento.
- Release activa `/srv/aisales-training-20261113`; anterior `/srv/aisales-stitch-20261113`. API, contenedor, base de datos y cuentas conservados.

## Trazabilidad visual

| Referencia | Integración funcional |
|---|---|
| designpiloto/1 | Bienvenida: SVG original del robot, DM Sans local, paleta oscura/verde, jerarquía y botones originales |
| designpiloto/1.2 | Introducción: robot original, globo de diálogo, progreso, continuar |
| 03_onboarding_perfil_mobile; Stitch A03 | Selección de rol y ramificación según perfil, sin conceder permisos por selección |
| designpiloto/1.4; Stitch A04 | Tres opciones de inicio; copia especificada por usuario; exploración sin cuenta |
| home_rep y home_rep_mobile; Stitch B01 | Resumen de meta, periodos, tarjetas de métricas, actividad, seguimientos, coach y Goal Sheet |
| roadmap_modular_estilo_smart_notebook; Stitch C01 | Tarjeta de progreso, módulo siguiente, listado compacto, estado real y acceso a lecciones |
| b_veda_de_recursos; Stitch E01/F | Buscador, Goal Sheet, calculadoras, Notebook con Diary anidado, guías, guiones y audio |
| Stitch D01–D05 | Coach, preguntas de entrada, conversación y roleplay existentes, usando robot y sistema visual del piloto |
| Resto de formularios y roles | Se conservan lógica, guardado y permisos; se aplica el sistema visual compartido y se elimina el hero editorial |

Las láminas Stitch son wireframes en gris, no una UI final a color. La apariencia proviene de sus fuentes designpiloto. Se retiran sidebar y hero editorial inventados; se usa header y dock del piloto. No se afirma identidad pixel a pixel de toda la aplicación: datos, textos canónicos y estados funcionales difieren de los ejemplos visuales.

## Pruebas ejecutadas

- Build Vite: PASS, assets y fuentes locales sin CDN runtime.
- Dominio: 5/5 PASS. Modelo piloto: 5/5 PASS.
- `onboarding.cjs`: PASS local y producción. Tres opciones invitadas, sin autenticación implícita, destino posterior al login, errores y recuperación, ramas gerente/dirección, recarga y 390px.
- `functional.cjs`: PASS en base temporal aislada. Login de tres roles, Goal Sheet persistente, módulo completado, respuesta de coach, roleplay enviado a evaluación, notas persistentes y separadas por usuario, 8 rutas móviles, revisión/certificación gerente, recurso e invitación admin, auditoría, cero errores de navegador. No escribe datos de prueba en producción.
- `visual.cjs`: PASS local y producción. 33 combinaciones (11 rutas × 390/768/1280px), sin overflow; robot original, acento original, hero/sidebar retirados, búsqueda de Bóveda y navegación. `visual-results.json` contiene URL pública.
- Ruta de guías invitado -> login -> `#resources/guides`: PASS.
- Referencia pública: 43 frames, 8 recorridos, A01 -> A02, alias academia y comercial separados: PASS.
- `nginx -t`: PASS. API existente responde tras publicación.

Capturas en `evidence/`; `results.json` contiene regresión pública de onboarding. El reporte de `evidence/browser-results.json` corresponde a funciones probadas contra la base local temporal.

## Límites preservados

No se agregan capacidades ficticias para imitar el diseño: grabar/subir notas, voz, reproducción de videos no publicados, canal de origen o bloqueos comerciales por niveles carecen de contrato en esta API. La Bóveda dirige a los recursos y notas existentes; Home señala ausencia de canal en vez de inventar métricas. Los pasos y el progreso se calculan desde los datos canónicos del backend. El idioma EN del boceto se presenta como indicador no interactivo; la interfaz sigue en español. No se modifican pagos, OAuth, registro, proveedor de IA ni recuperación local existente.

## Reversión

Cambiar `/srv/aisales/current` al release anterior conserva datos y servicios. No se modificó Nginx en esta corrección; se validó su configuración antes del cambio de release. La reversión de frontend no requiere tocar SQLite ni Docker.
