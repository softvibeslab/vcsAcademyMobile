# Historia · Publicar la versión anterior

**Readiness:** LISTA
**Estado del diseno:** No aplica
**Decision del PO:** Aprobada
**Aprobado por:** Usuario propietario
**Fecha de aprobacion:** 2026-11-22
**Evidencia de aprobacion:** Conversación: «ayudame a hacer deploy de la version pasada en https://aisalesv1.softvibes.pro/». Aclaraciones expresas: «Sí, la versión anterior del 16 de noviembre» y «Datos de demostración y base independiente (recomendado)».

Publicar los artefactos existentes, sin desarrollar funcionalidad nueva. Se conserva el diseño, los módulos y la guía de inicio de la release 20261116a. La instancia utiliza una base nueva con las semillas demo originales; no comparte datos ni credenciales privadas con el piloto vigente.

## Criterios de aceptacion

| ID | Criterio | Prioridad | Origen | Estado PO |
|---|---|---|---|---|
| AC-01 | El dominio solicitado sirve por HTTPS la release 20261116a y su API compatible | Must | Solicitud y versión confirmada | Aceptado |
| AC-02 | Acceso, guía y módulos originales funcionan con datos de demostración independientes | Must | Datos confirmados por el usuario | Aceptado |
| AC-03 | La publicación vigente y su base privada conservan su configuración y servicio | Must | Publicación en un dominio adicional | Aceptado |

## Escenarios de prueba

| ID | AC | Nombre | Dado | Cuando | Entonces | Datos | Tipo | Prioridad | Estado PO |
|---|---|---|---|---|---|---|---|---|---|
| ESC-01 | AC-01 | Publicación | Release preservada | Abrir dominio HTTPS | Bundle histórico y API listos | DS-01 | Integración | Must | Aceptado |
| ESC-02 | AC-02 | Recorrido | Base demo nueva | Entrar, abrir guía y módulos | UI operativa y logout | DS-01 | E2E | Must | Aceptado |
| ESC-03 | AC-03 | Aislamiento | Piloto vigente | Comparar config y mounts | Dominio actual listo, sin cambios de configuración | DS-01 | Operación | Must | Aceptado |

## Datos de prueba

| ID | Descripción | Tipo | Origen | Uso | Validado PO |
|---|---|---|---|---|---|
| DS-01 | Semillas demo originales; sin importar usuarios ni registros del piloto privado | Sintético | Demo existente elegido por el usuario | ESC-01 a ESC-03 | Si |

## Puntos abiertos

Ninguno para este despliegue. IA conserva el proveedor local que tenía el artefacto histórico. Las integraciones externas no se reconfiguran en este alcance.
