# CP3 · Implementación operativa

**Status:** complete

## Repo Paths

- Contrato e inventario: esta carpeta; historia en work/stories/2026-11-22-legacy-v1-deploy.md.
- Configuración: nginx-http.conf y nginx.conf; validación: verify-public.cjs y evidence/.
- Aplicación: artefactos ya construidos, referenciados en CP1; sin editar backend ni frontend.

## Tareas · infraestructura

1. Registrar baseline vigente y comprobar historia/contrato.
2. Crear únicamente DNS A aisalesv1; vhost inicial de ACME y certificado.
3. Crear almacenamiento y contenedor demo independientes; comprobar API por loopback.
4. Activar vhost TLS con raíz histórica y API nueva tras nginx -t.
5. Validar certificado, bundle, aislamiento y recorrido móvil/escritorio; registrar TRUST 5 y rollback.

Excepcion TDD: operación de configuración sobre artefactos inmutables existentes; no hay implementación productiva nueva. Se ejecutan comprobaciones reales antes y después de activar, más QA de integración/UI.
