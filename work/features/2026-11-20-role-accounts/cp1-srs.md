# CP1 · Alcance

**Status:** approved

## Problema

La provisión actual genera claves de 43 caracteres y el cambio exige 12. Las nuevas cuentas necesitan claves de 10 y poder elegir una contraseña personal de 10.

Se conservan el cambio obligatorio, vencimiento de 48 horas, hash, cookies, CSRF, aislamiento y revocación. Los perfiles vigentes son Dueño y Vendedor. El operador actúa por CLI; los roles demo no se reactivan.

## Necesidades

Permitir al propietario probar ambos perfiles con credenciales breves, recibirlas por su correo y entrar sin que el cambio inicial obligue a usar una contraseña más larga. Preservar acceso y datos de cuentas existentes.
