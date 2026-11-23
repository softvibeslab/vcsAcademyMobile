# Coach V1 · perfil y puente privado Hermes

Contrato aprobado: `work/features/2026-11-22-v1-coach-hermes/cp2-spec.md` y ADR-001. Este runtime atiende únicamente la conversación autenticada de AI Coach en V1; no modifica el asesor comercial, el Copiloto anterior, Roleplay ni V5.

## Transporte

- `GET http://127.0.0.1:18643/health`: `{ok:true,profile:"sales-academy-coach-v1"}`. Prueba el transporte, no la disponibilidad del modelo.
- `POST /chat`: Bearer privado, JSON exacto `{messages:[{role,content}]}`; `system` solo primero, termina en `user`. Hasta41 mensajes/128KiB; contenidos ordinarios≤6000caracteres, system≤100000. La API cliente impone límites de producto más pequeños.
- Éxito: `{reply}` hasta6000caracteres. Error sanitizado `{error:{code,message}}` con400/401/413/415/429/503/504. La API convierte errores del proveedor a503 o429, nunca a un401 de sesión del navegador.
- Dos inferencias simultáneas, subprocess32s, sin shell; worker de una iteración/1200tokens. No hay ruta pública ni `/notes`.

## Aislamiento

`SOUL.md` adapta la identidad del Copiloto para preparación de conversaciones, práctica y objeciones. No afirma recibir agenda ni datos que esta integración no adjunta. El sistema agrega únicamente rol y extractos autorizados desde la API.

El servicio corre como `sa-coach-v1`, con `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ProtectHome` y recursos limitados. El perfil permanente es de solo lectura para la cuenta del servicio. Cada petición copia exclusivamente config.yaml, SOUL.md y .no-bundled-skills a un directorio temporal que se elimina tras éxito, error o timeout.

El worker desactiva herramientas, memoria, archivos de contexto, revisión en segundo plano, SessionDB, snapshots, trayectorias y checkpoints. Su entorno no conserva el token del transporte. Si el runtime devuelve herramientas o una sesión persistente, la inferencia se rechaza y el agente se cierra.

## Credenciales y archivos

| Uso | Ruta | Permisos |
|---|---|---|
| Clave exclusiva API→bridge | /etc/salesacademy-coach-v1/client.key | root:root, 0600 |
| EnvironmentFile bridge | /etc/salesacademy-coach-v1/bridge.env | root:root, 0600 |
| Configuración API, sin valores secretos | /etc/salesacademy-coach-v1/client.env | root:root, 0600 |
| Access credential minimizada del modelo | /etc/salesacademy-coach-v1/provider.json | root:sa-coach-v1, 0640 |
| Perfil | /var/lib/salesacademy-coach-v1/.hermes/profiles/sales-academy-coach-v1 | directorios 0750, archivos 0640, root:sa-coach-v1 |

El exportador root entrega solo cinco campos: api_key, base_url, provider, api_mode y model. En modo `copy`, reutiliza el export mínimo existente del mismo VPS. En modo `hermes`, consulta el resolver oficial y sus locks contra el auth store autoritativo: no copia auth.json ni el refresh token al servicio. Un timer propio actualiza el mínimo cada cinco minutos; no modifica timers ni permisos del asesor. El proveedor/destino admitido es el OpenAI Codex configurado y se conserva el modelo actual de ese VPS.

La reautenticación sigue perteneciendo al titular del auth store de Hermes. Un archivo exportado correctamente no prueba credencial vigente. No sustituir la cuenta ni imprimir claves al diagnosticar.

## Instalación

`provision.py` se ejecuta como root en el VPS, después de pruebas y de subir estos seis archivos Python/identidad a una carpeta de staging. Requiere el runtime existente en `/opt/salesacademy-advisor/venv/bin/python` y su export minimizado; solo los reutiliza en lectura.

Crea estos componentes nuevos:

- `/opt/salesacademy-coach-v1` con bridge, worker, exportador, identidad y verificador.
- Cuenta `sa-coach-v1`, perfil y archivos privados anteriores.
- `salesacademy-coach-v1.service`.
- `salesacademy-coach-v1-credential.service` y `.timer`.

No publica la API ni cambia Nginx. La API V1 se activa por separado conforme a ADR-001, con red host y binding127.0.0.1:18824. Su contenedor monta `/etc/salesacademy-coach-v1/client.key:/run/secrets/coach.key:ro` y carga las tres variables no secretas del client.env:

```text
VCSA_SMART_AGENT_PROVIDER=hermes
VCSA_COACH_HERMES_URL=http://127.0.0.1:18643/chat
VCSA_COACH_HERMES_KEY_FILE=/run/secrets/coach.key
```

## Verificación y reversión

Local: `.venv/bin/python backend/tests/test_coach_bridge.py`. Las pruebas usan datos sintéticos e inferencia simulada. Evidencia RED→GREEN en la feature.

VPS: `/opt/salesacademy-advisor/venv/bin/python /opt/salesacademy-coach-v1/verify_bridge.py`. No muestra respuestas ni credenciales. Verifica health, autenticación, contrato, perfil intacto, permisos y estado del asesor; si el modelo responde, realiza segundo turno para verificar continuidad. `transportPassed:true` puede coexistir con `inference.available:false`; jamás informar IA activa en ese caso.

Para revertir únicamente esta infraestructura, retirar primero la selección Hermes de la API V1 o restaurar su contenedor anterior. Después detener/deshabilitar `salesacademy-coach-v1.service` y `salesacademy-coach-v1-credential.timer`. Conservar archivos privados para diagnóstico según la política operativa; no tocar servicios `salesacademy-advisor*` ni V5.

Excepcion TDD: provisionador y unidades son configuración operativa. Se validan mediante compilación, `systemd-analyze verify`, listener efectivo loopback, permisos, baseline de servicios anteriores y smoke sintético; transporte/worker/export minimizado sí tienen pruebas anteriores RED→GREEN.


## Destino remoto autorizado: 2.25.231.154

El usuario eligió explícitamente «Conectar Coach a Hermes en 2.25.231.154». El sitio/API permanece en76.13.231.12; el perfil y la inferencia funcionan en2.25.231.154. El acceso atraviesa un túnel SSH restringido y cifrado de loopback a loopback, administrado por el runbook de túnel de esta feature. Hermes no escucha en una interfaz pública.

La identidad y el protocolo no cambian. El archivo client.key ya existente en76 se transfirió al destino mediante streams SSH cifrados, sin escribirlo localmente ni mostrarlo. Así la API mantiene su montaje y keyfile. El servicio local anterior de76 se conserva para reversión y se desactiva al completar el túnel; su perfil/archivos no se borran.

Runtimes comprobados en2.25:

- Inferencia sin privilegios: `/opt/salesacademy-advisor/venv/bin/python`, código accesible de solo lectura `/opt/salesacademy-advisor/hermes-agent-0.20.1`.
- Exportador root: `/root/.hermes/tools/python-3.14.9+20261021-linux-x64/bin/python3`, código autoritativo `/root/.hermes/hermes-agent`, con `hermes_bootstrap` como el launcher oficial.
- No se copió código/venv del perfil root ni se abrieron permisos de `/root`.
- Modelo configurado comprobado al instalar: `gpt-6.1-sol`; el exportador conserva el modelo existente y no lo selecciona por su cuenta.

Configuración usada para provisionar en2.25:

```sh
COACH_EXPORT_MODE=hermes \
COACH_AUTH_CODE=/root/.hermes/hermes-agent \
COACH_AUTH_BOOTSTRAP=1 \
COACH_CREDENTIAL_PYTHON=/root/.hermes/tools/python-3.14.9+20261021-linux-x64/bin/python3 \
COACH_HERMES_CODE=/opt/salesacademy-advisor/hermes-agent-0.20.1 \
/usr/bin/python3 /srv/salesacademy-coach-v1/ops/coach-remote-20261122/provision.py
```

Mientras el titular completa OAuth, usar `verify_bridge.py --transport-only`: confirma transporte, credencial de la API y aislamiento sin invocar el modelo. Después de completar OAuth, iniciar `salesacademy-coach-v1-credential.service` en2.25 y ejecutar el verificador sin esa opción; debe responder dos turnos reales con continuidad antes de declarar la IA activa. No hace falta reiniciar el bridge para leer el nuevo export.

El export/timer del asesor en2.25 no existía y su archivo de acceso era antiguo; por eso el Coach usa su resolver oficial propio. Los servicios/archivos del asesor y los contenedores Coolify/AgenticOS existentes se compararon antes/después y permanecieron iguales.

Validación real final del destino remoto: primer turno HTTP200 en8.87s y segundo turno HTTP200 con continuidad verificada. Los ocho checks de transporte/aislamiento también pasaron. La credencial autoritativa de2.25 ya era válida; el401 anterior correspondía a76. No se completó ni necesitó una reautenticación nueva para estas pruebas. Fuente: `evidence/bridge-remote-live.json`.
