# ADR-001 · Artefacto histórico y datos independientes

**Estado:** aceptado dentro del alcance confirmado por el usuario el 2026-11-22.

## Contexto

Se pidió publicar la versión del 16 de noviembre con datos de demostración en otro hostname. La web y su imagen de API siguen disponibles. El contenedor histórico detenido monta hoy el directorio de datos del piloto privado, y la API antigua contiene accesos de demostración públicos.

## Decisión

Servir la release existente mediante una raíz nginx explícita, verificar sus checksums y ejecutar la imagen histórica en un contenedor nuevo con volumen exclusivo. La API sigue siendo relativa al origen. No reconstruir ni cambiar funcionalidades, no arrancar el contenedor viejo y no importar la base privada.

## Consecuencias

La publicación reproduce la versión pedida y conserva independiente el piloto actual. Las cuentas y los datos de V1 son exclusivamente de prueba. Coach mantiene el proveedor local original. El nuevo hostname dispone de certificado propio y renovación mediante la infraestructura Certbot ya instalada.

La alternativa de reinstalar el contenedor antiguo se descarta por su volumen compartido. Recompilar el código actual produciría una versión diferente de la solicitada.
