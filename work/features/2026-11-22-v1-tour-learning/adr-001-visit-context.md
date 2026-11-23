# ADR-001 · Visita independiente y contexto recuperado por la app

**Estado:** propuesto; pendiente CP2.

## Contexto

Goal Sheet es único por usuario y día. Smart Diary usa localStorage. Hermes opera sin memoria compartida. Guardar varios tours en Goal Sheet sobrescribiría registros y alteraría KPIs; confiar en memoria global de Hermes dificultaría aislar usuarios y eliminar datos.

## Decisión propuesta

Crear entidad independiente de visita en SQLite V1, con feedback y análisis relacionados. El backend carga únicamente la visita seleccionada y autorizada para cada llamada a Hermes. La IA sugiere, pero la API y la confirmación del usuario realizan los cambios. Los análisis se vinculan a una revisión concreta; la caducidad y eliminación abarcan el conjunto.

## Alternativas

- Reutilizar Goal Sheet: rechazada por unicidad diaria y semántica de métricas.
- Guardar todo en localStorage: no satisface consulta posterior entre dispositivos.
- Activar memoria global del agente: no asegura propiedad ni retención por visita.

## Consecuencias

Requiere migración aditiva, endpoints nuevos, pruebas de propiedad/idempotencia y limpieza diaria. No requiere otro proveedor ni dar herramientas de escritura al modelo. El registro sigue disponible si el análisis falla.
