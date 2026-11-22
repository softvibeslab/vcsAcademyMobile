# CP1 · Necesidad e inventario

**Status:** complete

NEED-01: recuperar la experiencia anterior para probarla por separado.

- Git base: 951aa02; evidencia anterior: ../2026-11-16-guia-de-inicio/ftd.md.
- Web conservada: /srv/aisales-release-20261116a/web; bundle assets/pilot-BbSXMpJ7.js. API relativa al origen, sin recompilar.
- Imagen compatible: aisales-api:20261114c, sha256:c0371abac3955d972e754854227584ff8a1992ee059b1c0256ac335831a5dea7.
- La instancia antigua detenida monta la base vigente: no reiniciarla. Crear otro contenedor y directorio.
- DNS del hostname solicitado no existía al iniciar. Puerto 18824 libre.
- Versión histórica con siete accesos demo, incluido administrador y recuperación demo. El usuario eligió datos demo independientes; no se importan datos privados.
- /descubre y CMS pertenecen a un servicio compartido diferente; no son parte del artefacto de la aplicación que se restaura. No conectar su backend compartido a esta base demo.
