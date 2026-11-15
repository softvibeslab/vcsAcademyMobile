# Corrección de referencia: app de entrenamiento

Autorización: «App de entrenamiento: Rep, Roadmap, AI Coach y Bóveda» (chat, 13 noviembre 2026). Corrige el despliegue que mezcló el producto con growth.

Fuente de flujo: Stitch 11832430028020238900, ocho láminas A–H. Fuente visual: designpiloto (bienvenida, introducción, perfil, inicio, Home, Roadmap, Bóveda, lecciones, notas, Goal Sheet y roles).

Entrega: React funcional en la raíz de aisales.softvibes.pro, conservando /academia/ como alias. El sitio comercial se conserva separado; los wireframes de entrenamiento quedan accesibles sin confundirlos con la app. No modificar API, base de datos, permisos ni claves. El invitado mantiene el flujo Rep -> elegir módulo -> explorar sin autenticación obligatoria.

Implementación: robot SVG original y tipografía DM Sans; retirar hero editorial/sidebar inventados; shell superior y dock del piloto; reconstruir onboarding, resumen de Roadmap, tarjetas de Bóveda y jerarquía de Home con datos existentes. Reutilizar formularios, recuperación, guardado, chat y roleplay. No mostrar métricas de ejemplo como reales, bloqueos comerciales inventados, subida/grabación/voz ni reproducción de videos inexistentes. Pantallas propuestas en wireframe se limitan a funciones disponibles.

Validación: prueba de regresión de onboarding antes/después, tests de dominio, build, recorridos con backend aislado, capturas de inicio/Rep/Roadmap/Bóveda/Coach/Home en móvil y escritorio, contraste y overflow, health y mismo API tras publicación. Excepción TDD: corrección visual; prueba de comportamiento existente y evidencia visual, sin cambiar contratos.
