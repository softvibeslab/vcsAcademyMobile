# ADR-001 · Límite del piloto, aislamiento e históricos

**Status:** accepted
**Date:** 2026-11-19

## Contexto

La app actual combina demo, registro público, planes, Coach, progreso y Goal Sheet diario. El piloto cambia el significado del registro y necesita dueños con ámbitos distintos. Reinterpretar tablas y roles en silencio produciría pérdida de significado y acceso indebido.

## Decisión aceptada

1. Mantener React/FastAPI/SQLite y componentes existentes; agregar contratos de piloto delimitados por organización.
2. Usar tours individuales, metas mensuales y notas privadas como entidades independientes. Dinero en centavos y fórmulas coherentes entre servidor y UI.
3. Conservar el histórico agregado en consulta y etiquetarlo. No generar diez tours desde una fila agregada que dice diez ventas o viceversa.
4. Deshabilitar en el despliegue piloto los endpoints/flujos públicos, demo, Coach y comerciales; no basta con ocultar botones. Conservar la implementación anterior para desarrollo/regresión aislados, sin dejar un bypass en el mismo servidor piloto.
5. Resolver organización antes de datos. Dueño opera su organización; operador administra cuentas; vendedor solo su información. No inferir permisos de la opción elegida en onboarding.
6. Guardado del nuevo piloto en servidor. Importación de notas locales únicamente por acción consciente del propietario, con vista previa y deduplicación; diferida hasta que exista contrato específico. No borrar almacenamiento local existente.

## Alternativas descartadas

- Renombrar Admin a Dueño: no garantiza aislamiento.
- Agregar varios tours en el JSON diario sin contrato: dificulta concurrencia, auditoría y correcciones.
- Reutilizar premium como permiso del dueño: conserva reglas comerciales ajenas al piloto y mezcla candados.
- Reescribir todo el frontend: no es necesario para reutilizar el diseño y las capacidades de aprendizaje.

## Consecuencias

Requiere migración aditiva, guardas por modo de despliegue y pruebas de rutas antiguas. La vuelta al release previo debe ensayarse con una copia; no se restaura una base vieja encima de nuevos datos del piloto. En incidente, detener nuevas escrituras y preservar la base antes de elegir rollback o corrección.

## Estado

Decisión aceptada en CP2 v1 el 2026-11-20. Implementación aislada en backend/app/pilot y frontend/src/pilot-v5; la API del piloto no monta rutas legacy.

## Aprobación registrada · 2026-11-20

El PO aprobó el contrato v1 y sus anexos: «lo apruebo y porfa crea otra rama para desarrollar e implementar esto y cuando termines publicalo». Las marcas de propuesta anteriores conservan el origen de las decisiones; su estado vigente es aprobado. Rama de ejecución: `feature/pilot-v5`.
