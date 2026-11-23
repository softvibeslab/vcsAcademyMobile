# ADR-001 · Perfil y bridge propios del Coach V1

**Estado:** aceptado con CP2 por el PO, «si» en conversación.
**Fecha:** 2026-11-22

**Actualización:** el destino físico del bridge de esta decisión queda sustituido por ADR-002, por instrucción explícita posterior del PO. Se mantienen perfil aislado, protocolo, imagen legacy, límites y binding local de la API.

## Contexto

El bridge actual del asesor comercial usa una identidad de captación. Otros perfiles completos de Hermes incluyen herramientas/archivos no apropiados para cuentas demo. El backend legacy está en red Docker bridge y no puede hablar con el loopback del host. Sus cinco archivos relevantes coinciden con el código local; el V5 privado usa otro contenedor y otra base.

## Decisión propuesta

- Identidad `sales-academy-coach-v1` derivada del Copiloto existente, enriquecida exclusivamente con el conocimiento autorizado por la API legacy.
- Reutilizar el patrón de worker efímero sin herramientas/memoria, en instancia privada propia; conservar asesor comercial intacto.
- Imagen derivada de la imagen legacy exacta, copiando solo archivos modificados. No reconstruir el árbol backend completo que contiene V5.
- API V1 candidata con red host y uvicorn escuchando **solo 127.0.0.1:18824**; bridge Coach **solo 127.0.0.1:18643**, puerto comprobado libre. Así la comunicación queda local sin exponer Hermes a Internet ni cambiar upstream nginx. La base/mount V1 se conserva. Validar bindings efectivos antes de activar.
- Timeout bridge32s, adaptador35s y cliente Coach45s, sin reintento automático; nginx actual60s.

## Alternativas evaluadas

- Reusar asesor comercial: descartado por identidad incorrecta e impacto en otro producto.
- Perfil administrativo/master: descartado por alcance de conocimiento/herramientas.
- Abrir bridge a Internet o añadir proxy público: innecesario.
- Montar archivos editables sobre contenedor vivo: menos reproducible y reversible que imagen versionada.
- Conectar con socket Unix: posible, pero exige otro adaptador de transporte sin ventaja necesaria en este despliegue local.

## Consecuencias y reversión

El cambio de red aplica solo al reemplazo V1, con binding estricto loopback. Antes de activar se prueba la imagen contra copia SQLite y puerto temporal; no arrancar candidatos contra la base real. Crear respaldo consistente porque init_db legacy actualiza metadatos demo y progreso inicial al arrancar. Revertir al contenedor/imagen anterior, configuración y frontend versionados, conservando datos según runbook de CP3. La credencial del proveedor requiere intervención del titular; no se sustituye por una cuenta distinta.
