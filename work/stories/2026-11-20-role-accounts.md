# Historia · Cuentas por perfil

**Readiness:** LISTA
**Estado del diseno:** No aplica
**Decision del PO:** Aprobada
**Aprobado por:** Usuario propietario
**Fecha de aprobacion:** 2026-11-20
**Evidencia de aprobacion:** Solicitud directa en conversación: crear usuarios de todos los perfiles, enviarlos al correo indicado y claves no mayores a diez caracteres. Datos personales omitidos aquí y registrados en manifiesto privado.

## Criterios de aceptacion

| ID | Criterio | Prioridad | Origen | Estado PO |
| AC-01 | Una cuenta por perfil vigente, claves diez caracteres, cambio permitido con diez y envío al correo solicitado | Must | Solicitud directa | Aceptado |

## Escenarios de prueba

| ID | AC | Nombre | Dado | Cuando | Entonces | Datos | Tipo | Prioridad | Estado PO |
| ESC-01 | AC-01 | Acceso por perfil | Organización y dos cuentas sintéticas | Proveer y cambiar clave | Longitud diez y rol correcto; nueve rechazada | DS-01 | Integración | Must | Aceptado |

## Datos de prueba

| ID | Descripción | Tipo | Origen | Uso | Validado PO |
| DS-01 | Dos cuentas owner/representative en example.invalid; claves generadas en cada prueba | Sintético | Simulado IA dentro del alcance autorizado | ESC-01 | Si |

## Puntos abiertos

Ninguno que bloquee la solicitud. Roles confirmados por código activo; destino de correo explícito y confirmado por Gmail conectado.
