# CP2 · Contrato de cuentas y claves cortas

**Status:** approved_by_direct_request
**Fecha:** 2026-11-20

El usuario ordenó expresamente crear todas las cuentas por perfil, enviarlas a su correo y limitar la clave a diez caracteres. La solicitud directa autoriza esta modificación y el envío; no exige una confirmación adicional. La dirección exacta vive en el manifiesto privado de operación.

- Crear dos cuentas nuevas (owner/representative) en la organización activa Sales Academy, con alias del destinatario como identificadores diferenciados. No cambiar credenciales existentes.
- Generador CSPRNG: exactamente 10 caracteres, letras mayúsculas/minúsculas y números, sin patrones predecibles. Aplicar a altas y recuperación manual.
- Permitir nueva contraseña personal de 10 caracteres; rechazar 9; conservar compatibilidad de hasta 128 para otras cuentas. No obligar a elegir una más larga. Login acepta las claves largas existentes.
- Mantener temporal de 48 h, cambio obligatorio, rate limits, CSRF y sesiones privadas actuales. No nueva API ni esquema.
- Verificar generación, cambio, roles e inicio de sesión antes del envío. No modificar datos comerciales durante smoke.
- Enviar un correo a la dirección explícita usando Gmail conectado; incluir enlace, perfil, usuario, clave e instrucciones. Sin destinatarios adicionales. No claves en Git, evidencia ni mensajes de progreso.

**Criterios:** AC01 dos roles correctos; AC02 claves de 10 aleatorias; AC03 cambio de 10 aceptado / 9 rechazado; AC04 frontend permite 10; AC05 correo enviado al destinatario explícito; AC06 acceso previo sigue válido.
