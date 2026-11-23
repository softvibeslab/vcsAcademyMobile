# CP1 · Necesidad y diagnóstico

- `TourVisitDialog.submit` guarda feedback y después llama automáticamente a `/analysis`; el backend sólo infiere mediante ese endpoint.
- `TourAnalysis` ya permite análisis manual, pero no incluye aporte. Se remonta por revisión; hay que conservar el estado de una operación guardar → analizar para no duplicar aportes ante error.
- PATCH `action:edit` ya permite contexto y revisión esperada. El análisis conserva la revisión. Una revisión nueva mantiene el análisis previo como desactualizado.
- Un UUID nuevo de análisis en la misma revisión ready reemplaza el resultado: no regenerar sin cambios. Habilitar un nuevo análisis al añadir aporte o editar la visita.
- El esquema actual `summary/strengths/improvement/next_practice/recommended_steps` permite brevedad y pasos sin alterar la API ni SQLite.

Capas: frontend y backend. Publicación mediante operador V1 existente, aislada de V5. Sin cambios al perfil Hermes compartido: las instrucciones de este modo se fijan en el adaptador del servidor V1.

Dependencias: `TourVisits.jsx` → modelos/componentes UI/API legacy; `Coach.jsx`, `SmartAgenda.jsx`, `Learning.jsx` → captura/detalle compartidos. `main.py` → `coach_hermes.generate_visit_analysis` → bridge Hermes existente. Persistencia, propietario, retención y catálogo se conservan.
