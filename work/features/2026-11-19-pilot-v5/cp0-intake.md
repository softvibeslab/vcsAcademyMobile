# CP0 · Intake del piloto v5

**Status:** approved
**Fecha:** 2026-11-19
**Historia:** work/stories/2026-11-19-pilot-v5.md
**Responsable de aceptación:** Product Owner del proyecto.

## Solicitud y fuentes

El usuario pidió analizar `resumen-completo-proyecto.html` el 18 de noviembre y después indicó «hazlo todo» el 19. Se solicita ejecutar el alcance completo del análisis, concretando antes su contrato.

Fuentes consultadas: resumen con corte 18 de noviembre a las 19:25 Cancún; análisis local del 18; código en `951aa02`; contrato previo `2026-11-14-acceso-free-premium`; evidencia de `2026-11-16-guia-de-inicio`; historial de requisitos HOME y notas en la conversación.

No se consultó Hermes: el usuario dejó la IA pendiente; el piloto excluye el Coach. No se leyó ninguna base productiva ni se verificó infraestructura en vivo.

## Problema

La app implementada todavía ofrece invitado, Coach, planes y una entrada diaria única. El piloto requiere acceso privado, registro de varios tours, métricas con Q efectivos, Ruta administrable y herramientas sin IA.

## Objetivo y límites

Preparar e implementar, tras CP2 aprobado, módulos A, B, C, E, F y G para el piloto del 14 de diciembre de 2026. D y H quedan fuera. No hay venta de licencias, OCR, operación de sala, acceso OAuth ni LLM en este contrato.

## Carril

Contrato CP0–CP5: modifica frontend, backend, datos, autorización y publicación de archivos. La petición general está recibida; las propuestas detalladas de este paquete todavía no se declaran aprobadas.

## Repositorios y verificación

Producto: `SalesAcademyVibes/vcsAcademyMobile`. No se encontró `AGENTS.md` ni perfil local instalado dentro de ese repositorio. Se usan las instrucciones del Ecosistema 360 suministradas por el usuario y su marco fuente en `px-onboarding-mob-gen`, solo como referencia. Todos los artefactos permanecen en el producto.

Stack observado: React/Vite, FastAPI/Pydantic, SQLite, dominio compartido JavaScript. Los comandos reales se registran en el plan preliminar; no se sustituye silenciosamente un perfil ausente por el de otro producto.
