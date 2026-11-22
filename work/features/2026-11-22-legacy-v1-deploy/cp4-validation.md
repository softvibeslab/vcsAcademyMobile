# CP4 · Validación

**Status:** verified

Excepcion TDD: despliegue de artefactos existentes y configuración declarativa; sin cambios de aplicación. Se ejecutaron las comprobaciones reales abajo, sin reconstruir la release histórica.

| Tarea | Fase | Comando | Salida observada |
|---|---|---|---|
| Inventario | Observado | git log; SSH releases/docker; DNS list | Release 20261116a e imagen conservadas, nuevo hostname sin registro, puerto libre |
| Publicación | GREEN | nginx -t; curl HTTPS / y /api/ready; openssl x509 | Configuración válida; HTTP 200 y TLS verificado; HTTP redirige 301; certificado hasta 2027-02-20 |
| Datos | GREEN | docker inspect; SQLite readonly integrity/counts | Volumen independiente; integrity ok; 7 usuarios demo, 0 usuarios externos, 0 tablas pilot_* |
| Regresión | GREEN | Comparación baseline.txt contra prefijo deployment.txt | Release, nginx, HTML, contenedor y mounts vigentes idénticos; ready private_pilot |
| Modelos legacy | GREEN | node --test frontend/src/pilot/*.test.mjs | 17 pruebas pasan, 0 fallos |
| Navegador | GREEN | QA_TARGET_IP=76.13.231.12 node work/features/2026-11-22-legacy-v1-deploy/verify-public.cjs | 11 grupos de checks, 16 capturas, móvil 390x844 y escritorio 1440x900; 0 errores JS/overflow; 48 llamadas API solo al origen V1 |
| Configuración | GREEN | env_auditor.py sobre esta carpeta | 0 hallazgos |
| Gobierno | GREEN | verify-governance.sh con perfil producto, feature y --strict | Gobierno completo y adaptadores sincronizados |

El recorrido E2E validó login demo, cookie segura, guía de cuatro pantallas y persistencia, Home, once módulos Roadmap, respuesta real del Coach local, Perfil, reapertura de guía y logout. Producción privada se consultó únicamente por GET antes/después y conservó HTML SHA256 y versión de API.

## Incidencias de validación y límites

- El resolver del Mac/Node devolvió ENOTFOUND para el hostname nuevo mientras DNS público (1.1.1.1 y 8.8.8.8) ya respondía. HTTPS con DNS normal desde VPS pasó. QA usó resolución explícita solo dentro de Node/Chromium, conservando TLS/SNI y sin modificar hosts/configuración global. Evidencia inicial guardada; no se presenta ese recorrido como prueba del resolver local.
- El primer selector de Perfil apuntaba al avatar oculto en móvil; se corrigió a la navegación visible de la misma app. Fallo del test preservado en public-qa/selector-profile-failure.json; ningún cambio a la aplicación.
- nginx -t reporta aviso no bloqueante de server_names_hash; pasa la validación. No se cambia configuración global ajena a este despliegue.
- Decisión pendiente, fuera del despliegue solicitado: mejorar contraste de la burbuja del mensaje del usuario en Coach. Observación visual heredada, no modificada para conservar la versión pedida.

## TRUST 5

- Tested: 17 pruebas de modelos y recorrido E2E real; HTTP/TLS, base y aislamiento comprobados.
- Readable: contrato, inventario, configuración y runbook en esta carpeta.
- Unified: artefactos originales y patrones Docker/nginx existentes; sin dependencias nuevas.
- Secured: base demo separada, cero datos privados importados, API loopback, cookie HTTPS y escaneo sin hallazgos.
- Trackable: petición y confirmaciones citadas, rama feature/legacy-v1-deploy, evidencia y ADR-001.
