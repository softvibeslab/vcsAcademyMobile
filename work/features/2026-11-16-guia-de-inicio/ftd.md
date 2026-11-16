# FTD: `guia-de-inicio`

**Status:** done (publicado en aisales 2026-11-16)
**Lane:** FTD
**Author:** `RogerDevAndroid`
**Branch:** `feature/guia-de-inicio`
**Date:** `2026-11-16`
**Ticket:** `Pedido del PO (2026-11-16): «onboarding donde le muestre en la app los casos de uso e insights y que lo vaya guiando para crear sus primeros pasos y definir sus metas y prueben los casos de uso principales; que solo se visualice en la primera visita o inicio de sesión una vez que entren a Home; que la puedan ocultar y omitir, pero que siempre esté disponible en alguna opción de perfil o donde aporte la mejor experiencia»`

## Claridad

- **Solicitud:** guía dentro de la app (después del inicio de sesión) con casos de uso, insights, definición de metas y primeros pasos para probar los casos de uso principales.
- **Entendimiento:**
  - **Cuándo aparece:** la primera vez que el usuario llega a Home después de iniciar sesión, en ese dispositivo. No vuelve a abrirse sola.
  - **Guía (4 pantallas, en hoja/modal):**
    1. *Así te ayuda Sales Academy*: 4 casos de uso (prepararte con el Roadmap, practicar con el AI Coach, medir tu día con Goal Sheet, reflexionar con Smart Diary).
    2. *Lo que vas a ver*: insights de Home (cierre %, VPG, recomendaciones del AI Coach) con tus valores del mes si ya hay registros, o cómo se calculan si no.
    3. *Tus metas*: meta mensual de volumen (la misma que Perfil) y meta semanal de prácticas.
    4. *Tus primeros pasos*: lista con acceso directo a cada caso de uso.
  - **Primeros pasos (rep):** definir meta, abrir la primera lección, practicar con el AI Coach, registrar el día en Goal Sheet, escribir el feedback post-tour en Smart Diary. Gerentes y admin suman su caso propio (revisar equipo / configurar acceso y planes).
  - **Avance automático:** cada paso se marca solo al hacerlo de verdad (meta guardada, lección abierta, mensaje enviado al coach o práctica enviada, registro en Goal Sheet, nota en el diario).
  - **Después de la guía:** tarjeta «Primeros pasos» en Home con avance y el siguiente paso; se puede ocultar.
  - **Omitir:** botón «Omitir guía» en cada pantalla; cierra y no vuelve a abrirse sola.
  - **Siempre disponible:** tarjeta «Guía de inicio» en Perfil (ver la guía y volver a mostrar los primeros pasos en Home).
- **Hecho cuando:** en el navegador, un usuario nuevo ve la guía al entrar a Home una sola vez; puede omitirla; su meta queda guardada; los pasos se marcan al usarlos; la tarjeta de Home se oculta; Perfil la vuelve a abrir.

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| 1 | ¿Dónde vive el acceso permanente? | Perfil (tarjeta «Guía de inicio»), además de la tarjeta de Home mientras no se oculte. El PO delegó la decisión de UX. | Respondida |
| 2 | ¿Se recuerda por cuenta o por dispositivo? | Por cuenta en este dispositivo (`localStorage` por id de usuario), igual que la meta mensual y las notas actuales. Sincronizar entre dispositivos requiere API y queda como siguiente paso. | Respondida (decisión documentada) |

## Intencion

Que cada persona entienda en un minuto para qué sirve la app, fije su meta y pruebe los casos de uso principales en su primera semana.

## Alcance

- Incluye: `guide-model.mjs` (+ prueba), `Guide.jsx`, estilos, `App.jsx` (abrir en Home, marcar lección abierta), `Workspace.jsx` (tarjeta en Home y en Perfil), `Coach.jsx` (marcar práctica).
- No incluye: backend, sincronización entre dispositivos, onboarding previo al inicio de sesión (ya existe).
- Capa: frontend.

## Escalamiento

- [x] Una capa · [x] Sin contrato · [x] Sin esquema · [x] Sin datos sensibles · [x] Sin dependencias · [x] Sin ADR · [x] < 2 días

## Checklist (tests primero)

- [x] T01-test `guide-model.test.mjs`: cuándo se abre sola, pasos por rol, detección de avance, siguiente paso, eventos por pantalla - FALLÓ con módulo vacío.
- [x] T01-impl `guide-model.mjs`.
- [x] T02 `Guide.jsx`, `guide.css`, conexión en App, Perfil y Coach.
- [x] T03 navegador: primera visita, omitir, meta, avance automático, ocultar, reabrir desde Perfil, móvil y escritorio.

## Evidencia

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01 | RED | `node --test frontend/src/pilot/guide-model.test.mjs` (módulo vacío) | `pass 0 fail 4` |
| T01 | GREEN | `node --test frontend/src/pilot/*.test.mjs` | `pass 17 fail 0` |
| T03 | RED | Playwright `guide.mjs` | Fallo de la prueba: «Abrir lección» aparece en la hoja y en la tarjeta de Home (comportamiento correcto); selector acotado a la hoja |
| T03 | GREEN | Playwright `guide.mjs` (390×844 rep nuevo; 1440×900 admin; backend en base temporal) | 15 checks OK, 0 errores JS: se abre sola en la 1.ª visita («Hola, Ana…»); metas guardadas (Home muestra $20,000); «Abrir lección» cierra la hoja y marca el paso; mensaje al coach lo marca; tarjeta «3 de 5 · Siguiente: Registra tu día»; no se reabre al recargar; Ocultar; Perfil la reabre y la vuelve a mostrar; «Omitir guía» persiste; admin ve 7 pasos |
| — | GREEN | `npm run build:web` | `✓ built` |
| T04 | GREEN | `deploy-web.sh 20261116a` + Playwright en vivo (rep demo) | Release `/srv/aisales-release-20261116a` (`assets/pilot-BbSXMpJ7.js`), anterior `20261114c` conservada; guía abre sola «Hola, Chris…», «Omitir guía» persiste, tarjeta en Home y en Perfil, 0 errores JS |

## Decisiones

- **Dónde vive:** hoja sobre Home la primera vez; tarjeta «Primeros pasos» en Home mientras no se oculte; acceso permanente en Perfil («Ver la guía» y «Mostrar en Home»).
- **Por dispositivo:** se recuerda por cuenta en el navegador, igual que la meta y las notas; sincronizar entre dispositivos queda como siguiente paso (requiere API).
- **Avance real, no casillas:** cada paso se marca con la acción (meta del mes, lección abierta, mensaje al coach o práctica enviada, registro en Goal Sheet, nota en Smart Diary, visita a Equipo o Administración).
- **Metas:** la meta mensual es la misma de Perfil (`sa.pilot.goal.<id>`); se suma la meta semanal de prácticas.
- **Insights:** con registros del mes muestra tus valores; sin registros explica cómo se calculan (texto «entre» en vez de «÷», que la fuente dibujaba como «+»).

## TRUST 5

- [x] Tested (17 unit, 15 navegador) [x] Readable (lógica pura en `guide-model.mjs`) [x] Unified (hoja y tokens existentes) [x] Secured (sin datos nuevos al servidor) [x] Trackable (este FTD)

## Siguiente

Publicado. Siguiente posible: sincronizar el estado de la guía entre dispositivos (requiere API).
