# CP2 · SPEC del piloto v5

**Status:** approved
**Version:** v1
**Feature:** pilot-v5
**Product:** Sales Academy
**Date:** 2026-11-19
**Aprobación CP2:** Roger aprobó v1 el 2026-11-20: «lo apruebo y porfa crea otra rama para desarrollar e implementar esto y cuando termines publicalo». Incluye implementación y publicación.

## 1. Problema y objetivo

La versión actual no representa varios tours diarios y mantiene flujos públicos/IA ajenos al piloto. Se entregará una app privada, bilingüe, con registro de resultados por vendedor y contenido administrado por organización. Se preserva la identidad visual de `designpiloto` y la referencia Stitch `11832430028020238900`.

## 2. Decisiones propuestas para aprobar juntas

Todas las filas son **Propuesto IA** donde completan algo no definido por el resumen.

| ID | Decisión v1 | Motivo y límite |
|---|---|---|
| D-01 | `aisales.softvibes.pro` como dominio principal del piloto | Mantiene el destino con publicación documentada. No cambiar DNS ni el dominio alternativo sin preflight y plan concreto. |
| D-02 | Alta manual por operador; contraseña temporal privada y cambio obligatorio | Sin invitado, códigos de invitación, registro abierto ni correo transaccional nuevo. Recuperación por operador. |
| D-03 | Organización y roles vendedor/dueño/operador; una organización activa por cuenta | Aislamiento básico ahora; subperfiles avanzados y multi-organización simultánea quedan después. Ninguna promoción automática de gerente a dueño global. |
| D-04 | Un registro por tour, varios por fecha, sin prospectos | Fecha de negocio en Cancún y canal Agencia/Socios. Preservar Q/CT/NQ/No Tour original. |
| D-05 | Una venta activa por tour; monto neto USD capturado directamente en centavos | No calcular bruto/impuestos/descuentos implícitos. Cancelación excluye venta y neto y recalcula el período original; conservar auditoría. CT/NQ cancelado deja de aportar Q efectivo; Q original continúa siendo Q. |
| D-06 | Seis KPIs originales; presupuesto = meta de volumen neto mensual | Cierre objetivo mensual separado y opcional. No promediar porcentajes de vendedores. |
| D-07 | Goal Sheet mensual independiente de Mi día; una captura definitiva por usuario/mes | Vista previa antes de confirmar. Sin edición autoservicio después de confirmar; crear la siguiente meta el mes siguiente. Correcciones excepcionales se documentan y requieren decisión explícita posterior. |
| D-08 | Ruta editable, sin candado secuencial | El dueño configura acceso general a una lección y excepciones por vendedor. 1–3 abiertos/4–11 cerrados es solo semilla inicial, aplicada una vez. |
| D-09 | “Quiero acceso” genera solicitud individual y aviso dentro de la app | Deduplicada; no envía correos ni WhatsApp. El dueño puede conceder acceso al solicitante; cambios generales se hacen por separado. |
| D-10 | Notas, Diario y metas en servidor; notas personales hasta eliminación | Sin datos de prospectos ni importación automática de notas antiguas. Sin guardado offline; borrador en memoria hasta confirmación. El dueño no lee notas/Diario de vendedores. |
| D-11 | English por defecto, Español disponible; nombre de app y título A01 EN/ES editables | Antes del login se usa marca genérica; después, la organización autenticada. Copy propuesto: “Learn your sales route, track your day, and work toward your goals.” / “Aprende tu ruta de venta, registra tu día y avanza hacia tus metas.” Idioma de UI no traduce videos/PDF. |
| D-12 | Registros antiguos separados, en consulta; sin inventar tours | Las filas históricas agregadas no se mezclan en KPIs nuevos. Conservar tablas y archivos previos. La migración se valida con datos sintéticos y respaldo restaurable. |

El contenido real en inglés y su responsable editorial pueden incorporarse después del desarrollo, pero deben validarse antes del piloto. El agente no fabricará material como si fuera aprobado por el dueño.

## 3. Requisitos funcionales

Cada REQ corresponde al AC del mismo número en la [historia](../../stories/2026-11-19-pilot-v5.md) y TC del mismo número en el [plan de pruebas](test-plan.md).

| ID | Comportamiento requerido |
|---|---|
| REQ-01 | Admitir solo cuentas activas autorizadas; impedir invitado, registro abierto, catálogo demo y recuperación pública con token en el despliegue piloto. |
| REQ-02 | Obligar cambio de contraseña temporal, limitar intentos y revocar todas las sesiones al retirar acceso o recuperar la cuenta. |
| REQ-03 | Aplicar aislamiento por organización y propietario en servidor para cada lectura/escritura y descarga. |
| REQ-04 | Mostrar solo Home/Route/Resources al vendedor; retirar Coach/IA/objeciones y actualizar ambas guías de inicio. |
| REQ-05 | Ofrecer EN/ES funcional y persistente; inglés inicial; mensajes y validaciones traducidos. |
| REQ-06 | Crear, listar y corregir tours individuales con fecha, canal y tipo; guardar varios el mismo día sin sobreescritura. |
| REQ-07 | Aplicar conversión efectiva CT/NQ vendido a Q y reglas No Tour; seguimiento disponible únicamente con venta activa. |
| REQ-08 | Calcular los seis KPIs en servidor y mostrar el mismo resultado en Home y equipo. |
| REQ-09 | Evitar duplicados por reintento, detectar ediciones concurrentes y auditar correcciones/cancelaciones sin filtrar contenido privado. |
| REQ-10 | Guardar una meta mensual por vendedor, única y definitiva, independiente de los tours. |
| REQ-11 | Preservar histórico agregado separado, con etiquetas claras y sin conversión inferida. |
| REQ-12 | Permitir al dueño crear, editar, ordenar, publicar y archivar lecciones de su organización. |
| REQ-13 | Reproducir enlaces permitidos YouTube/Vimeo y servir PDF subidos con autorización; no aceptar HTML/embed arbitrario. |
| REQ-14 | Completar lecciones manualmente sin examen ni orden obligatorio; conservar historial y progreso al reordenar. |
| REQ-15 | Registrar solicitudes de acceso por vendedor/lección; resolverlas sin duplicar avisos ni revelar lecciones privadas. |
| REQ-16 | Mostrar al dueño métricas y progreso por vendedor, además de solicitudes de su equipo. |
| REQ-17 | Crear, editar y eliminar notas privadas persistentes, con confirmación real del servidor y aviso de fallo/offline. |
| REQ-18 | Guardar Diario privado con tres respuestas de texto, sin IA, separado de Notebook. |
| REQ-19 | Calcular Anyway money con gasto anual, años e inflación modificables, incluyendo inflación cero. |
| REQ-20 | Calcular saldo y mensualidad con precio, enganche, tasa y plazo; mostrar solo esas dos salidas. |
| REQ-21 | Aplicar nombre de app y título de bienvenida de la organización sin cambiar logo/colores ni aceptar marcado HTML. |
| REQ-22 | Conservar Mi cuenta desde Home para idioma, contraseña, cerrar sesión y reabrir guía; sin Perfil en el dock. |
| REQ-23 | Operar en móvil/escritorio, teclado, lectores de pantalla y zoom, con estados de carga/error/vacío explícitos. |
| REQ-24 | Entregar pruebas, revisión de acceso, migración reproducible, respaldo/restauración y plan de despliegue reversible. |

## 4. Fórmulas y comportamiento de datos

`Q efectivos = Q originales + CT con venta activa + NQ con venta activa`. Cada tour aporta como máximo una unidad. No Tour no aporta Q, ventas ni volumen y no admite seguimiento. CT/NQ sin venta aportan cero. La clasificación original no se reescribe.

| KPI | Fórmula | Sin datos o referencia |
|---|---|---|
| Cierre (%) | ventas activas / Q efectivos × 100 | Q=0: `—`, no 0% ficticio |
| VPG | volumen neto activo / Q efectivos | Q=0: `—` |
| Ticket promedio | volumen neto activo / ventas activas | ventas=0: `—` |
| Cumplimiento (%) | volumen neto del mes / presupuesto mensual × 100 | sin meta: `—`; presupuesto debe ser mayor a cero |
| Diferencia contra presupuesto | volumen neto del mes − presupuesto mensual | sin meta: `—`; conservar signo |
| Diferencia de cierre (pp) | cierre real mensual − cierre objetivo mensual | sin objetivo o Q=0: `—`; no confundir pp con variación porcentual |

Cierre/VPG/ticket pueden filtrar hoy/semana/mes; las tres comparaciones de presupuesto se identifican siempre como mensuales, incluso al cambiar el filtro de actividad. Semana empieza lunes en America/Cancun. Comparaciones sin prorrateo implícito. Fechas futuras no se aceptan para resultados; permitir corrección de fechas pasadas registrando auditoría. La meta solo se crea en el mes actual; el caso de prueba de diciembre avanza el reloj simulado antes de crearla.

No Tour representa una entrada individual y puede convivir con otros registros de la misma fecha; su canal es opcional. Se conservan las etiquetas Q/CT/NQ sin inventar su expansión. El máximo propuesto de neto por venta es USD 1 millón y de presupuesto mensual USD 100 millones. PDF: 10 MiB por archivo; descarga privada, sin visor incrustado en el origen de la app.

USD con precisión de centavos, porcentajes/pp con dos decimales, sin redondear acumulados antes del cálculo final. Inicio de mes, año y zona horaria son parte del contrato de pruebas. Montos negativos, NaN y valores infinitos se rechazan.

**Fixture verificable:** Q sin venta + CT sin venta + CT vendido USD 1,000 + NQ vendido USD 2,000 + NQ sin venta + No Tour = 3 Q efectivos, 2 ventas, USD 3,000 netos, cierre 66.67%, VPG USD 1,000, ticket USD 1,500. Meta USD 6,000 y cierre objetivo 50% producen 50% de cumplimiento, −USD 3,000 y +16.67 pp.

**Anyway money:** suma de gasto anual × (1 + inflación)^año para año 0 hasta años−1. USD 3,000, 20 años, 4% = USD 89,334.24. Inflación cero = gasto × años. Propuesta de límites: gasto positivo hasta USD 10 millones, años enteros 1–50, inflación 0–30%.

**Enganche:** saldo = precio × (1 − enganche/100). Tasa mensual = tasa nominal anual/12. Mensualidad amortizable estándar con pagos al fin de mes; tasa cero = saldo/meses. Precio USD 20,000, enganche 20%, tasa 12%, 48 meses = saldo USD 16,000; mensualidad USD 421.34. Límites propuestos: precio positivo hasta USD 100 millones, enganche 0–100%, tasa anual 0–100%, meses enteros 1–600. Sin comisiones, seguros ni cargos implícitos. No mostrar intereses acumulados ni total pagado; etiquetar estimación.

## 5. Diseño y contratos

- [UX y mapa de pantallas](ux-spec.md): propuesta de diseño textual usando los componentes existentes.
- [Backend y datos](contracts-backend.md): contrato propuesto de API, permisos, archivos y migración.
- [ADR](adr-001-pilot-boundary.md): separación del piloto y política de históricos.
- [Threat model](threat-model.md): autenticación, aislamiento, archivos y revocación.

Si un anexo contradice CP2, se corrige antes de aprobar; no se implementan dos variantes. Cambios posteriores al contrato se versionan y se explican por comportamiento afectado.

## 6. Requisitos no funcionales y Seguridad

| ID | Requisito verificable | Evidencia prevista |
|---|---|---|
| NFR-01 | Cero accesos cruzados entre dos organizaciones o notas de dos vendedores en la matriz de endpoints | Tests de integración negativos y de descarga |
| NFR-02 | No contraseñas/tokens/textos privados en logs, respuestas públicas, bundles ni repositorio | Pruebas de respuestas y revisión de release |
| NFR-03 | Mutaciones con idempotencia/revisión y confirmación del servidor; cero falsas confirmaciones al perder red | Integración concurrente + E2E offline |
| NFR-04 | Navegación por teclado, foco restaurado en diálogos, etiquetas, contraste 4.5:1 en texto normal; sin desbordamiento a 360/390/768/1440px ni zoom 200% | QA visual y accesibilidad con fixtures |
| NFR-05 | UI completa EN/ES, preferencias persistentes y errores localizables por código | Inventario de textos y E2E ambos idiomas |
| NFR-06 | PDFs privados fuera del webroot, límites explícitos, sin ejecutar HTML/script ni recuperar URLs arbitrarias desde servidor | Pruebas de MIME/tamaño/IDOR/ruta |
| NFR-07 | Migración repetible y respaldo restaurado en entorno aislado antes de publicación | Comparación de conteos/checksums y smoke de restauración |
| NFR-08 | Home y listas paginadas: objetivo API p95 menor a 1s con 20 sesiones concurrentes y 10,000 tours sintéticos, excluyendo proveedores de video | Medición en staging; no afirmación de capacidad actual |

La edición de cuentas y recuperación pertenecen al operador, no al dueño. Notas/Diario no se exponen en Mi equipo ni en auditorías de contenido. Sesiones privadas mediante cookie HttpOnly, Secure en HTTPS, SameSite y defensa CSRF para mutaciones. No sembrar cuentas demo al arrancar en modo piloto.

## 7. Capas y RACI

Capas observadas: frontend React/Vite, backend FastAPI, datos SQLite, dominio JavaScript y despliegue web existente. No incluye cambios a Expo.

PO: accountable de alcance y UAT. Agente/equipo: responsable de implementación, pruebas y documentación. Operador autorizado: responsable de cuentas y release. Dueño: responsable de cargar y aprobar material. La asignación concreta del revisor de inglés queda pendiente para el arranque, no se atribuye sin confirmación.

## 8. Riesgos y entrega

El mayor riesgo es interpretar el histórico como tours individuales o reutilizar Admin como dueño sin aislamiento. El contrato los evita explícitamente. Los 33 CR originales no están disponibles: este contrato permite avanzar con el resumen y registra esa limitación.

El dominio alternativo no se migra ni se redirige como efecto implícito. Antes del despliegue se hará inventario de releases/datos, backup y prueba de restauración. Si la infraestructura diverge, se presentará el plan concreto sin sobrescribir servicios ajenos.

## 9. Criterios de aceptacion y pruebas

AC-01 a AC-24 están escritos en formato Dado/Cuando/Entonces en la historia. TC-01 a TC-24 describen los escenarios, fixtures y resultados. Los pares Txx-test/Txx-impl se proponen en el plan preliminar, sin evidencia de ejecución nueva todavía.

## Gate CP2 → CP3

- [x] Alcance, necesidades, REQ y NFR identificados.
- [x] Decisiones antes abiertas convertidas en propuestas revisables.
- [x] Contratos, privacidad, migración y experiencia especificados.
- [x] Criterios, escenarios y datos simulados preparados.
- [x] Aprobación del PO del paquete v1 y diseño textual.
- [x] Historia LISTA y gate verify-story aprobado el 2026-11-20.

**No se declara aprobación por silencio ni se reutiliza la del contrato anterior de planes Gratis/Premium.**

## Decisión operativa de retención — 2026-11-20

El usuario seleccionó «7 días de respaldos diarios (recomendado)» mediante respuesta a la consulta de retención. Actividad conservada después del piloto; notas/Diario hasta eliminación del autor. Limpieza diaria por antigüedad de siete días (límite efectivo menor de ocho días entre ejecuciones); incluye copias privadas del operador.
