# CP4 · Validación

**Status:** verified

| Tarea | Fase | Comando | Salida observada |
|---|---|---|---|
| T01 | RED | unittest test_identity, test_auth | 43 != 10 en alta |
| T02 | RED | unittest test_identity, test_auth | HTTP422 al cambiar a diez |
| T01/T02 | GREEN | unittest discover backend/tests/pilot | 79 tests pasan; incluye alta, recuperación, nueve rechazado y cambio/login con diez |
| T03 | GREEN | QA Chromium aislado y API real | Seis comprobaciones pasan, sin errores JS: temporal, nueve, confirmación, diez, reingreso y español |
| T03 | GREEN | npm run build:web; node --test modelos | Build pasa y doce modelos pasan |

Excepción TDD: modificación declarativa de atributos/copy de formulario y configuración de despliegue. Se verificaron fronteras contra API real, sin tests que solo repitan atributos.

## TRUST 5

- Tested: RED/GREEN y regresiones citadas en evidence.
- Readable: helper de generación único; contrato y criterios documentados.
- Unified: mismo generador para alta y recuperación; API y formulario compatibles.
- Secured: CSPRNG, hash, caducidad, cambio obligatorio, permisos privados y CSRF conservados.
- Trackable: solicitud directa, rama feature/pilot-role-accounts, evidencia y cierre.

Publicación y provisión verificadas: dos cuentas nuevas con rol correcto, temporal de diez caracteres, logout y protección antes del cambio. Frontend público coincide con build. Gmail confirmó SENT/INBOX al destinatario explícito; receipt privado guardado. No se registran claves ni direcciones personales en Git.

## Compatibilidad con la base heredada

La primera provisión encontró columnas roles_json/permissions_json sin valores predeterminados en la tabla antigua. La prueba con ese esquema reprodujo el error; el INSERT ahora establece ambos arrays vacíos sin conceder permisos heredados. La regresión completa de 79 pruebas pasa. Ver legacy-provision-red.txt y password-green.txt. La transacción fallida no dejó cuentas ni archivos de clave parciales.
