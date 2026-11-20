# CP5 · Piloto v5 publicado

**Status:** delivered
**Feature:** pilot-v5
**Date:** 2026-11-20
**Rama:** feature/pilot-v5
**Código de aplicación:** 59210be
**Release:** 20261120-v5
**URL:** https://aisales.softvibes.pro/

## Entrega

App privada EN/ES con Home/KPIs, tours individuales, seguimientos, meta mensual, notas/Diario, calculadoras, Ruta con CMS, video/PDF, permisos y equipo. La cuenta inicial quedó como dueño por confirmación explícita del usuario. El resto de cuentas heredadas se conserva; ninguna demo recibió acceso privado automáticamente.

Las credenciales temporales se almacenaron fuera del repositorio y del sitio, con permisos 600, expiración de 48 h y cambio obligatorio. El smoke verificó login y rol sin cambiar la clave ni crear actividad comercial real. El dueño dispone de 11 lecciones en borrador; videos/PDF reales se cargan y revisan en el CMS antes de publicar.

## Verificación

77 tests backend, 12 modelos frontend, 5 regresiones dominio y 17 recorridos Playwright pasan. Build y gobernanza estricta pasan. VPS HTTP con 20 sesiones y 10 000 tours: Home p95 = 461.84 ms, debajo de 1 s. Migración repetible y restore ensayados; tablas legacy reales preservadas; API privada, cookies, logout y archivos estáticos comprobados en HTTPS. Capturas de bienvenida/login público y flujos sintéticos en evidence.

## Recuperación y conservación

Base actual preservada; snapshot verificado y release anterior retenidos. No restaurar snapshot viejo encima de ventas nuevas: mantener DB actual y usar una versión privada compatible o mantenimiento según operations-runbook. Primer backup diario real restaurado/verificado y copiado a almacenamiento privado fuera del VPS. Cron diario a las 09:30 UTC; retención siete días con limpieza diaria (máximo menor de ocho días). Copia del operador a las 04:45 local mediante launchd cuando el equipo está disponible. Archivos y credenciales no se sirven por nginx.

## Límites de aceptación

La entrega técnica está publicada. No se declara UAT humana, revisión con lector de pantalla ni aprobación editorial de los materiales reales. El zoom nativo al 200% se verificó en bienvenida/login; el resto de layouts tiene evidencia CSS al 200%, móvil 360/390 y escritorio 1440. La reproducción de videos externos depende del material y permisos que configure el dueño. El framework central y los dominios alternativos no fueron modificados.
