# Transporte privado del Coach hacia Hermes remoto

El PO indicó expresamente conectar el Coach a Hermes en `2.25.231.154`. La aplicación y base V1 permanecen en `76.13.231.12`; el adaptador sigue consumiendo `127.0.0.1:18643`. Ver contrato/ADR de `work/features/2026-11-22-v1-coach-hermes`.

## Arquitectura

API V1 → loopback18643 del VPS app → SSH persistente con clave dedicada → loopback18643 del VPS Hermes → perfil aislado `sales-academy-coach-v1`.

No hay endpoint Hermes público. La clave SSH se genera únicamente en el VPS app; no se exporta ni se reutiliza la clave personal de despliegue. La clave Bearer del bridge permanece del lado servidor y mantiene su valor para compatibilidad con el montaje de la API.

## Componentes

- `provision_source.py host-key.pub`: cuenta sin shell `sa-coach-tunnel` y clave Ed25519 en `/var/lib/salesacademy-coach-tunnel`; host key remota fijada y comparada con el fingerprint previamente conocido.
- `provision_target.py source-key.pub`: cuenta sin shell y clave pública autorizada solo desde76.13.231.12. Regla Match exclusiva incluida al final de sshd_config; no cambia política root ni otros usuarios. `sshd -t` y políticas efectivas se comparan antes de recargar SSH. Copia anterior en `/var/lib/salesacademy-coach-tunnel-ops`.
- `tunnel_service.py stage`: servicio temporal no root en127.0.0.1:18644; prueba transporte y autenticación sin parar el bridge anterior.
- `tunnel_service.py activate`: únicamente después de verificar el remoto. Para el bridge anterior76, inicia túnel persistente18643, valida listener/auth y entonces deshabilita bridge anterior y su timer dedicado. Asesor comercial y V5 permanecen intactos.
- `tunnel_service.py rollback`: detiene el túnel y restaura estado active/enabled previo del bridge/timer dedicados76.

El usuario remoto solo puede usar forwarding TCP local a127.0.0.1:18643. No puede abrir sesión/comando/SFTP/PTY, forwarding remoto, agente, X11, túnel de red o sockets Unix. Host key: `SHA256:60cjycbenLy0+xBtZOe3nPpGpu1aiMFj3r/595gGCIo`, obtenida mediante SSH ya confiable y coincidente con known_hosts local. La unidad fuerza BatchMode, StrictHostKeyChecking y algoritmo Ed25519; no admite passwords ni otro agente de credenciales.

## Verificación

Excepcion TDD: esta entrega son scripts de configuración operativa de OpenSSH/systemd, sin cambio del contrato de chat. Validar con compilación, `sshd -t`, `sshd -T -C`, `systemd-analyze verify` y pruebas reales con la clave restringida, no tests que copien los literales de configuración.

Antes de activar se verifica: fingerprint confiable; políticas root/otro usuario idénticas; forwarding permitido a18643; comando arbitrario, destino22 y remote-forward rechazados; health y POST autenticado por18644; listener únicamente loopback y proceso SSH no root. Al activar, repetir health/auth por18643 y comprobar que API/V5/asessor no cambiaron.

Una respuesta503 sanitizada prueba que llegó al runtime pero **no** que el modelo está disponible. No declarar IA activa hasta completar inferencia real y continuidad de dos turnos. El titular administra el inicio de sesión/modelo Hermes; estos scripts no lo modifican.

## Reversión

En el VPS app, ejecutar el mismo script instalado con `rollback`. El bridge y perfil anterior, export y clave permanecen guardados. Para retirar también la autorización remota después de desactivar túneles: restaurar `/var/lib/salesacademy-coach-tunnel-ops/sshd_config.before`, validar `sshd -t`, recargar ssh y retirar solamente la cuenta/clave de este túnel según operación. No hacerlo si otros cambios SSH posteriores requieren preservar el archivo actual; en ese caso retirar solo el Include/Match propio.
