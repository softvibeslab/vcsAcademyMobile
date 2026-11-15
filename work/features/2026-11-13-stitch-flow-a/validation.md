# Validación de flujo A

## Evidencia
| Etapa | Comando | Resultado |
| --- | --- | --- |
| RED | node work/features/2026-11-13-stitch-flow-a/verify.cjs | Fallo esperado: Comenzar no mostraba introducción del coach; red.txt |
| GREEN | mismo comando | Secuencia, tres módulos invitados, login diferido, permisos y recuperación de destino; green.txt/results.json |
| Recuperación | node work/features/2026-11-13-stitch-flow-a/verify-recovery.cjs | Chat público real, navegador atrás, restricción de notebook, reset real con confirmación y destino conservado; recovery.txt |
| Regresión | node work/features/2026-11-13-pilot-webapp/verify.cjs | Goal Sheet, lecciones, chat/roleplay, notas, manager/admin y móvil; regression.txt |
| Build | npm run build:web | Ambas entradas compiladas; build.txt |
| Dominio | node --test frontend/src/pilot/model.test.mjs | 5 aprobadas; unit.txt |

Excepción TDD: estilos y composición visual validados mediante capturas. Navegación nueva probada primero en RED. La cuenta temporal de recuperación se creó únicamente en la base de revisión local, no en la publicación.

## Revisión
Trazabilidad a siete frames y conexiones de la lámina consultada; alcance en analysis.md. Sin endpoints privados consultados en exploración invitada; no se generan tokens ni sesiones demo automáticamente. Login con rol seleccionado no amplía permisos. Estado temporal del invitado no se persiste. Los errores se limpian entre vistas y las contraseñas se comparan antes del reset. No hay modificaciones al backend ni esquema. Capturas desktop revisadas y móvil 390px comprobado sin overflow.

## Publicación
Release estático nuevo `/srv/aisales-flow-a-20261113`, reversión al enlace anterior `/srv/aisales-release-20261113`. El backend Docker y `/srv/aisales/data` se conservan. El nuevo release mantiene el enlace `/prototipo/` y los assets previos para sesiones abiertas. Evidencia pública en `results.json` después de ejecutar con PILOT_TEST_URL.
