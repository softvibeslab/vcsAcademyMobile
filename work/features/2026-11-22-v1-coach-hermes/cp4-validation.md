# CP4 · Evidencia

**Status:** validado; implementación, QA local, publicación final r2 e inferencia real verificadas.

## Inspección observada

| Inspección | Resultado |
|---|---|
| Coach.jsx y screenshot móvil de release legacy | Cabecera/promoción/pestañas duplican espacio; compositor bajo primer viewport |
| styles.css y training-design.css | Texto user oscuro heredado sobre fondo oscuro/translúcido |
| smart_agent.py y main.py | Solo proveedor local; historial aceptado pero descartado |
| VPS bridge health + inferencia sintética | Transporte 200; inferencia 503 advisor_unavailable; diagnóstico proveedor 401/credencial inválida |
| Perfiles Hermes | Asesor comercial distinto del Coach; identidad Copiloto adecuada como base aislada |
| Backend legacy contra imagen en ejecución | main.py, smart_agent.py, access.py, persistence.py y requirements.txt idénticos byte a byte |
| Red y timeouts | V1 Docker bridge; Hermes en host loopback; nginx60s y sin timeout frontend actual. ADR propone bindings locales y deadlines explícitos |
| Gate de historia antes de aprobación | `verify-story.sh` reporta NO LISTA, 21 pendientes derivados de aprobación, diseño y aceptación de criterios/datos; salida en evidence/readiness-before-approval.txt |
| Revisión independiente de SPEC | Se concretó compatibilidad de historial nativo en pares, confidence opcional, permisos de descripciones visibles y diferencia entre contexto automático y texto escrito por el usuario |

No se modificó código, servicios, autenticación ni datos del servidor durante esta inspección. No se guarda contenido de credenciales ni mensajes reales en evidencia.

## Snapshot técnico sanitizado

- V1 imagen actual: `aisales-api:20261114c`, ID `sha256:c0371abac3955d972e754854227584ff8a1992ee059b1c0256ac335831a5dea7`.
- main.py: `d487b82bcd932cf835a86e82916f16c071cdb6908cc626deac8379b4aa7545fb`.
- smart_agent.py: `0f36dc04144f2ddf52d42e83f7a80da095691deb5a75e90fcef4d543ceb09feb`.
- access.py: `3e4b04f465cd3147d58226ec0f9b6b686a8b685fe16d4fc3d4dab97063ceee55`.
- persistence.py: `125af89289be9df421df368506566c3f5d55846fd18f2ba9390a6f1f1135ef2c`.
- requirements.txt: `df3f5540085ba6131dc5e4c11675a2a4f74b1e83c9e348278b53dfd5d46fcd67`.
- SOUL Copiloto base: `d7f963af54dffa3fabc2c072217646f36d883f266cb2108b53d3845ff679a2ff`.
- Diagnóstico proveedor: `completed:false`, `is401:true`, `invalidCredential:true`. La credencial exportada y la actual coinciden según comparación interna booleana; no se copiaron valores.
- Timer exportador activo cada5min, último exit0; eso no renueva una autenticación inválida.

## Autenticación: diagnóstico inicial y resolución

Comando del diagnóstico inicial en76.13.231.12, conservado como referencia histórica:

```sh
HERMES_HOME=/root/.hermes /usr/local/bin/hermes model
```

Ese diagnóstico no corresponde al destino final. El PO eligió Hermes de2.25.231.154; se comprobó que son máquinas distintas. Se abrió el asistente en ese host: el selector curses cambió momentáneamente el modelo a gpt-6.2-sol y se restituyó inmediatamente gpt-6.1-sol mediante `hermes config set/get`, antes de conectar el runtime. Se inició después el flujo oficial directo de autenticación para evitar el selector. Al comprobar dos inferencias reales correctas con el acceso existente de2.25, se canceló el intento OAuth sin guardar nuevas credenciales. El usuario informó luego que había autorizado: una consulta fresca posterior respondió200, y también las pruebas de API y navegador público. No se solicitó ni recibió contraseña SSH; funcionó la llave existente. Códigos OAuth y credenciales no se guardan en evidencia.

## Evidencia TDD

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01 | RED | Captura y geometría Playwright del Coach anterior | Android360×800: página1144px, entrada top876.56/bottom936.56 fuera de vista; evidence/baseline |
| T02 | RED | `node --test frontend/src/pilot/coach-model.test.mjs` | Cinco fallos esperados de historial, reintento, navegación y texto completo; frontend-model-red.txt |
| T02 | GREEN | Mismo comando | Cinco pruebas pasan; frontend-model-green.txt |
| T03 | RED | `.venv/bin/python backend/tests/coach_hermes.py` | 32 fallos esperados iniciales de contrato; backend-red.txt. Dos fallos adicionales de selección de contexto en español antes de corregir; backend-context-red.txt |
| T03 | GREEN | Mismo comando | 17 pruebas pasan; backend-green.txt |
| T04 | RED | `.venv/bin/python backend/tests/test_coach_bridge.py` | Ocho fallos esperados de transporte, worker y exportador; bridge-red.txt |
| T04 | GREEN | Mismo comando | Ocho pruebas pasan; bridge-green.txt |
| T01/T02/T05 | RED | `node work/features/2026-11-22-v1-coach-hermes/verify-coach.cjs` | Recorrido móvil detectó altura visual obsoleta tras reducir viewport. Conservado en browser-first-run; corregido en CSS limitando por100dvh |
| T01/T02/T05 | GREEN | Mismo comando | 24 grupos,16 capturas: Android360×800, iPhoneWebKit390×844, desktop1440×900, ambos temas; altura reducida360×460, reintento, dobleclick, scroll, Roleplay/evaluación; browser/results.json |
| Regresión | GREEN | Legacy access/API smoke, perfil backend y modelos frontend | 16 pruebas acceso,79 perfilV5, smokelegacy y54 frontend/dominio pasan; backend-regression-results.json y frontend-regression.txt |
| Builds | GREEN | `npm run build:v1` y `npm run build:web` | Ambos artefactos construyen por separado; build-v1.txt/build-v5.txt |
| Accesibilidad | GREEN | Colores computados y a11y contrast checker | Burbujas pasan4.5:1; secundario mínimo5.21 y foco6.08. Targets44px y entrada16px; frontend-contrast.txt y browser/results.json |
| Infraestructura | Observado | Provisionador dedicado y verify_bridge.py en VPS | Ocho checks de transporte/aislamiento pasan. Inferencia real falla503 por credencial401; bridge-live.json/bridge-provider-diagnosis.json |
| Infraestructura remota | GREEN | Exportador actual, bridge remoto y verify_bridge.py | Nueve tests locales y ocho checks operativos pasan; primer turno200/8.87s y segundo200 con continuidad; bridge-remote-live.json |
| Túnel privado | GREEN | Restricciones SSH, stage18644 y activación18643 | Cinco verificaciones de acceso/rechazo pasan; consulta fresca tras aviso de autorización200/7.76s; tunnel-activation.txt |
| Publicación | GREEN | `deploy-release.py` sobre bundle con SHA256 verificado | Imagen derivada, candidato con copiaDB y API activa responden Hermes; esquema, usuarios, hashes de credenciales/permisos y V5 intactos; release-activation.txt |
| Público | GREEN | `node work/features/2026-11-22-v1-coach-hermes/verify-live.cjs` | 11 verificaciones y7capturas; seis combinaciones navegador/tema, hashesexactos, dos turnos Hermes y continuidad,42fechas visibles sin scroll mensual, sesiones y V5; live/results.json |
| Contraste final | RED | Medición de estilos computados Chromium/WebKit | Placeholder anterior: 4.036:1 dark y 4.376:1 light en Chromium; 2.232:1 light en WebKit. evidence/placeholder-before.json |
| Contraste final | GREEN | Misma medición después de CSS acotado al Coach | Placeholder 7.307:1 dark y 5.213:1 light en ambos motores; icono deshabilitado light 4.937:1. evidence/placeholder-after.json |
| Publicación r2 | GREEN | `publish-web-r2.py` y `verify-live.cjs` | Activación del ajuste de contraste y repetición pública: 11 verificaciones, 7 capturas, inferencia y continuidad reales, seis combinaciones navegador/tema; V5 y contenedores intactos. evidence/web-r2-activation.json y evidence/live/results.json |

Excepcion TDD: cambios puramente visuales se validan con geometría, capturas y contraste antes/después; configuración de imagen, systemd, credenciales y publicación se valida con sintaxis, hashes, listeners, candidato aislado, reversión y smoke. Los comportamientos de aplicación/bridge mantienen RED→GREEN.

## TRUST 5

- Tested: pruebas locales, regresiones y matriz de navegador pasan; inferencia real remota y dos turnos públicos con continuidad verificados.
- Readable: chat, reglas de presentación, adaptador e infraestructura separados y revisados.
- Unified: conserva contrato legacy, formatos de historial nativo, Roleplay y módulos existentes; perfil V1 aislado.
- Secured: autorización previa, fuentes filtradas, errores sanitizados, credenciales de servidor y worker sin herramientas/memoria; pruebas ejecutadas.
- Trackable: historia aprobada con cita «si», gateLISTA, CP0–CP5, ADR, evidencia y rama dedicadas.

## Artefacto final

Frontend activo: `/srv/aisales-v1-release-20261122-coach-r2/web`. HTML SHA256: `09d2f55d34942296c244be148651f8c4c24024d23fc2eae2d962cc4e122eb119`. Manifest y hashes de JS/CSS en `evidence/web-r2-manifest.json`; validación HTTPS en `evidence/live/results.json`. La primera validación pública se conserva en `evidence/live-initial/`.

La emulación WebKit/Chromium valida geometría, interacción y estilos; no sustituye una prueba en hardware físico. No quedan fallos ni pasos de autenticación pendientes dentro del alcance aprobado.
