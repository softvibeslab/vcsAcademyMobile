# CP3 · Plan por capas

**Status:** T01–T08 implementadas, publicadas y verificadas.

## Repo Paths

| Capa | Ruta prevista |
|---|---|
| Frontend | frontend/src/pilot/Coach.jsx, Learning.jsx, SmartAgenda.jsx, App.jsx; componente y modelo de visitas nuevos |
| API | backend/app/main.py; módulo nuevo tour_visits.py |
| Datos | backend/app/tour_visits.py; esquema aditivo y almacenamiento separado, sin modificar persistence.py |
| Hermes | backend/app/coach_hermes.py y backend/deploy/coach-v1/SOUL.md; sin memoria global |
| Infra | backend/deploy y scripts de publicación de la nueva feature; limpieza y respaldos V1 |
| Evidencia | work/features/2026-11-22-v1-tour-learning/evidence |

## Pares de tareas

| ID | Test primero (RED) | Implementación (GREEN) |
|---|---|---|
| T01 | Propiedad, varios tours/día, fechas, transiciones, revisión e idempotencia | Tablas aditivas y API de visitas |
| T02 | Mención de tour, cancelar, elegir tres caminos, errores y foco | Propuesta dentro del Coach y formulario compartido |
| T03 | Guardar feedback desde Diary y conservar fecha al editar | Diario vinculado, notas locales anteriores accesibles |
| T04 | Contexto tras recarga, acceso ajeno e inyección dentro de datos | Contexto seleccionado validado por backend y Hermes |
| T05 | Fallo/reintento, respuesta tardía, recomendaciones inventadas/bloqueadas | Análisis persistido por revisión y enlaces al catálogo |
| T06 | Agenda reúne eventos sin cambiar métricas, temas y viewport | Detalle/análisis, enlaces Coach y recomendación en Roadmap |
| T07 | Eliminación y reloj controlado en expiración; backups | Limpieza coordinada y operación documentada |
| T08 | Migración doble, smoke sintético, baseline V5 y reversión | Release V1, QA pública y cierre |

Cada pareja produce salida RED y GREEN en CP4. Excepcion TDD prevista: documentación, configuración y ajustes puramente visuales se verifican con revisión, sintaxis, geometría y capturas; no se declaran como comportamientos automatizados sin ejecutarlos.

Nota de datos verificada en revisión: la conexión SQLite legacy no activa PRAGMA foreign_keys. No dar por ejecutado el borrado en cascada sólo por declarar una FK; implementarlo de forma transaccional explícita en el repositorio de visitas o habilitar/verificar las cascadas sin afectar las tablas legacy. La prueba de eliminación debe consultar también análisis y tombstones.

## Verificación

Gates del perfil y regresión legacy, más tests nuevos. Build V1 y V5 separados. Emulación Chromium 360×800, WebKit 390×844, desktop 1440×900, ambos temas y teclado aproximado con altura reducida. TRUST 5 y verify-governance --strict al cierre. Publicar únicamente después de aprobación CP2 y resultados comprobados.
