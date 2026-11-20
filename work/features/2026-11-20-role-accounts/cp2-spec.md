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

## Criterios de aceptación (Acceptance Criteria)

- AC-01: crear una cuenta nueva owner y otra representative en la organización activa; cada una inicia sesión con su rol correcto.
- AC-02: entregar dos claves temporales distintas de exactamente diez caracteres, generadas criptográficamente y almacenadas como hash en la base.
- AC-03: aceptar cambio personal de diez, rechazar nueve y permitir reingreso con la nueva clave; no invalidar claves largas ya existentes.
- AC-04: ambos campos de nueva contraseña en frontend permiten diez y su ayuda es correcta en EN/ES.
- AC-05: Gmail confirma el envío de las dos credenciales al destinatario explícito, sin destinatarios adicionales.
- AC-06: la provisión funciona sobre el esquema heredado sin defaults JSON y no cambia cuentas previas.

## Requisitos no funcionales

- NFR-01: no almacenar claves reales en Git ni en evidencia pública; archivos operativos con modo 600 y directorios privados.
- NFR-02: mantener cookies, CSRF, caducidad de 48 horas, cambio obligatorio y límites de intentos ya aprobados.
- NFR-03: conservar transacciones y base actual durante el despliegue; verificar build, regresiones y login real antes del envío.

## Seguridad

El destino del correo fue indicado por el usuario y coincide con la cuenta Gmail conectada. La autorización de enviar las claves no habilita otros destinatarios. Permisos heredados se inicializan vacíos; el rol del piloto proviene del servidor. No se crean cuentas de administrador global ni se habilitan endpoints demo. Las contraseñas existentes y datos comerciales no se modifican.

## Requisitos funcionales

- REQ-01: provisionar una cuenta por cada perfil vigente mediante el operador, con credenciales temporales de diez caracteres.
- REQ-02: aceptar la nueva contraseña de diez en API y formulario sin modificar sesiones, permisos ni cuentas anteriores.
- REQ-03: verificar ambos accesos y enviar sus credenciales al correo expresamente indicado.
