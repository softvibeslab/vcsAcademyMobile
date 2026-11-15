# Validación · nueva webapp

Fecha: 2026-11-13. Alcance: frontend adicional con contratos existentes; sin modificaciones a backend, esquema, app Expo ni frontend anterior.

## Evidencia ejecutada

| Verificación | Resultado |
| --- | --- |
| T01 RED: `node --test frontend/src/pilot/model.test.mjs` | 5 fallos esperados con funciones sin implementar; `evidence/model-red.txt` |
| T01 GREEN: mismo comando | 5 pruebas aprobadas; `evidence/model-green.txt` |
| `npm test` | 5 pruebas compartidas aprobadas |
| `VCSA_DB_PATH=/tmp/vcsa-pilot-api-check-20261113.sqlite3 .venv/bin/python backend/tests/e2e_smoke.py` | `E2E API smoke passed` |
| `npm run build:web` | Dos entradas compiladas; `evidence/build.txt` |
| `node work/features/2026-11-13-pilot-webapp/verify.cjs` | Representante, gerente y admin; `evidence/browser-results.json` |
| `node work/features/2026-11-13-pilot-webapp/edge-cases.cjs` | Login inválido, autorización, red/reintento, token vencido, coach público y borrado local; `evidence/edge-results.json` |
| `bash -n tools/pilot/start.sh` | Sin errores de sintaxis |

Excepción TDD: composición visual y estilos verificados por capturas y navegador. La lógica de periodos/métricas, serialización y aislamiento se desarrolló con RED → GREEN. La integración usa backend real, sin interceptar respuestas exitosas ni simular persistencia.

Se instaló `httpx` únicamente en `.venv` mediante `uv pip` para habilitar el smoke existente; no se agregaron dependencias de producción. El entorno de revisión utiliza `/tmp/vcsa-pilot-review-20261113.sqlite3`, independiente de la base original.

## TRUST 5 · revisión proporcional
- Trazabilidad: petición de nueva webapp adaptable → `cp2-spec.md`; decisiones en `ADR-001.md`; inventario de capacidades en `frontend/src/pilot/README.md`.
- Ejecución: pruebas de dominio, API, navegador y build con salidas observadas. Las capturas desktop/móvil están en `evidence/`.
- Permisos y datos: rol proveniente de `/mobile/me`; servidor conserva autorización. Notas aisladas por usuario; sesión vencida limpia acceso; respuestas tardías de otra sesión se descartan. Recuperación/invitaciones no prometen correos inexistentes.
- Consistencia: roadmap canónico, un Goal Sheet por fecha, mismos cálculos de dominio. No se inventaron APIs, migraciones, pagos ni OAuth.
- Mantenibilidad: módulos por área, documentación de arranque, script local y nueva entrada independiente. Prettier aplicado a los archivos nuevos. Se preservaron cambios previos del usuario.

## Límites
No es despliegue productivo. El proveedor AI por defecto y el roleplay son el motor local existente; videos solo contienen metadatos. Notas/diario/meta no tienen sincronización. La revisión visual cubre 390px y 1440px, temas claro/oscuro; no constituye auditoría exhaustiva de accesibilidad. No se ejecutó build nativo porque no se modificó Expo.
