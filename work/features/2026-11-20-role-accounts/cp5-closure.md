# CP5 · Cuentas entregadas

**Status:** delivered
**Fecha:** 2026-11-20
**Rama:** feature/pilot-role-accounts
**Sitio:** https://aisales.softvibes.pro/

Se crearon y verificaron dos cuentas nuevas, una de Dueño y otra de Vendedor, dentro de la organización activa. Se usan alias del correo indicado por el usuario. Contraseñas temporales distintas, de exactamente diez caracteres; caducan a las 48 horas y exigen cambio inicial. La app acepta una nueva contraseña personal de diez.

Gmail confirmó el envío al destinatario solicitado con etiquetas SENT e INBOX. Credenciales y recibo están fuera del repositorio y del webroot, en almacenamiento privado del operador. El contenido del correo no se copia a evidencia pública.

Validación: 79 pruebas backend, 12 modelos frontend, build y seis comprobaciones de navegador pasan. Se corrigió la provisión sobre la tabla users heredada sin defaults JSON; se probaron ambos perfiles con ese esquema. Login real de ambas cuentas, rol, temporal, logout y hash del frontend verificados. Las cuentas anteriores se conservaron.

Release final: /srv/aisales-release-20261120-role-accounts; imagen aisales-pilot:20261120-accounts-r2; API privada en loopback18823. Se mantuvo la base actual, snapshot restaurable y releases anteriores. El respaldo diario y la retención de siete días continúan activos.
