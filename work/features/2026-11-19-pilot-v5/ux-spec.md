# UX aprobada — Piloto Sales Academy v5

**Fecha:** 2026-11-19, America/Cancun
**Estado:** aprobado por el PO en CP2 v1 el 2026-11-20.
**Alcance:** experiencia web responsive del piloto autorizada para implementación y publicación.
**Documento de origen:** `/Users/rogergv/Downloads/resumen-completo-proyecto.html`, corte del 18 nov 2026, 19:25, Cancún.
**Referencia de diseño:** [Stitch 11832430028020238900](https://stitch.withgoogle.com/projects/11832430028020238900), 43 frames A–H, y componentes actuales de `frontend/src/pilot/`.
**Contrato rector:** `cp2-spec.md` de esta feature. Esta propuesta describe interacción, presentación y estados; no define endpoints nuevos de manera independiente.

El HTML es un resumen de decisiones de producto. No incluye los 33 CR detallados, sus criterios de aceptación ni los archivos fuente citados de `/workspace/sales-academy/`. No se afirma haberlos revisado. La interpretación siguiente se presenta al PO como un contrato concreto y sustituye referencias de diseño incompatibles únicamente después de aprobar CP2.

## 1. Experiencia que se propone

El vendedor inicia sesión con una cuenta habilitada, registra cada tour en **My day / Mi día**, consulta sus resultados, completa lecciones y utiliza recursos de trabajo. El dueño administra contenido y permisos de su academia y ve resultados de su equipo. El piloto no ofrece Coach, respuestas de IA, entrenamiento de objeciones, planes de compra ni operación de sala.

Se conserva la base visual actual: DM Sans, superficies oscuras, acento verde, tarjetas compactas, cabecera y dock. La referencia Stitch sirve para conservar jerarquía y continuidad; no obliga a conservar textos, rutas, contadores fijos ni funciones que salen del piloto. Las ilustraciones y etiquetas que presentan un AI Coach se sustituyen por una composición tipográfica y elementos de aprendizaje sin prometer IA.

### Navegación del vendedor

- Dock con exactamente **Home / Inicio**, **Route / Ruta**, **Resources / Recursos**, en ese orden.
- Home contiene acceso visible a **My day / Mi día**, **Monthly goal / Meta mensual** y **My account / Mi cuenta**.
- Mi cuenta es un modal o sheet desde Home: identidad, cambiar contraseña, idioma, repetir guía y cerrar sesión. No existe Perfil como cuarto módulo.
- Recursos contiene cuatro entradas: **Goal Sheet**, **Calculators / Calculadoras**, **Journal / Diario**, **Notebook**. Goal Sheet abre la misma meta mensual de Home; nunca crea una segunda fuente de metas.
- Volver conserva filtros, periodo seleccionado y posición cuando sea posible. El dock no cubre formularios, mensajes ni botones, incluso con el teclado móvil abierto.

### Navegación del dueño

El mismo login determina el rol desde el servidor. El dueño entra a su espacio con **My roadmap / Mi roadmap** y **My team / Mi equipo**; Mi cuenta queda disponible en cabecera. Desde Mi roadmap puede ver una vista previa de vendedor con indicación persistente de que es una vista previa. Salir de ella devuelve al espacio del dueño.

La elección de perfil en onboarding explica el acceso, pero nunca concede roles. El vendedor no ve administración ni compra de licencia. Si abre una URL de dueño, se verifica autorización y vuelve a Home; no se le descarga contenido administrativo. No se crea en el piloto el subperfil futuro de administrador de organización que asigna coaches.

## 2. Idioma, identidad y formato

- Primera visita en **English**. Selector **English / Español**, con estado accesible y acción real.
- La elección previa en el dispositivo se respeta al entrar. Después del login se usa la preferencia guardada de la cuenta, si existe, y cualquier cambio se persiste para esa cuenta. La ausencia de preferencia nunca fuerza español por el idioma del navegador.
- Cambiar idioma actualiza navegación, campos, errores, estados vacíos, ayudas, fórmulas, notificaciones y nombres accesibles. No recarga ni pierde un borrador.
- Documentos PDF, títulos de lecciones y videos del dueño mantienen el idioma original; el selector traduce la interfaz, no promete traducir contenido.
- Dinero siempre identificado como **USD**, con dos decimales en resultados monetarios. Se admiten formatos de entrada correspondientes al idioma y se normalizan antes de validar; no se interpreta silenciosamente `1,500` como un valor distinto al que muestra la revisión.
- Métricas porcentuales con dos decimales y diferencias de cierre en **pp**. El separador visual se adapta al idioma; los cálculos usan valores sin redondeo intermedio.
- Fecha operativa y mes en America/Cancun; la semana comienza el lunes. Las fechas se muestran sin ambigüedad; periodos y subtítulos explicitan qué se está comparando.
- Marca blanca v1: solo **nombre de la app** y **título principal de bienvenida A01**. Nombre único de 1–60 caracteres; título EN de 1–140 y variante ES opcional de 1–140. Si falta ES, se conserva el título EN y se indica su idioma; no se inventa traducción. Después de autenticar, la organización real de la cuenta determina la marca de cabecera, el título de página y la bienvenida de la guía.
- Antes del login se muestra exclusivamente la marca y bienvenida genéricas de la plataforma. No se busca la academia por correo, no se muestran nombres de organizaciones por escribir una dirección y no se recuerda una organización anterior para personalizar el acceso público. En este piloto no se añade una URL pública de academia ni un selector de organización; A01 configurable se utiliza con contexto de cuenta autenticada, incluida la bienvenida al reabrir la guía.
- Logo, colores, dominios por academia, textos comerciales y mascota personalizados quedan fuera. Los límites de longitud definidos en CP2 se reflejan en el formulario con contador y vista previa.

## 3. Acceso y primera visita — A

### A01–A04: bienvenida y orientación

1. A01 pública muestra nombre y título genéricos de plataforma y dos acciones: **Get started / Comenzar** y **Sign in / Iniciar sesión**. La variante autenticada de bienvenida usa nombre/título A01 de su organización. No muestra acceso invitado, registro público, Google ni Apple.
2. A02 explica en tres frases la propuesta: aprender la Ruta, registrar la jornada y consultar Recursos. No menciona IA ni objeciones.
3. A03 ofrece vendedor, gerente y dirección como orientación. Gerente o dirección muestra la explicación de acceso del dueño y permite volver o iniciar sesión con una cuenta ya habilitada. No concede acceso ni ofrece compra.
4. A04 permite escoger Ruta o Recursos. La elección se conserva como destino después de autenticar; no abre datos protegidos antes del login.

### A05–A07: cuenta habilitada, cambio inicial y recuperación

- El operador crea la cuenta en la lista permitida y entrega la contraseña temporal fuera de la app. No hay formulario para autoasignarse dueño ni para crear una cuenta pública.
- A05 se reutiliza como **Set your password / Define tu contraseña** después de validar credenciales temporales. El cambio es obligatorio antes de acceder a Home, Ruta o Recursos. Tiene contraseña nueva, confirmación, mostrar/ocultar, requisitos y errores junto al campo. Una vez confirmada por servidor, continúa al destino permitido.
- A06 usa correo y contraseña. Enter envía; el estado de envío impide doble submit. El control mostrar contraseña tiene nombre accesible y no modifica su valor.
- El mensaje previsto para correo fuera de la lista es el acordado en el resumen. No ofrece registro ni solicita código de invitación. El error de contraseña no revela datos del equipo ni de la cuenta.
- A07 explica recuperación mediante el operador autorizado de la academia. No genera ni devuelve un token público, no muestra una contraseña y no promete un correo automático. El contacto mostrado proviene de la configuración real; sin contacto configurado se indica pedir ayuda al gerente.
- Después de autenticarse, el destino se autoriza por rol. Los hash o links recibidos del cliente no sustituyen esa verificación.
- La guía de primera visita ofrece aprender una lección, registrar un tour y definir la meta; puede omitirse y reabrirse desde Mi cuenta. La guía nunca escribe ejemplos en la cuenta real.
- No se agregan consentimientos comerciales, contactos externos ni aceptación obligatoria de marketing a estos flujos. Los avisos mínimos de privacidad corresponden al contrato de cuenta y no bloquean tareas mediante consentimientos ajenos al piloto.

| Situación | English propuesto | Español propuesto |
|---|---|---|
| Título de bienvenida por defecto | Your next sale starts here. | Tu próxima venta empieza aquí. |
| Texto de apoyo A01 | Learn your sales route, track your day, and work toward your goals. | Aprende tu ruta de venta, registra tu día y avanza hacia tus metas. |
| Explicación A02 | Your lessons, results, and tools in one place. | Tus lecciones, resultados y herramientas en un lugar. |
| Acceso del dueño | Sales Academy provides owner access. Contact us. | Tu acceso de dueño te lo da Sales Academy, escríbenos. |
| Correo fuera de lista | This email does not have access yet. Ask your manager to add you. | Este correo no tiene acceso todavía. Pídele a tu gerente que te dé de alta. |
| Contraseña temporal | Set your password to continue. | Define tu contraseña para continuar. |
| Recuperación | Ask your academy administrator to restore your access. | Pídele al administrador de tu academia que restablezca tu acceso. |
| Sesión expirada | Your session expired. Sign in again to continue. | Tu sesión venció. Inicia sesión de nuevo para continuar. |

## 4. Home, Mi día y metas — B / E05 / E06

### Home con seis KPI

La cabecera muestra saludo, idioma y Mi cuenta. Después aparecen: periodo, meta mensual, seis tarjetas KPI, contexto de tours/ventas/volumen, accesos Mi día y Ruta y seguimientos pendientes. Los KPI siempre tienen espacio visible, aun sin datos; no se sustituyen por recomendaciones del Coach.

| KPI | Cálculo y presentación | Estado sin base de cálculo |
|---|---|---|
| Closing rate / Cierre | Ventas ÷ tours Q efectivos × 100; `%`. | `—` y “No qualified tours yet / Aún no hay tours Q”. |
| VPG | Volumen neto USD ÷ tours Q efectivos. | `—` si no hay tours Q. |
| Average sale / Ticket promedio | Volumen neto USD ÷ ventas. | `—` si no hay ventas. |
| Budget attainment / Cumplimiento del presupuesto | Resultado neto mensual ÷ presupuesto de volumen mensual × 100. | `—` y “Set a monthly goal / Define tu meta mensual”. |
| Variance to budget / Diferencia contra presupuesto | Resultado neto mensual − presupuesto de volumen mensual; signo y USD. | `—` sin presupuesto. |
| Closing variance / Diferencia de cierre | Cierre real mensual − cierre objetivo mensual; signo y pp. | `—` si falta objetivo o tours Q mensuales. |

El selector **Today / Week / Month** afecta cierre, VPG, ticket y contadores de actividad. Las tres comparaciones con presupuesto conservan explícitamente la etiqueta **Month to date / Acumulado del mes** y el mes visible. No se divide un día o una semana contra un presupuesto mensual sin explicarlo, ni se inventan metas diarias prorrateadas.

El detalle de cada tarjeta explica la fórmula y sus entradas reales. Valores positivos o negativos se distinguen por signo, icono y texto, no solo verde/rojo. El estado sin actividad se distingue de un cero real: con tours Q y cero ventas el cierre es `0.00%`; con cero tours Q el cierre es `—`.

Los contadores auxiliares son tours Q efectivos, ventas y volumen neto. El canal presenta Agencia y Socios con la base explícita —por ejemplo, número de tours— y un total consistente. Un No Tour sin canal no se atribuye a Agencia o Socios ni cuenta como un tour de ese desglose. Los registros agregados antiguos quedan en una vista de consulta separada, identificada como **Previous daily summaries · excluded from pilot KPIs / Resúmenes diarios anteriores · fuera de los KPI del piloto**; no aparecen como tours nuevos ni aportan cifras a estas tarjetas.

### Mi día: una captura por tour

1. Se abre la fecha actual y una lista compacta de registros existentes. Cambiar fecha conserva el contexto del listado. Se permiten fechas pasadas y se rechazan resultados con fecha posterior al día actual de Cancún.
2. **Add tour / Agregar tour** abre un formulario individual. Volver a la lista permite añadir otro tour el mismo día sin sobrescribir el anterior.
3. Campos: fecha, tipo original **Q / CT / NQ / No Tour**, canal **Agency / Agencia** o **Members / Socios**, y resultado según el tipo. No hay nombre, teléfono, correo, foto de survey ni información de prospectos.
4. Para Q, CT o NQ se pregunta **Sale / Venta** o **No sale / No venta**. Si hubo venta aparece **Net sales volume · USD / Volumen neto de venta · USD**; un tour vendido representa una venta para el KPI. No se captura número arbitrario de ventas en un único tour.
5. Un CT o NQ con venta conserva su tipo original en el registro, pero muestra **Counts as Q for your KPIs / Cuenta como Q para tus KPI**. La clasificación efectiva la determina el servidor.
6. Un No Tour no pide resultado, volumen ni seguimiento; el canal es opcional y puede quedar sin asignar. No aporta tours Q, ventas ni volumen a las métricas. Puede convivir con Q, CT o NQ en la misma fecha: es una captura individual de actividad, no una declaración de que todo el día estuvo sin tours. No se obliga a anularlo al añadir otro registro.
7. No venta no pide objeciones. No se muestra contenido de aprendizaje de objeciones ni respuestas automáticas.
8. El seguimiento es opcional y solo aparece si hubo venta: fecha y acción breve, con ayuda “Do not include customer personal information / No incluyas datos personales del cliente”.
9. Guardar confirma los datos y actualiza lista y Home con la respuesta del servidor. Si la solicitud falla, conserva el formulario en memoria y permite reintentar; no duplica el tour al repetir un envío pendiente.
10. Editar abre el mismo registro y muestra que es una corrección. Una venta se cancela con la acción expresa **Cancel sale / Cancelar venta**, sin ocultar la transición como una edición a “No venta”. Se confirma el efecto: excluye venta/neto y cancela seguimientos pendientes; un CT/NQ cancelado deja de aportar Q efectivo y un Q original sigue contando como Q. Recalcula el periodo original del tour, conserva auditoría e importe original y no crea otra entrada. Restaurar exige confirmación y no reactiva seguimientos de forma automática.

La fila del tour muestra tipo, canal, resultado, neto y estado de seguimiento, sin crear una pantalla B05 de prospecto. **No Tour** se presenta como registro de actividad, no como un tour calificado de valor cero.

### Meta mensual: una referencia por usuario y mes

- Home y Recursos → Goal Sheet abren exactamente la misma pantalla y el mismo registro mensual.
- Campos: mes, presupuesto de volumen neto USD, cierre objetivo opcional en `%`. No se pide nombre de prospecto ni se mezcla con la captura de actividad.
- Antes de confirmar se muestra el resumen: “Review your monthly goal. Once confirmed, it cannot be changed in this pilot / Revisa tu meta mensual. Una vez confirmada, no se puede cambiar en este piloto”. El presupuesto debe ser positivo; objetivo de cierre, si se captura, entre 0 y 100. El mes corresponde al mes actual de Cancún; el siguiente se habilita al iniciar ese mes.
- La creación de un segundo Goal Sheet del mismo mes no aparece como opción. Si otro dispositivo ya lo creó, la app carga la referencia existente y lo explica.
- Confirmado el mes, se presenta su resumen, fecha de registro y estado **Confirmed · read only / Confirmada · solo consulta**. La meta es inmutable en v1: no se muestra editar, reemplazar ni un override para dueño u operador. Una corrección excepcional requeriría una decisión de alcance posterior; no existe como capacidad operativa de este contrato. La meta del siguiente mes es independiente.
- Presupuesto y notas se guardan en servidor por usuario. Cerrar sesión o cambiar de dispositivo no equivale a perderlos.

## 5. Ruta y lección — C

- Ruta muestra las lecciones publicadas en el orden configurado por el dueño, con título, resumen breve y estados **Available / Disponible**, **Completed / Completada**, **Access required / Requiere acceso** o **Access requested / Acceso solicitado**.
- El total de pasos es dinámico. Los 11 pasos y el acceso inicial 1–3 son una semilla, no una regla fija impresa en el componente.
- No hay bloqueo por secuencia: una lección permitida puede abrirse aunque las anteriores no estén completadas. Completar no cambia por sí mismo permisos ni plan comercial.
- Una tarjeta bloqueada ofrece **Request access / Quiero acceso**. La hoja explica que se notificará al dueño dentro de la app, confirma el envío y pasa a solicitado. Repetir el toque no crea múltiples solicitudes pendientes para la misma lección y persona.
- No se muestran precios, compra, planes Gratis/Premium ni campo de código. Un acceso concedido por equipo o individual habilita la lección después de actualizar los permisos.
- La lección utiliza una sola plantilla para C02, C03 y C04: título, objetivo breve, reproductor YouTube/Vimeo y guion PDF. No hay tabs de medios que no existan.
- El video no se reproduce automáticamente. Se ofrece enlace al proveedor si el reproductor no está disponible. No se prometen subtítulos o audio adicional cuando el video no los ofrece.
- El PDF muestra título, tipo y tamaño; el botón solicita su descarga privada autorizada y permite abrir el archivo en el lector del dispositivo. No hay visor PDF incrustado en el origen de la app. Se informa que se descargará el guion. Un error no se presenta como lección completada ni reemplaza el material por texto inventado.
- **Lesson completed / Lección completada** es una acción expresa; después de confirmarse en servidor muestra check y permite volver a Ruta o abrir otra lección disponible. No hay examen ni práctica con Coach.
- Una lección archivada deja de mostrarse en el catálogo de consumo. Un enlace antiguo explica “This lesson is no longer available / Esta lección ya no está disponible”; no borra el historial del alumno ni muestra contenido retirado.

## 6. Recursos, Notebook y Diario — E

Recursos utiliza las tarjetas actuales, simplificadas a cuatro accesos. No añade biblioteca de audio, guiones de objeciones o funciones de grabación por herencia del diseño anterior. Los PDF pertenecen a sus lecciones.

### Notebook

- Listado privado con búsqueda por título y texto, fecha, estado vacío y CTA **New note / Nueva nota**.
- Editor con título de 1–120 caracteres y cuerpo de texto plano de 1–10,000; contador de límite, guardar, cancelar, editar y eliminar con confirmación. Búsqueda de hasta 100 caracteres. No vincula prospectos ni incorpora adjuntos o grabaciones en este piloto.
- El servidor confirma cada guardado. El mensaje **Saved / Guardado** solo aparece después de una respuesta satisfactoria. Si la conexión se pierde, se conserva el texto en memoria mientras siga abierto el editor.
- No se promete guardar sin red. No hay sincronización offline, cola local de escritura ni éxito basado únicamente en `localStorage`.
- Cambiar de cuenta o cerrar sesión elimina el borrador de memoria; si hay cambios sin guardar se advierte antes. Un modal de reautenticación no envía el borrador a una cuenta distinta.

### Diario

Tres preguntas de texto, sin evaluación automática. Cada respuesta es obligatoria y admite 1–2,000 caracteres; las claves se corresponden con el contrato backend:

| Campo backend | English propuesto | Español propuesto |
|---|---|---|
| `answer_1` | What went well? | ¿Qué salió bien? |
| `answer_2` | Where did you get stuck? | ¿Dónde te atoraste? |
| `answer_3` | What will you do differently next time? | ¿Qué harás diferente la próxima vez? |

El formulario muestra fecha y las tres respuestas. No usa un título obligatorio como sustituto de una pregunta. Se permiten varias reflexiones en una fecha y, si se abre desde Mi día, vincular un tour propio sin copiar información de prospectos. El resumen del listado permite abrir y editar cada reflexión; no envía recomendaciones a Home ni al dueño. Las notas y el Diario son privados del vendedor y se conservan hasta que los elimine, conforme al contrato.

| Estado | English propuesto | Español propuesto |
|---|---|---|
| Sin red | Offline. Your changes were not saved. Keep this screen open and retry when you reconnect. | Sin conexión, no se guardó. Mantén esta pantalla abierta y vuelve a intentar cuando tengas red. |
| Fallo del servidor con red | We could not save your changes. Your draft is still here. Try again. | No pudimos guardar los cambios. Tu borrador sigue aquí. Inténtalo de nuevo. |
| Cambios pendientes al salir | You have unsaved changes. Leave without saving? | Tienes cambios sin guardar. ¿Salir sin guardar? |
| Eliminar nota | Delete this note? This cannot be undone. | ¿Eliminar esta nota? No se puede deshacer. |

## 7. Dos calculadoras — F

F01 ofrece exactamente dos tarjetas. F02 es la plantilla compartida con entradas, botón **Calculate / Calcular**, resultado, **Reset / Limpiar** y explicación breve de supuestos. Los cálculos no escriben resultados comerciales, metas ni notas. No hay una tercera calculadora de gastos del vendedor, VPG, Brecha o comisiones.

### Anyway money

Entradas: gasto anual actual `A` en USD, número entero de años `n` y aumento anual supuesto `g` en porcentaje. Valor inicial sugerido de inflación: 4%, editable y etiquetado como supuesto, no como pronóstico. El primer año usa el gasto actual, sin incremento.

```text
total = A × ((1 + g)^n − 1) / g
si g = 0: total = A × n
```

`g` se convierte de porcentaje a fracción antes del cálculo. Límites CP2: gasto anual positivo hasta USD 10,000,000; años enteros de 1 a 50; inflación de 0% a 30%. Cero en gasto, negativos, valores fuera de rango, `NaN` e infinito producen un error antes de calcular. Ejemplo sintético de aceptación: USD 3,000 anuales, 20 años y 4% → **USD 89,334.24**. Presentar “Projected spending / Gasto proyectado” y la aclaración “Based on your inputs / Según los valores ingresados”; no afirmar ahorro garantizado ni retorno de inversión.

### Down payment & monthly payment / Enganche y mensualidades

Entradas: precio `P`, enganche en porcentaje `d`, tasa anual nominal `a` y plazo entero en meses `n`. Límites CP2: precio positivo hasta USD 100,000,000; enganche de 0% a 100%; tasa anual de 0% a 100%; plazo entero de 1 a 600 meses. Los únicos dos resultados son saldo a financiar y mensualidad; no se muestra otra salida monetaria derivada, intereses acumulados ni total pagado.

```text
principal = P × (1 − d)
r = a / 12
monthly_payment = principal × r / (1 − (1 + r)^(-n))
si r = 0: monthly_payment = principal / n
```

`d` y `a` son fracciones después de convertir sus porcentajes. Propuesta de supuesto visible: pagos iguales al final de cada mes, tasa anual nominal dividida entre 12 y sin cargos adicionales. Ejemplo sintético: precio USD 20,000, enganche 20%, tasa anual 12% y 48 meses → saldo **USD 16,000.00**, mensualidad **USD 421.34**. Con 100% de enganche, saldo y mensualidad son cero; un plazo cero o una entrada inválida produce un error de campo, nunca `NaN`, infinito ni resultado previo que parezca vigente.

Estas convenciones financieras son parte de la propuesta CP2. Se muestran como simulación de los valores introducidos y no como cotización o condición contractual ofrecida al cliente.

## 8. Espacio del dueño — G

### Mi roadmap

- Lista de lecciones con orden, título, estado **Draft / Borrador**, **Published / Publicada** o **Archived / Archivada**, y acceso. Permite crear, editar y reordenar; se ofrece mover arriba/abajo por teclado además de cualquier arrastre.
- Editor: título, resumen/objetivo, URL YouTube o Vimeo y carga del guion PDF. El formulario indica **PDF · máximo 10 MiB · un archivo por revisión** antes de elegirlo; no acepta archivos vacíos, otros formatos ni URL/embed HTML arbitrario. Un error conserva los demás campos.
- Estados de PDF: seleccionado, cargando, cargado, error/reintentar y reemplazar. Solo “cargado” permite tratarlo como material disponible. Un nombre de archivo no demuestra que se haya guardado.
- Acciones separadas: **Save draft / Guardar borrador**, **Preview / Vista previa**, **Publish / Publicar** y **Archive / Archivar**. La vista previa del dueño puede mostrar borradores y lo indica; la del vendedor solo recibe lo autorizado.
- Publicar requiere revisión explícita del dueño y material válido. No se comunica que alguien más aprobó el contenido. Archivar requiere confirmación y explica que el historial de progreso se conserva.
- La configuración de acceso permite habilitar una lección para un equipo o para personas concretas de esa academia; el selector no muestra otros equipos ni usuarios ajenos. El resumen de permisos permite entender por qué alguien tiene acceso sin confundirlo con progreso.
- La bandeja **Access requests / Solicitudes de acceso** muestra vendedor, lección, fecha y estado. Aprobar o rechazar confirma en servidor y actualiza el estado in-app. No promete envío por correo o WhatsApp.
- Ajustes de academia: nombre único y título principal A01 EN/ES, con vista previa, guardar y confirmación. Se explica que personalizan el contexto de la organización después de iniciar sesión; el acceso público sigue mostrando la plataforma genérica. Se evita crear un segundo panel de CMS separado para la misma lección.

### Mi equipo

- Filtro de mes y listado de vendedores de la academia, con tours Q efectivos, ventas, volumen neto, cierre, VPG, lecciones completadas/total vigente y solicitudes de acceso.
- La ficha del vendedor muestra los seis KPI del mismo mes, la meta de referencia y el progreso; usa los mismos valores y redondeo que Home. No lee Notebook ni Diario privados. Sin registros se muestra “No activity in this period / Sin actividad en este periodo”, diferenciándolo de una cuenta que no pertenece al equipo.
- Los totales y porcentajes se calculan desde los registros autorizados; no se promedian porcentajes individuales para presentar un cierre global.
- Se conserva el filtro al abrir y cerrar una ficha. Estados de carga y error no reemplazan los valores por ceros falsos.
- El alta manual de cuentas pertenece al operador autorizado definido en CP2, no se añade como autoservicio del dueño por inferencia.

## 9. Mapa de los 43 frames A–H

Los IDs son trazabilidad de diseño, no nuevas URLs ni compromisos de una pantalla separada por fila. Se conservan los identificadores originales, aunque el resumen del PO cambie el orden verbal de G02/G03.

| Referencia Stitch | Tratamiento propuesto en v5 |
|---|---|
| A01 | Bienvenida sin Coach e idioma; identidad genérica prelogin, marca/título de organización solo con contexto autenticado. |
| A02 | Explicación de Ruta, jornada y Recursos; sustituye “Conoce a tu coach”. |
| A03 | Orientación de perfil sin asignación de permisos. |
| A04 | Atajos Ruta/Recursos; siempre autenticar antes del contenido. |
| A05 | Activación con cambio de contraseña temporal; sin registro público ni invitado. |
| A06 | Login único. |
| A07 | Recuperación por operador; sin token de recuperación público. |
| B01/B02 | Un mismo Home con estado con actividad/sin actividad, seis KPI y meta. |
| B03 | Mi día y captura individual; sustituye agenda de prospectos. |
| B04 | Seguimientos solo de registros vendidos; sin datos de prospectos. |
| B05 | Retirado como detalle de prospecto; edición de actividad dentro de Mi día. |
| B06 | Retirado del dock; funciones de cuenta en sheet de Home. |
| C01 | Ruta editable y total dinámico, sin secuencia obligatoria. |
| C02/C03/C04 | Una plantilla de lección: video, PDF y completar. |
| C05 | Quiero acceso; sustituye paywall y código. |
| D01–D05 | Fuera del piloto; no borrar historial ni datos existentes. |
| E01 | Recursos con cuatro accesos. |
| E02/E03 | Notebook privado con persistencia en servidor. |
| E04 | Diario con tres respuestas de texto, sin IA. |
| E05 | Captura cuantitativa absorbida por Mi día; no duplicar resultados. |
| E06 | Meta mensual única, confirmación definitiva y solo consulta posterior; disponible desde Home y Goal Sheet. |
| F01 | Catálogo de dos calculadoras. |
| F02 | Plantilla de las dos calculadoras y sus estados. |
| F03/F04 | Sin biblioteca independiente adicional; materiales video/PDF dentro de la lección. |
| G01 | Mismo login y orientación de acceso del dueño, sin compra. |
| G02 | Hub del dueño: Mi roadmap y acceso a Mi equipo; conserva función de configuración del inventario. |
| G03 | Editor de lección dentro de Mi roadmap. |
| G04 | Retirado como CMS genérico separado; video y PDF viven en el editor de lección. |
| G05/G06 | Fuera de la app piloto; venta a empresas en web posterior. |
| H01–H04 | Fuera del piloto; no importación de surveys, asignaciones, tablero ni historial operativo en el flujo nuevo. |

## 10. Estados y criterios de aceptación visual

1. **Carga:** skeleton o indicador con nombre accesible; no pintar cero como dato temporal. Mantener el contexto cuando se actualiza una lista.
2. **Vacío:** explicar una siguiente acción útil. Ejemplos sintéticos solo en pruebas; ninguna cifra, vendedor o lección ficticia se inserta en cuentas reales para llenar la pantalla.
3. **Error:** mensaje junto a la acción y, si corresponde, junto al campo; foco al primer campo inválido. Errores de red y de permisos tienen textos distintos.
4. **Guardado:** botón con estado en curso, envío único y confirmación del servidor. Ante timeout ambiguo se verifica resultado antes de crear otro registro. Los textos y selecciones se conservan para reintentar.
5. **Conflicto:** si un registro editable cambió en otro dispositivo, se explica y permite cargar la versión actual; nunca se sobrescribe silenciosamente. Si ya se confirmó la meta mensual en otro dispositivo, se carga la meta definitiva en solo consulta y no se ofrece sobrescribirla.
6. **Cambios sin guardar:** confirmación antes de cerrar editor, cambiar de cuenta o abandonar; botones **Keep editing / Seguir editando** y **Leave / Salir** claros.
7. **Autorización:** ningún cambio de ruta o manipulación de una tarjeta revela datos de otro vendedor o academia. La UI representa el permiso decidido por el servidor.
8. **Responsive:** validar 360, 390, 768 y 1440 CSS px y zoom 200%, conforme a CP2. Home: dos tarjetas KPI por fila en móvil cuando las etiquetas caben y tres en escritorio; con zoom se permite una columna. Sin scroll horizontal obligatorio para leer o guardar.
9. **Lectura:** texto de cuerpo al menos 16 CSS px en formularios móviles; metadatos al menos 12 px; no reutilizar el microtexto de 8–10 px presente en algunos exports.
10. **Accesibilidad:** objetivos táctiles al menos 44 × 44 CSS px; contraste mínimo 4.5:1 para texto normal y verificación de controles/foco; orden de tabulación lógico, labels visibles y estados anunciados. No certificar conformidad sin pruebas ejecutadas.
11. **Modales:** título accesible, foco inicial coherente, foco contenido, Escape/cerrar y restauración del foco al disparador. Cerrar no descarta un borrador sin advertencia.
12. **Movimiento y medios:** respetar reducción de movimiento; sin autoplay ni animación que impida leer, completar una tarea o seguir foco. El piloto es una herramienta de trabajo, no hereda efectos parallax de la landing.
13. **Bilingüismo:** probar EN y ES con texto largo, navegación por teclado, zoom 200%, errores, campos vacíos y números. El idioma de documento y de los controles acompaña a la selección real.

## 11. Escenarios de revisión del diseño

Todos los usuarios y registros de estos escenarios son sintéticos, sin datos de clientes.

| ID | Escenario | Evidencia esperada al implementar |
|---|---|---|
| UX-01 | Primera visita en inglés; elegir español, autenticar y volver. | Copy y preferencia coherentes; no acceso invitado. |
| UX-02 | Cuenta temporal y destino Ruta. | Cambio obligatorio de clave; después abre destino autorizado. |
| UX-03 | Correo fuera de lista; recuperación de acceso. | Copy acordado; sin registro público, códigos o tokens expuestos. |
| UX-04 | Dos tours Q y un NQ vendido en la misma fecha. | Tres registros distintos; el NQ vendido cuenta como Q efectivo una sola vez. |
| UX-05 | No Tour en una fecha con otros tours, con canal opcional. | No resultado/monto/seguimiento; puede coexistir con los otros registros; no altera KPIs. |
| UX-06 | Fixture DS-02: Q sin venta, CT sin venta, CT vendido USD 1,000, NQ vendido USD 2,000, NQ sin venta y No Tour, misma fecha. | 3 Q efectivos; 2 ventas; neto USD 3,000; cierre 66.67%; VPG USD 1,000.00; ticket USD 1,500.00. |
| UX-07 | DS-02 con meta definitiva USD 6,000 y cierre objetivo 50%; intentar editarla. | Cumplimiento 50.00%; diferencia −USD 3,000.00; cierre +16.67 pp. Meta solo consulta, sin edición ni override. |
| UX-08 | Home sin Q, sin ventas o sin meta. | Placeholders explicados; no división por cero ni progreso inventado. |
| UX-09 | Editar nota y cortar red. | Mensaje de fallo, borrador visible, sin confirmación falsa ni cola offline. |
| UX-10 | Solicitar una lección dos veces y conceder acceso como dueño. | Una solicitud pendiente; cambio de estado y acceso sin secuencia ni código. |
| UX-11 | Dueño carga video/PDF, revisa y publica. | Borrador no visible al vendedor; publicación y fallos de medios claros. |
| UX-12 | Vendedor abre URL del dueño; dueño inspecciona un vendedor. | Vendedor vuelve a Home; dueño no ve notas ni Diario privados. |
| UX-13 | Calcular los dos ejemplos; probar tasa cero y valores en/fuera de los límites CP2. | Resultados y supuestos correctos; saldo/mensualidad como únicas salidas del financiamiento; error por entrada inválida y sin resultado obsoleto. |
| UX-14 | Cambiar branding, alternar EN/ES, cerrar sesión e introducir un correo. | Marca y título A01 de organización solo autenticado; acceso público genérico; el correo no descubre organización; sin logo/colores personalizados. |
| UX-15 | Revisar móvil, zoom, teclado y lector de pantalla. | Acciones alcanzables, foco conservado, sin recortes ni contenido bajo dock. |

## 12. Límites y revisión CP2

- Todos los textos de este archivo se marcan **propuestos**, salvo las frases expresamente citadas del resumen; su traducción EN también requiere revisión del PO.
- El PO debe confirmar la traducción del contenido y quién revisa el inglés antes del piloto. El selector no resuelve la revisión editorial de videos o PDF.
- La meta mensual confirmada es inmutable v1, el histórico no aporta KPI nuevos y la cancelación de venta recalcula el periodo original. Permisos y alcance del operador siguen `cp2-spec.md`; las pantallas no crean políticas distintas ni excepciones implícitas.
- Se requiere contraste de estos flujos con los 33 CR detallados si se incorporan después. Las diferencias se registran como cambios al contrato; no se asume equivalencia completa con un resumen.
- Las rutas antiguas y funciones excluidas no deben causar pérdida de historial. El trabajo de implementación definirá desactivación y migración según CP2, sin convertir “fuera del piloto” en borrado de datos.
- Este archivo no declara aprobación de Stitch, no crea pantallas en el servicio y no modifica la app ni producción.

## Aprobación registrada · 2026-11-20

El PO aprobó el contrato v1 y sus anexos: «lo apruebo y porfa crea otra rama para desarrollar e implementar esto y cuando termines publicalo». Las marcas de propuesta anteriores conservan el origen de las decisiones; su estado vigente es aprobado. Rama de ejecución: `feature/pilot-v5`.
