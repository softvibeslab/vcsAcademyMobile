# Sales Academy · Wireframe de interfaz completa

25 pantallas derivadas de los HTML originales del proyecto Stitch `8496026853797356014`. No es la app funcional ni sustituye el wireframe móvil previo de 43 estados.

Abre `index.html` sin conexión o sirve esta carpeta con un servidor estático. Usa el inventario, el buscador, los cinco recorridos o las conexiones bajo cada pantalla. «Abrir pantalla» permite revisar el wireframe sin el explorador. Vista móvil ajusta el frame; los layouts desktop pueden requerir desplazamiento dentro del visor.

## Recorridos
1. Descubrir la propuesta: landing, biblioteca, guía, película, galería, método y asesor.
2. Diagnóstico y asesoría: pregunta, resultado, conversación, video y solicitud de demo.
3. Entrada desde móvil.
4. Publicar un recurso: acceso CMS, recursos, editor, medios y publicaciones.
5. Gestionar la academia: landing, solicitudes, asesor, usuarios y publicaciones.

## Criterios de wireframe
Se conserva la estructura, jerarquía y contenido de los diseños fuente. Colores neutralizados; imágenes sustituidas por placeholders; CSS incluido localmente; scripts originales y medios externos retirados. Las rutas son conexiones propuestas a partir de los destinos y controles del diseño. Guardar, enviar, publicar, eliminar, login, invitación y subida de archivos son simulaciones y no realizan operaciones.

`catalog.json` vincula cada pantalla con su ID original de Stitch y encabezados. `flows.js` define recorridos/conexiones. `screen.js` intercepta acciones para navegación o avisos de simulación. `build.cjs` reconstruye desde los exports descargados; únicamente la reconstrucción requiere CDN Tailwind, el resultado final funciona sin red.

Validado en Chromium: 25 pantallas, cinco recorridos, todos los destinos existentes, búsqueda móvil, sin errores JS ni solicitudes externas. Evidencia en `work/features/2026-11-13-interface-wireframe/validation.json`.
