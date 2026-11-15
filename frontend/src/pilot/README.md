# Sales Academy · nueva webapp

Entrada: `frontend/pilot.html`. React/Vite y backend FastAPI existentes. La entrada anterior `frontend/index.html` y Expo se conservan.

## Ejecutar

Desde la raíz de `vcsAcademyMobile`:

```bash
bash tools/pilot/start.sh
```

Abre `http://127.0.0.1:5174/pilot.html`. El script usa una base SQLite de demostración independiente en el directorio temporal; no borra ni reemplaza la base de la app anterior. Si estos puertos ya están ocupados por la sesión de revisión, usa el servidor abierto o define `PILOT_API_PORT` y `PILOT_WEB_PORT` diferentes.

Para usar una base existente, especifica conscientemente `VCSA_DB_PATH=/ruta/a/la/base.sqlite3`. Todas las escrituras de la UI usarán esa base.

Acceso: «Ya tengo una cuenta» → «Explorar con una cuenta de demostración» → Rep, Gerente o Admin → «Iniciar sesión». El catálogo y las credenciales demo provienen del backend local.

## Funciones

- Acceso, recuperación local de contraseña, cambio de contraseña, cierre y vencimiento de sesión; coach público antes del acceso.
- Home con periodos hoy/semana/mes, métricas de dominio y progreso.
- Goal Sheet persistente por fecha, ventas, notas y seguimientos; agenda de seguimientos.
- Roadmap canónico de 11 pasos, guiones, checklist y finalización.
- Chat, escenarios, roleplay por texto, puntuación del servicio, envío y feedback.
- Bóveda: biblioteca con restricciones, Notebook y Diario con edición/eliminación/exportación, calculadoras de cierre/VPG.
- Gerente: equipo, evaluación con rúbrica y decisiones de certificación sujetas a los requisitos del servidor.
- Admin: crear/editar/publicar/archivar contenido; invitaciones locales, roles, estado y permisos de usuarios; auditoría.
- Tema claro/oscuro, sidebar en escritorio y navegación inferior en móvil.

Notebook, Diario y meta mensual usan localStorage por ID de usuario: no se sincronizan entre dispositivos. Exporta las notas antes de borrar datos del navegador. El backend local usa el proveedor de entrenamiento existente; no se añadió un LLM externo. El contenido y las respuestas heredadas pueden estar en inglés. Los videos no se reproducen porque la API actual no entrega URLs. No se implementan pagos, OAuth ni registro público sin contratos existentes.

## Organización

`App.jsx`: sesión, carga inicial, API y rutas hash. `Workspace.jsx`: desempeño, actividad, agenda y perfil. `Learning.jsx`: roadmap, biblioteca y notas. `Coach.jsx`: chat/prácticas. `Management.jsx`: gerente/admin. `ui.jsx`: componentes, formularios y estados remotos. `model.mjs`: transformaciones y dominio compartido.

## Compilación y verificación

```bash
npm run build:web
npm test
node --test frontend/src/pilot/model.test.mjs
VCSA_DB_PATH=/tmp/vcsa-test-independent.sqlite3 .venv/bin/python backend/tests/e2e_smoke.py
node work/features/2026-11-13-pilot-webapp/verify.cjs
node work/features/2026-11-13-pilot-webapp/edge-cases.cjs
```

Los dos scripts de navegador requieren los servidores en 5174/8009 y escriben datos sintéticos: ejecútalos únicamente con una base de pruebas. El smoke de API necesita `httpx` en `.venv`.

El build genera `frontend/dist/index.html` y `frontend/dist/pilot.html`. En producción, configura un proxy del mismo origen `/api` al backend o define `VITE_PILOT_API_BASE_URL` al compilar. Publicada en https://aisales.softvibes.pro/ y /academia/.

## Flujo de entrada alineado con Stitch A
Bienvenida → introducción del coach → perfil → elección de sección → exploración como invitado. La selección es única y se confirma con «Continuar al módulo». El invitado no inicia sesión automáticamente ni usa cuentas demo: Roadmap y contenidos ilustrativos son locales, y el chat utiliza únicamente el endpoint público. Al recargar se reinicia la prueba.

Guardar información, acceder a materiales privados o iniciar roleplay requiere una cuenta y conserva el destino solicitado. Gerente y Dirección tienen entradas diferenciadas; la cuenta autenticada determina los permisos. El alta pública/SSO siguen pendientes: la pantalla de acceso explica la invitación por administrador y ofrece probar sin cuenta. La recuperación incluye confirmación, dos campos de nueva contraseña y reintento; sigue siendo recuperación local de demostración, sin envío de correo.

## Referencia de diseño corregida · 13 noviembre 2026

El proyecto de entrenamiento es Stitch **11832430028020238900**, con `../designpiloto/` como fuente visual. No usar el proyecto comercial/MediaHub/CMS 8496026853797356014 para esta app. `Onboarding.jsx` y `training-design.css` implementan la corrección visual con assets originales; se conservan API, datos y permisos. Evidencia y decisiones: `work/features/2026-11-13-training-design-correction/`. La referencia navegable de entrenamiento está en `/stitch/`; la página comercial separada en `/comercial/`.
