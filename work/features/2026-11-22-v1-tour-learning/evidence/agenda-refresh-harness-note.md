# Diagnóstico del test de carga en producción

No se modificó producto, API, build ni la expectativa de geometría.

- `agenda-refresh-live-first-run.json/txt`: conserva el fallo inicial de la comprobación de aviso. No lograba ver **Actualizando…**.
- `agenda-refresh-live-diagnostic.json/txt`: repetición instrumentada en ambos temas. El worker `/sw.js` estaba activo y controlaba la página. El dashboard respondió 200, `fromServiceWorker:false`, pero `pendingDashboard:0`: el interceptor de Playwright no retuvo la petición. El aviso desapareció normalmente antes de medirlo.
- La fuente del worker confirma que las APIs usan red; no se atribuye el fallo a datos guardados en caché. La interacción de WebKit con el cliente controlado impedía a este test interceptar la respuesta.
- Se configuró `serviceWorkers:'block'` únicamente en `verify-agenda-refresh.cjs`, que necesita demorar una respuesta real. La matriz pública principal mantuvo el worker normal y ya había pasado 13 verificaciones y 14 capturas con Hermes real.
- `agenda-refresh-live.json/txt`: comparación final GREEN 2/2, dark/light. Workercontroller nulo, `pendingDashboard:1`, aviso visible mientras el dashboard real espera. Documento 844 y navegación bottom 844 dentro de viewport 844; también cabe cuando se libera la respuesta.

Se crearon únicamente visitas sintéticas propias en la cuenta pública de demostración. Cada ejecución eliminó sólo sus UUID y cerró sesión/contexto en `finally`. Después de los dos casos finales no se amplió la QA ni se hicieron cambios remotos.
