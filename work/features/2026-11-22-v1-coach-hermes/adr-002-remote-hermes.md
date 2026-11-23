# ADR-002 · Hermes del VPS indicado por el PO

**Estado:** aceptado por instrucción explícita del PO.
**Fecha:** 2026-11-22 (America/Cancun)
**Evidencia:** respuesta «Conectar Coach a Hermes en 2.25.231.154» a la aclaración de destino en conversación.

## Contexto verificado

Los dos hosts son máquinas diferentes. Los DNS y Nginx actuales de aisalesv1/aisales apuntan a76.13.231.12, que sirve frontend/API de V1 y V5. El VPS2.25.231.154 contiene otra instalación de Hermes y otro despliegue de Sales Academy, sin vhost V1 ni API18824. Reautenticar un host no actualiza el otro.

El PO indicó usar la instalación de2.25.231.154. Esto reemplaza el destino de inferencia local de ADR-001, sin cambiar los contratos públicos de la feature.

## Decisión

- Web, API18824 y SQLite V1 permanecen en76.13.231.12.
- Perfil sales-academy-coach-v1 y bridge127.0.0.1:18643 se instalan en2.25.231.154, aislados del asesor comercial.
- Un túnel SSH dedicado en76 escucha solo127.0.0.1:18643 y transporta al mismo puerto loopback de2.25. La API no cambia URL ni recibe credenciales SSH.
- Llave de túnel generada para este servicio, sin copiar llaves privadas del desarrollador. Cuenta remota sin sesiones de shell, TTY, forwarding de agente/X11 ni túneles remotos; destino permitido exclusivamente127.0.0.1:18643. Hostkey cotejada con la entrada local ya confiable.
- Clave API→bridge exclusiva, transferida únicamente entre archivos privados de servidor y montada read-only en la API; jamás en frontend/repositorio/evidencia.
- Exportador root dedicado en2.25 usa el resolver del runtime actual de Hermes y entrega solo credencial de acceso/modelo mínimos al worker no root. No reutilizar export viejo del asesor ni copiar auth.json/refresh tokens al worker.
- Conservar el modelo configurado al iniciar en2.25: gpt-6.1-sol. Autorización OAuth del titular dentro del flujo oficial de Hermes. No solicitar contraseñas por conversación.

## Activación y reversión

Probar primero túnel en puerto local18644 y comprobar restricciones/auth/health. Después retirar del puerto18643 únicamente la nueva instancia local de Coach preparada en esta feature y activar el túnel. Conservar esa unidad para reversión; nunca tocar asesor comercial ni V5.

Comprobar configuración SSH con sshd-t y configuración efectiva de root antes/después; la restricción aplica solo a la cuenta nueva. Probar listeners, credenciales privadas, hash de artefactos, inferencia real y continuidad. La reautenticación no se considera exitosa hasta verificar inferencia; health solo prueba transporte.

Para reversión de toda la feature, restaurar API/frontend V1 anteriores y detener túnel/bridge nuevos. Una reversión solo del transporte puede recuperar la unidad local de Coach anterior, pero sus credenciales expiradas no constituyen una IA funcional.
