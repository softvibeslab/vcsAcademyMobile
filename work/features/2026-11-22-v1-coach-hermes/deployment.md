# Publicación · Coach compacto con Hermes remoto

Destino público: https://aisalesv1.softvibes.pro/#coach.
Fecha de entrega: 22 de noviembre de2026, America/Cancun.

## Estado desplegado

| Componente | Ubicación |
|---|---|
| Frontend final | /srv/aisales-v1-release-20261122-coach-r2/web en76.13.231.12 |
| API V1 | aisales-v1-coach-20261122, imagen aisales-v1-api:20261122-coach, loopback18824 |
| Imagen API | sha256:628d264b850131875af34cbb97cee979b22ea2b2fd997538664e45120990073e |
| SQLite V1 conservada | /srv/aisales-v1/data/academy.sqlite3 |
| Túnel SSH | salesacademy-coach-v1-tunnel.service, loopback18643 de76 hacia loopback18643 de2.25.231.154 |
| Bridge/perfil remoto | salesacademy-coach-v1.service / sales-academy-coach-v1, en2.25.231.154 |
| Modelo conservado | gpt-6.1-sol, proveedor actual del Hermes remoto |

El navegador llama a su API same-origin. La API recibe únicamente una clave privada de transporte por montaje read-only; el modelo y sus credenciales residen en el VPS Hermes. El bridge no está expuesto públicamente.

## Ejecución y evidencia

1. Se validó el frontend y el adaptador contra API real temporal y bridge externo simulado. Pruebas de estados, historial, permisos, móviles y Roleplay registradas en CP4.
2. El PO eligió el destino Hermes remoto. Se instaló el perfil aislado en2.25 y se probó el túnel en18644 antes de activar18643, con restricciones SSH y usuario sin shell. Luego se retiró únicamente el bridge/timer local preparado durante esta feature.
3. `deploy-release.py` verificó la imagen base legacy exacta; construyó imagen derivada con tres archivos, probó candidato18825 sobre copia SQLite y exigió inferencia real200 antes de activar18824.
4. Se conservaron esquema, número de usuarios y hashes internos de roles/contraseñas/permisos/licencias. V5 mantuvo contenedor, imagen, Nginx y HTML. Respaldo SQLite consistente privado en /srv/aisales-v1/ops/20261122-coach/academy-before.sqlite3.
5. `publish-web-r2.py` aplicó únicamente el contraste final de placeholder/icono deshabilitado; API y contenedores idénticos. Manifest final en evidence/web-r2-manifest.json; activación en web-r2-activation.json.
6. `verify-live.cjs` compara HTML/JS/CSS exactos por HTTPS, valida seis combinaciones de navegador/tema, conversación real de dos turnos, Roleplay sin guardar negocio, Home/evaluaciones,42fechas de Agenda visibles y sin scroll, sesión/logout y baseline públicoV5. Las únicas mutaciones de smoke público son login, chat sintético y logout.

Se verificaron dos turnos reales antes de publicar, una consulta fresca después del aviso de autorización del usuario y otras consultas a través de la API publicada. El intento OAuth adicional se canceló: la credencial actual del servidor elegido ya funcionaba. El401 histórico pertenece al servidor anterior, no a la conexión final.

## Reversión

Solo contraste/frontend final: restaurar el vhost V1 desde /srv/aisales-v1/ops/20261122-coach/nginx-before-r2.conf, comprobar nginx-t y recargar. Vuelve a la primera release del Coach con la misma API.

Toda la feature: detener aisales-v1-coach-20261122 y arrancar el contenedor conservado aisales-v1-20261122; restaurar el vhost desde /srv/aisales-v1/ops/20261122-coach/nginx-before.conf y validar/recargar Nginx. Regresa a agenda-viewport y al Coach local anterior. No restaurar automáticamente SQLite: no hubo migración y hacerlo borraría actividad posterior.

Después de revertir la API se puede retirar el túnel nuevo en 76.13.231.12 y el bridge/timer remoto propios del Coach en 2.25.231.154 mediante `systemctl disable --now` sobre sus unidades dedicadas; así no vuelven a iniciarse tras reiniciar el host. No modificar servicios del asesor comercial ni V5. Para revertir solo el transporte existe `python3 /opt/salesacademy-coach-tunnel/tunnel_service.py rollback`; recupera la instancia local preparada, cuya autenticación histórica no era válida. Runbooks adicionales en backend/deploy/coach-v1 y coach-tunnel.

## Límites de la validación

iPhone/Android se probaron mediante WebKit/Chromium con viewport/DPR y altura reducida, no en hardware físico. El historial se conserva en memoria durante esta conversación y se acota para inferencia; no hay nueva persistencia. Roleplay mantiene su simulación anterior. La disponibilidad futura del proveedor externo depende de su autenticación y servicio; el error recuperable está probado.
