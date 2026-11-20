# Plan de pruebas · piloto v5

**Estado:** propuesto, pendiente de aprobación del CP2.
**Fecha:** 2026-11-19 · America/Cancun.
**SPEC:** [cp2-spec.md](cp2-spec.md).
**Historia:** [2026-11-19-pilot-v5.md](../../stories/2026-11-19-pilot-v5.md).
**Responsable:** implementación y QA; aprobación funcional del PO.

Este documento describe pruebas futuras. Las únicas suites de producto ejecutadas durante esta preparación son las dos existentes indicadas en Baseline; también se ejecutan verificadores documentales. No se ha ejecutado el piloto nuevo, creado pruebas nuevas, usado datos reales ni modificado servidores. Los IDs TC-01..TC-24 corresponden uno a uno a AC-01..AC-24 de la historia; los detalles de API y UX se definen en los anexos del SPEC.

## 1. Alcance y prioridad

Entran acceso privado, aislamiento por organización, navegación bilingüe, tours individuales, seis KPIs, metas mensuales, conservación de histórico, Ruta editable y archivos, solicitudes de acceso, panel del dueño, notas privadas, Diario, calculadoras, marca blanca y entrega verificable.

No se prueba como capacidad nueva del piloto: Coach/IA, roleplay, exámenes por módulo, operación de sala, pagos, comisiones, SSO, registro abierto, envío automático de correos, logos/colores por organización, aplicaciones nativas ni guardado sin conexión. Su exclusión del piloto sí se verifica para evitar enlaces o APIs heredadas accesibles indebidamente.

| Riesgo | Prioridad | Evidencia exigida |
|---|---|---|
| Acceso de otra organización o a notas ajenas | P0 | API directa con identidades distintas; no basta ocultar botones |
| Alta/recuperación de demostración activas o acceso revocado que sigue válido | P0 | Rutas heredadas, sesión existente, lista permitida y recuperación |
| Pérdida de un tour al guardar otro o duplicado al reintentar | P0 | Base temporal, concurrencia e idempotencia |
| Cierre/VPG incorrectos por CT/NQ/No Tour o cancelaciones | P0 | Fixtures exactos, paridad frontend/backend y revisión de centavos |
| Archivo privado público o contenido bloqueado entregado al cliente | P0 | Descarga directa y respuesta de API sin permiso |
| Migración destructiva o reversión que pierde registros nuevos | P0 | Ensayo restaurable en copia sintética y recuentos antes/después |
| Inglés incompleto, flujo móvil o calculadora incorrecta | P1 | Navegador temporal, ambas lenguas, teclado y valores de referencia |

## 2. Estrategia por nivel

| Nivel | Herramienta prevista | Alcance |
|---|---|---|
| Unidad de dominio | `node:test` existente y pruebas de dominio Python | KPIs, tipos de tour, importes, fechas, metas y calculadoras |
| Integración | Cliente de pruebas FastAPI existente y SQLite temporal independiente | Autorización, sesiones, transacciones, solicitudes, archivos y migración |
| Modelo UI | `node --test frontend/src/pilot/*.test.mjs` | Selección de idioma, navegación, formularios y estados de guardado |
| E2E | Playwright existente, navegador y perfil temporales | Recorridos vendedor/dueño, móvil/escritorio, errores, autenticación y permisos |
| UAT | PO, datos sintéticos del expediente | Un día completo del vendedor y publicación/apertura de lección por dueño |
| Seguridad | Casos negativos de API y revisión de configuración de release | Ausencia de bypass de rol/organización, demos, tokens públicos y archivos expuestos |
| Recuperación | Ensayo local/ambiente aislado con copia sintética | Respaldo de base y archivos; restauración y versión compatible |
| Rendimiento | Cliente concurrente sobre staging sintético | NFR-08: API de Home/listas p95 menor a 1s con 20 sesiones y 10000 tours, sin proveedores de video |

No se seleccionará una base por defecto sin comprobar su ruta. Cada prueba de integración debe crear su propia base temporal y directorio de archivos; ningún comando de seed/reset se ejecutará sobre una base real. Las fechas se fijan en los tests, en America/Cancun, sin depender del reloj del servidor.

## 3. Casos trazables

| Caso | AC | Escenario y comprobación | Resultado esperado | Datos | Nivel |
|---|---|---|---|---|---|
| TC-01 | AC-01 | Probar correo permitido activo, correo fuera de lista, registro público heredado, acceso invitado y catálogo demo | Solo la identidad autorizada puede iniciar sesión; registro abierto/invitado/demo no dan acceso al piloto; se conserva el mensaje aprobado de alta | DS-01 | Integración + E2E |
| TC-02 | AC-02 | Entrar con contraseña temporal; intentar rutas de negocio antes de cambiarla; recuperar acceso; revocar usuario con sesión abierta | Cambio obligatorio antes de datos privados; recuperación no entrega tokens públicos; credencial/sesión revocada falla en la siguiente petición | DS-01 | Integración + E2E |
| TC-03 | AC-03 | Vendedor y dueño de organización A consultan/alteran IDs de B, incluyendo archivos, metas, tours, solicitudes y lecciones | Ningún dato ni cambio entre organizaciones; rol o `organization_id` enviado por cliente no eleva permisos; notas privadas tampoco son visibles al dueño | DS-01, DS-05, DS-07 | Integración |
| TC-04 | AC-04 | Recorrer bienvenida, guía inicial, Home, navegación inferior, URLs heredadas y recuperación de destino después de login | Solo Home/Route/Resources para vendedor; sin Coach, invitado, Perfil en dock ni referencias a objeciones; guía se puede omitir y reabrir sin enlaces obsoletos | DS-01, DS-09 | E2E + UAT |
| TC-05 | AC-05 | Cuenta nueva abre inglés; cambia a español, recarga y abre otra sesión; revisa vacíos, errores, formularios y formatos | Inglés inicial y preferencia persistida; todos los textos del producto cambian; contenido PDF/video conserva su idioma declarado, sin prometer traducción | DS-01, DS-09 | Modelo UI + E2E |
| TC-06 | AC-06 | Registrar varios tours el mismo día; mezclar Agencia/Socios; editar un tour y recargar | IDs distintos, ninguno sobrescribe otro, canal validado y resumen coherente; no se solicitan prospectos ni fotos de surveys | DS-02 | Integración + E2E + UAT |
| TC-07 | AC-07 | Q sin venta, CT sin venta, CT vendido, NQ vendido, NQ sin venta y No Tour; manipular payload de No Tour con venta/monto | Q efectivos = 3, ventas = 2, neto = USD 3,000 en fixture base; CT/NQ vendidos cuentan una sola vez; No Tour no admite venta/monto | DS-02 | Unidad + integración |
| TC-08 | AC-08 | Calcular seis KPIs, luego sin ventas, sin Q, sin meta y con importes que requieren redondeo | Valores del apartado 4; ningún `NaN`/infinito, redondeo solo para presentación; denominadores o metas ausentes muestran el estado definido en SPEC | DS-02, DS-03 | Unidad + integración + E2E |
| TC-09 | AC-09 | Corregir importe; cancelar NQ vendido; reintentar POST con misma clave; dos actualizaciones concurrentes | Una operación lógica no duplica tour/venta; cancelación recalcula periodo original conservando tipo inicial e historial; conflicto evita pérdida silenciosa de actualización | DS-02 | Integración + unidad |
| TC-10 | AC-10 | Crear meta del mes, repetir simultáneamente, intentar editarla; rechazar meta futura; avanzar reloj al siguiente mes y crear la nueva | Una meta por vendedor/mes; confirmada no cambia; siguiente mes independiente cuando comienza | DS-03 | Integración + E2E |
| TC-11 | AC-11 | Partir de base antigua con registro agregado; ejecutar migración dos veces; comparar datos antes/después | Histórico preservado y solo consulta; no se inventan tours para repartir ventas antiguas; no se mezcla con KPIs nuevos; segunda ejecución no duplica | DS-04 | Integración de migración |
| TC-12 | AC-12 | Dueño crea, edita, reordena, publica y archiva lecciones; vendedor consulta en cada estado; repetir en otra organización | Borradores no aparecen a vendedores, cambios publicados pertenecen a su organización y orden estable; archivar no destruye progreso histórico | DS-01, DS-05 | Integración + E2E + UAT |
| TC-13 | AC-13 | Guardar enlaces válidos YouTube/Vimeo y URL host engañoso; subir PDF válido, exceso de tamaño, MIME falsificado; descargar sin sesión o desde otra organización | Solo proveedores y formatos admitidos; error de validación legible; PDF requiere permiso de la lección; no se aceptan rutas locales ni URL ejecutable | DS-05 | Integración + E2E |
| TC-14 | AC-14 | Completar lección manualmente, repetir, reordenarla y archivarla; consultar progreso | Una finalización por vendedor/lección; no exige examen ni Coach; se conserva evidencia histórica y el porcentaje activo sigue el criterio del SPEC | DS-05 | Integración + E2E |
| TC-15 | AC-15 | Pedir acceso dos veces; dueño ve solicitud y permite acceso individual; otro vendedor sigue bloqueado; abrir paso posterior permitido | Una solicitud pendiente por persona/lección; permiso individual no abre a todos; solicitud avisa en app; no hay bloqueo secuencial ni canje Premium en piloto | DS-01, DS-05, DS-06 | Integración + E2E + UAT |
| TC-16 | AC-16 | Dueño consulta vendedores con/sin tours, progreso y solicitudes; seleccionar distintos periodos | Totales salen de datos reales del periodo/organización; respeta reglas Q/neto; no expone cuerpos de notas ni incluye certificaciones/roleplay fuera de alcance | DS-01, DS-02, DS-05, DS-06 | Integración + E2E |
| TC-17 | AC-17 | Crear/editar/borrar nota; abrir en segundo navegador autenticado; cortar red antes de guardar; reintentar | Persistencia privada en servidor; confirmación solo tras respuesta; muestra aviso de no guardado y mantiene borrador en memoria; no fabrica éxito ni duplica al reintentar | DS-01, DS-07 | Integración + E2E |
| TC-18 | AC-18 | Abrir Diario, responder sus tres preguntas, editar, consultar desde otro dispositivo; inspeccionar llamadas de red | Tres respuestas de texto privadas persistidas; ningún comentario ni petición al Coach/IA; validación y estados sin conexión coherentes | DS-07 | Integración + E2E + UAT |
| TC-19 | AC-19 | Anyway money con caso de referencia, inflación cero, un año y entrada inválida | USD 89,334.24 para 3,000/20/4%; USD 60,000.00 con 0%; errores en límites definidos; no altera metas ni registros | DS-08 | Unidad + E2E |
| TC-20 | AC-20 | Enganche con caso de referencia, tasa cero, enganche completo y valores inválidos | Saldo USD 16,000.00 y mensualidad USD 421.34; a 0%, USD 333.33; solo saldo/mensualidad en salida; sin intereses ni total pagado visibles | DS-08 | Unidad + E2E |
| TC-21 | AC-21 | Dueño cambia nombre/título, introduce caracteres HTML y abre pantallas en ambas lenguas y otra organización | Marca se aplica consistentemente solo a su organización; texto escapado, sin ejecución; no ofrece logo/colores personalizados | DS-01, DS-09 | Integración + E2E |
| TC-22 | AC-22 | Abrir Mi cuenta desde Home, cambiar contraseña, idioma, reabrir guía y cerrar sesión | Funciones conservadas sin Perfil en dock; logout invalida sesión según contrato y no deja datos privados visibles al volver atrás | DS-01, DS-09 | Integración + E2E |
| TC-23 | AC-23 | Teclado y lector/nombres accesibles; móviles 360/390px, escritorio 1440px y zoom real 200%; errores y modal | Sin pérdida de controles ni scroll horizontal de página; foco visible y devuelto al cerrar; campos etiquetados; estados no dependen solo del color; botones alcanzables | DS-02, DS-05, DS-07, DS-09 | E2E + revisión manual |
| TC-24 | AC-24 | Ensayar despliegue/restauración con snapshot sintético, venta posterior, endpoints heredados y archivos; medir Home/listas con 20 sesiones y 10000 tours | Respaldo verificable; reversión conserva ventas nuevas; configuración privada; NFR-08 p95 menor a 1s excluyendo video y evidencia antes de usuarios reales | DS-10 | Integración operativa + rendimiento + manual |

## 4. Datos sintéticos y oráculos

Los datos se proponen para la revisión del PO; no representan cuentas, clientes ni cifras reales. La definición canónica de DS-01..DS-10 vive en la historia. Esta sección explica los resultados esperados y sus bordes.

### DS-01 · Identidades de dos organizaciones

Organizaciones sintéticas `org_alpha` y `org_beta`; dos vendedores activos en A, uno en B, dueños A/B, un vendedor desactivado y un operador: siete identidades operativas, más un correo no permitido sin cuenta. Correos con dominio reservado `.invalid`; contraseñas generadas únicamente durante la prueba y omitidas de logs. Fijar identidad, organización y rol desde el servidor, nunca desde campos elegidos en onboarding.

### DS-02 · Seis tours del mismo vendedor y día

Reloj de prueba fijo en 2026-11-19, America/Cancun. Los seis registros comparten fecha para detectar la antigua limitación de una fila diaria.

| Registro | Tipo original | Resultado | Neto USD | Q efectivo | Venta activa |
|---|---|---|---:|---:|---:|
| tour_01 | Q | No venta | 0 | 1 | 0 |
| tour_02 | CT | No venta | 0 | 0 | 0 |
| tour_03 | CT | Venta | 1,000 | 1 | 1 |
| tour_04 | NQ | Venta | 2,000 | 1 | 1 |
| tour_05 | NQ | No venta | 0 | 0 | 0 |
| tour_06 | No Tour | No aplica | 0 | 0 | 0 |

Importes de almacenamiento esperados: `100000` y `200000` centavos, no números flotantes monetarios. Alternar canales `agency`/`member` en los tours que correspondan al contrato.

Oráculo: Q efectivos = 3; ventas = 2; neto = USD 3,000; cierre matemático = 66.666…%, VPG = USD 1,000; ticket = USD 1,500.

Al cancelar `tour_04`, según la propuesta CP2, NQ deja de contar como Q efectivo y su venta/neto deja de contribuir. Quedan Q = 2, ventas = 1, neto = USD 1,000, cierre = 50%, VPG = USD 500 y ticket = USD 1,000. El importe y tipo originales siguen disponibles en historial autorizado y se recalcula noviembre aunque la cancelación se haga en diciembre. El log de auditoría no copia textos privados ni secretos.

Bordes: conjunto vacío; Q sin ventas; CT/NQ sin ventas; No Tour aislado; No Tour manipulado con importe; número de ventas mayor que uno; monto negativo, inválido o fuera de límite; fecha en cambio de mes; reintento idéntico y reintento con misma clave pero contenido distinto.

### DS-03 · Presupuesto y cierre objetivo

Meta mensual: presupuesto de neto USD 6,000, cierre objetivo 50%. Para DS-02:

| KPI | Esperado visible |
|---|---:|
| Cierre | 66.67% |
| VPG | USD 1,000.00 |
| Ticket promedio | USD 1,500.00 |
| Cumplimiento | 50.00% |
| Diferencia contra presupuesto | −USD 3,000.00 |
| Diferencia de cierre | +16.67 pp |

Después de cancelar el NQ vendido: cumplimiento 16.67%, diferencia −USD 5,000.00 y diferencia de cierre 0.00 pp. Una meta inexistente o denominador cero debe mostrar la ausencia de referencia definida en CP2, nunca hacerse pasar por un resultado medido de cero. No se prorratea el presupuesto mensual automáticamente para vistas diarias/semanales sin regla explícita del SPEC.

### DS-04 · Histórico agregado

Una fila legacy de vendedor/fecha con dos ventas, USD 5,600 y nota sintética, acompañada de identidad y progreso existente de pasos. Calcular un resumen/checksum antes del ensayo; preservar campos, fechas e IDs originales, y ejecutar la migración dos veces. No fabricar diez tours Q ni repartir las dos ventas entre tours nuevos a partir de esa fila. Los casos de otra organización reutilizan identidades DS-01 sin alterar este oráculo.

### DS-05 · Lecciones y archivos

Una Ruta inicial de once borradores, tres con permiso abierto y ocho cerrado como configuración de arranque; una lección nueva creada por el dueño. En el fixture aislado se publican algunas con material sintético y se archiva otra; no se publica contenido ficticio en producción. Simular URLs YouTube/Vimeo sin hacer solicitudes de red a videos reales. Usar PDF sintético válido y variantes vacía, corrupta, firma/MIME discordante, nombre de archivo con ruta y tamaño inmediatamente superior a 10 MiB. Probar URL con host similar al permitido, `javascript:`, localhost y red privada; ningún caso debe activar una descarga arbitraria desde servidor.

### DS-06 · Solicitudes

Dos vendedores piden la misma lección; uno repite su petición. Verificar dos solicitudes distintas, no tres; concesión individual, rechazo y estado después de revocación. Las notificaciones son internas y no deben disparar correos/WhatsApp no contemplados en el contrato.

### DS-07 · Notas y Diario

Notas sintéticas con caracteres especiales y una edición concurrente; Diario con tres respuestas y caso vacío. Dos contextos de navegador de la misma cuenta y otra cuenta diferente. El corte de red ocurre antes del envío y después de un guardado de resultado incierto para verificar reintentos sin duplicación. Probar contenido HTML como texto, sin ejecución.

### DS-08 · Calculadoras

Anyway money: gasto inicial anual A = 3,000; años n = 20; inflación g = 0.04. Suma A × (1 + g)^k para k de 0 a 19 = **89,334.2357275…**, mostrado **89,334.24**. Con inflación 0: A × n = 60,000. Con n = 1: 3,000.

Enganche: precio 20,000; porcentaje 20%; saldo P = 16,000; tasa nominal anual 12%; tasa mensual r = 0.01; plazo n = 48. Mensualidad P × r / (1 − (1 + r)^−n) = **421.3413669…**, mostrada **421.34**. Si r = 0: P / n = **333.33** mostrado. Con enganche 100%, saldo y mensualidad 0 si ese límite está admitido en CP2. Validar plazo entero positivo y porcentaje en rango; jamás mostrar infinito o `NaN`.

### DS-09 · Idiomas, marca y cuenta

Nombres sintéticos diferentes por organización y títulos de bienvenida EN/ES según modelo de CP2. Textos cortos/largos, caracteres acentuados, nombre con etiquetas HTML, vistas sin datos, validaciones de formulario y errores de red. Preferencia de idioma guardada y guía omitida/reabierta. Ninguna prueba debe exigir traducción automática de material aportado por el dueño.

### DS-10 · Release y reversión

Snapshot sintético con usuarios, tours, notas, metas, permisos, progreso y PDFs. Manifestar versiones y hashes de archivos de prueba; comprobar restauración en directorio/base separados. Incluir una venta creada después del snapshot para demostrar que volver a un release no equivale a restaurar destructivamente una base antigua. La política de reversión de datos queda gobernada por el plan de migración aprobado.

## 5. Protocolo TDD y regresión

1. Tras aprobación CP2 y gate de historia LISTA, convertir cada TC en su par `Txx-test` / `Txx-impl` del plan CP3.
2. Ejecutar primero la prueba nueva y registrar el fallo por comportamiento ausente, no por error de sintaxis, importación o ambiente.
3. Implementar hasta que pase la misma expectativa; luego ejecutar regresión de las capas afectadas.
4. Registrar comando, salida observada, commit y fixture en `cp4-validation.md`, con filas RED y GREEN.
5. No etiquetar el baseline de abajo como GREEN del piloto v5: no verifica el contrato nuevo.

Hay pruebas existentes que afirman reglas anteriores: once pasos fijos, CT sin venta como Q, ausencia de canal y notas locales. Deben conservarse como pruebas del modo anterior donde corresponda, o cambiar con una decisión trazada al CP2. No se cambiará su expectativa silenciosamente para hacer pasar una implementación equivocada. Las APIs heredadas que no deban estar disponibles en piloto requieren pruebas de denegación, no solo retiro de su UI.

## 6. Entrada, salida y evidencia

**Entrada a implementación:** historia y diseño aprobados, CP2 vigente, contratos de datos/API alineados, datos de prueba validados por PO, base/archivos temporales identificados.

**Salida para UAT:** TC-01..TC-24 ejecutados donde corresponda; cero fallos P0/P1; paridad de fórmulas; build web exitoso; recorrido vendedor/dueño en inglés y español; cero errores JS nuevos; archivos y notas inaccesibles a terceros; migración y restauración ensayadas. Lo no ejecutado se marca pendiente/bloqueado, nunca aprobado.

**Salida para activar piloto:** UAT de negocio, contenido publicado por dueño y revisión del inglés, host/configuración oficial revisados, respaldo/restauración comprobados y cuentas demo deshabilitadas en ese ambiente. Las credenciales y contenidos privados no se adjuntan a la evidencia.

**Carpeta de evidencia:** `work/features/2026-11-19-pilot-v5/evidence/`. Guardar resultados sanitizados, capturas de datos sintéticos, manifiesto de versión y reporte de migración. Un screenshot no sustituye la prueba de autorización en servidor.

## 7. Baseline ejecutado · 2026-11-19

Solo suites existentes, sin navegador, backend, datos reales ni llamadas a producción:

| Comando | Salida observada | Evidencia | Alcance |
|---|---|---|---|
| `npm test` | 5 pruebas, 5 pasan, 0 fallan; exit 0 | [baseline-domain.txt](evidence/baseline-domain.txt) | Dominio anterior |
| `node --test frontend/src/pilot/*.test.mjs` | 17 pruebas, 17 pasan, 0 fallan; exit 0 | [baseline-ui.txt](evidence/baseline-ui.txt) | Modelos UI anteriores |

**Limitación:** resultado de regresión inicial, no evidencia de implementación ni aprobación del piloto v5. No se ejecutó build ni se comprobó el estado de los VPS durante esta preparación.

## Aprobación registrada · 2026-11-20

El PO aprobó el contrato v1 y sus anexos: «lo apruebo y porfa crea otra rama para desarrollar e implementar esto y cuando termines publicalo». Las marcas de propuesta anteriores conservan el origen de las decisiones; su estado vigente es aprobado. Rama de ejecución: `feature/pilot-v5`.
