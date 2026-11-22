# CP5 · Publicación de la versión anterior

**Status:** complete

Publicado: https://aisalesv1.softvibes.pro/.

Release 20261116a (16 de noviembre), bundle pilot-BbSXMpJ7.js, API histórica en contenedor independiente. Base nueva verificada: siete cuentas demo, cero cuentas fuera de las semillas, cero tablas del piloto privado e integridad SQLite OK.

HTTPS válido, redirección HTTP 301 y readiness correctos. Certificado hasta 2027-02-20, renovación Certbot con temporizador existente y hook nginx global.

Configuración, raíz, checksum frontend, contenedor y mounts de aisales.softvibes.pro coinciden con el baseline anterior. Reversión en operations-runbook.md.

Validación concluida: 17 pruebas de modelos pasan y recorrido real móvil/escritorio pasa (login, guía, Home, Roadmap, Coach local, Perfil y logout). Sin errores JavaScript ni overflow. Gobierno estricto y escaneo de configuración pasan. Evidencia y limitación del resolver DNS local documentadas en CP4.

En el login, «Explorar con una cuenta de demostración» permite elegir los accesos originales. La instancia conserva únicamente datos demo independientes. No se requiere migrar ni recuperar claves del piloto privado.
