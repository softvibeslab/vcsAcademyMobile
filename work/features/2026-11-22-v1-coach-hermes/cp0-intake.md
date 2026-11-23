# CP0 · Coach compacto y Hermes para V1

**Status:** aprobado; implementación autorizada.
**Fecha:** 2026-11-22 (America/Cancun)
**Carril:** Contrato · CP0–CP5; frontend, backend e infraestructura.
**Historia:** work/stories/2026-11-22-v1-coach-hermes.md
**Rama:** feature/v1-coach-hermes
**Base:** 6e10a52, agenda V1 publicada y árbol limpio al iniciar.

## Solicitud

Usuario, conversación: «mejora el modulo de https://aisalesv1.softvibes.pro/#coach para que sea mas intuituvi sin tnto espeacio optimizando el chat con el couch y conectalo al hermes con el perfil».

Aprobación nueva del contrato CP2: Roger respondió «si» en conversación después de revisar la propuesta. Se autoriza implementar y publicar este alcance; la autenticación de Hermes debe comprobarse por separado.

## Contexto confirmado

- El frontend legacy añade encabezado promocional, pestañas y otra cabecera antes del chat. El compositor queda bajo el primer viewport móvil.
- En dark el texto del usuario hereda `--ink` oscuro sobre una burbuja verde translúcida.
- El backend solo implementa LocalKnowledgeProvider; acepta conversation_history pero no lo utiliza.
- Hermes tiene un bridge privado activo; una inferencia sintética falla por credencial del proveedor inválida (401). HTTP 200 en health no demuestra inferencia disponible.
- El asesor comercial `sales-academy-advisor` atiende producto/demos. El perfil `sales-academy` tiene otro propósito. No se seleccionarán por similitud del nombre.
- El Copiloto web contiene una identidad de entrenamiento apropiada para derivar un perfil aislado V1.

## Entrega prevista

Chat compacto, legible en light/dark, historial operativo con Hermes y perfil de entrenamiento; publicación reversible solo en aisalesv1. La agenda y el piloto privado conservan su comportamiento.
