# Risk Register · acceso-free-premium

**Feature:** `acceso-free-premium`
**Owner:** Roger (PO)
**Date:** 2026-11-14

| ID | Riesgo | Prob. | Impacto | Mitigación | Estado |
|---|---|---|---|---|---|
| R1 | Migración de la base productiva de aisales | Baja | Alto | Respaldo antes del despliegue; migración idempotente probada desde el esquema anterior | Mitigado |
| R2 | Demos rotas por candados | Media | Medio | Rep demo Premium; gerente/admin con acceso completo | Mitigado |
| R3 | Cuentas con correos falsos (sin verificación) | Media | Bajo | Límite por IP; verificación de correo en el backlog | Aceptado |
| R4 | Candado de progreso cambia la experiencia (antes todo abría) | Media | Bajo | Aprobado en AC-11; reversible desde el código | Aceptado |
