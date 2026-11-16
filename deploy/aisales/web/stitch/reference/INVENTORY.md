# Inventario y arquitectura de la app

**Fecha:** 2026-11-13 · **Estado:** propuesta para revisión · **Fuente principal:** designpiloto.

## Lectura de los diseños

19 exportaciones contienen HTML y PNG; una carpeta adicional contiene solo DESIGN.md. Se inspeccionaron las capturas y se extrajo el contenido de los HTML. El PNG de perfil aparece negro; su HTML define tres roles y permite reconstruir esa pantalla.

Predomina una UI oscura con acentos verdes y mascota coach. Home móvil y configuración de gerente tienen referencias claras/editoriales; el DESIGN.md del roleplay usa espresso/dorado. Se normaliza esta entrega a blanco, negro y grises para revisar estructura y navegación antes de elegir la identidad visual definitiva. No se mezclan esos estilos como si fueran un sistema aprobado.

## Trazabilidad de los 20 grupos fuente

| Fuente bajo designpiloto/ | Wireframe | Cobertura |
|---|---|---|
| 1 | A01 | Bienvenida |
| 1.2 | A02 | Presentación del coach |
| 1.3 | A02 | Preparación de preguntas; variante consolidada |
| 03_onboarding_perfil_mobile | A03 | Rol; PNG negro, HTML utilizable |
| 1.4 | A04 | Punto de entrada preferido |
| 2.2 | A06 | Login |
| 2.1 | A07 | Recuperación |
| home_rep | B01 | Home de escritorio; adaptación responsive |
| home_rep_mobile | B01/B02 | Home móvil |
| roadmap_modular_estilo_smart_notebook | C01 | Lista canónica provisional de 11 pasos |
| lecci_n_1_meet_greet_mobile | C02 | Lección inicial |
| lecci_n_2_warm_up_rapport_mobile | C03 | Rapport; orden inconsistente |
| modal_desbloquear_nivel_de_acceso_mobile | C05 | Paywall/licencia |
| b_veda_de_recursos | E01/F01/F03 | Bóveda y accesos a herramientas |
| smart_notebook_smart_diary_mobile | E04 | Feedback de tour |
| smart_goal_sheet_registro_mobile | E05 | Actividad cuantitativa |
| gerente_acceso_o_licencia | G01 | Acceso corporativo |
| gerente_configura_tu_contenido | G02 | Guía de carga de contenidos |
| direcci_n_soluciones_para_tu_organizaci_n | G05 | Opciones comerciales |
| executive_roleplay_simulator/DESIGN.md | D02/D03/D04 | Especificación visual, sin HTML/PNG |

## Ocho láminas, 43 frames

Los IDs son identificadores de diseño, no URLs ni contratos de API. Cada frame es una pantalla o plantilla con estados; una lámina es un documento de flujo con varios frames. Home de escritorio queda descrito como adaptación de B01, no como pantalla adicional. La biblioteca reutiliza F03/F04 para guías, guiones y audio.

### A · Acceso y onboarding

| ID | Pantalla/estado | Contenido, acciones y salida |
|---|---|---|
| A01 | Bienvenida | Referencia designpiloto/1: logo Sales Academy, placeholder mascota coach, ES/EN, Practica tus ventas. Gana confianza, Comenzar hacia A02, Ya tengo cuenta hacia A06. |
| A02 | Conoce a tu coach | Referencias 1.2 y 1.3: saludo del coach, explicación de preguntas para personalizar, progreso, Continuar hacia A03 y Volver. Consolidar las dos introducciones en un solo frame con nota de ambas variantes. |
| A03 | Tu perfil | Referencia 03_onboarding_perfil_mobile: selector Representante / Gerente o coach / Dirección, continuar: rep A04, gerente G01, dirección G05. Sin inventar preguntas 2 y 3; nota externa pendientes de definir. |
| A04 | Por dónde empezar | Referencia 1.4: tres opciones Roadmap, Bóveda, AI Sales Coach; selección única; Continuar lleva C01/E01/D01 según selección; nota externa acceso invitado vs privado por confirmar. |
| A05 | Crear cuenta / invitado | PROPUESTO para cerrar hueco de alta: nombre de ejemplo, email, contraseña, aviso privacidad, Crear cuenta, Probar sin cuenta, Ya tengo cuenta A06. No insinuar que el registro público esté implementado. |
| A06 | Iniciar sesión | Referencia 2.2: correo, contraseña, mostrar, recuperación A07, iniciar sesión B01, Google/Apple como opciones por validar; ChatGPT no ofrecer como operativo. Error de credenciales en estado secundario. |
| A07 | Recuperar acceso | Referencia 2.1: correo, Enviar enlace, confirmación genérica si la cuenta existe, Volver a iniciar sesión. Subestado propuesta enlace recibido/nueva contraseña/enlace vencido. |

Fuente: 8 exports de entrada, incluyendo dos intros. Screenshot de perfil aparece negro: reconstrucción basada en su HTML. El prototipo actual permite prueba invitada; conservar alternativa propuesta. OAuth y registro por validar.

### B · Jornada del representante

| ID | Pantalla/estado | Contenido, acciones y salida |
|---|---|---|
| B01 | Home · desempeño | Referencia home_rep_mobile y home_rep: Hoy/Semana/Mes; meta y avance; Tours/Qs, Ventas, Cierre, VPG; canal Agencia/Socios; follow-ups; recomendaciones del diary; CTA Registrar actividad E05. Mostrar números únicamente como ejemplo y meta sin configurar lleva E06. Nota desktop: mismos bloques en dos columnas. |
| B02 | Home · sin actividad | PROPUESTO: sin meta, sin tours, sin recomendaciones; CTAs Definir meta E06, Registrar actividad E05, Explorar Roadmap C01. No gráficos con métricas falsas. |
| B03 | Agenda / tours | EXISTENTE EN APP: acceso desde icono calendario del header; selector día/semana; tours de ejemplo Lead #101, horario y estado; seleccionar tour B05; volver a Home; estado sin tours y actualizar. |
| B04 | Seguimientos | PROPUESTO derivado de Home y tareas: hoy/próximos/completados; Lead #101; siguiente acción, fecha y responsable; abrir, completar, reprogramar; enlace al tour B05 y nota E03. |
| B05 | Detalle y resultado de tour | EXISTENTE EN APP: tour asignado; resultado Venta/No venta/Abandono; venta volumen/divisa; no venta objeción y recuperable con fecha/responsable; abandono paso 1-11; revisar y confirmar; conflicto de edición visible. Mantener separado del registro Goal Sheet E05. |
| B06 | Perfil y preferencias | PROPUESTO con base en Perfil actual: identidad/rol, nivel de acceso, meta mensual E06, idioma/tema, repetir onboarding, acceso corporativo C05, cerrar sesión; versión invitado permite reiniciar prueba y explica que datos se borran al recargar. |

No mezclar resultado formal de tour con registro manual de actividad: decisión de unificación pendiente. Home hereda unidad y meta del Goal Sheet; formato monetario por validar. Perfil y seguimientos no tienen export piloto.

### C · Aprendizaje y niveles

| ID | Pantalla/estado | Contenido, acciones y salida |
|---|---|---|
| C01 | Roadmap · 11 pasos | Referencia roadmap_modular_estilo_smart_notebook: progreso y lista compacta de los 11 módulos: Meet & Greet, Agenda Control, Rapport FORM, Discovery, Remake the Pact, 3-Way Pitch, Property Tour, Model Suite, Point of Confirmation, Price & Negotiation, Closing & Onboarding. Estado disponible/en curso/completado/bloqueado. Entrar lección C02 o C05. |
| C02 | Lección · Meet & Greet | Referencia lecci_n_1: título paso1/11, tabs Video/Audio/Texto, placeholder reproductor, 3 principios, guion, practicar D02, marcar completada, siguiente lección. |
| C03 | Lección · Rapport | Referencia lecci_n_2_warm_up: mismo shell, principios de calibración, copiar guion y practicar. Mostrar Rapport como paso 3/11 según roadmap, con NOTA EXTERNA de discrepancia: export lo llama paso2; propuesta de orden por validar. |
| C04 | Plantilla · módulos restantes | PROPUESTO, reutilizable pasos 2 y 4-11: título Agenda Control de ejemplo, selector de formato, objetivo, contenido por definir como placeholder, práctica D02, completar, anterior/siguiente. Sin inventar currículum detallado. Miniestado completado y siguiente. |
| C05 | Desbloquear acceso | Referencia modal_desbloquear: bottom sheet sobre roadmap, cerrar, plan individual con Precio por confirmar, activar licencia con correo/código, estados código inválido/verificando/activado, volver roadmap. Sin prometer plan ni cobro real. |

Separar progreso de aprendizaje y derecho de acceso: completar no garantiza licencia. Precios 49/499/1999 de exports no confirmados. El roadmap de 11 pasos es referencia provisional; numeración de lección2 y niveles discrepa.

### D · AI Sales Coach

| ID | Pantalla/estado | Contenido, acciones y salida |
|---|---|---|
| D01 | Coach · inicio | PROPUESTO desde navegación piloto: contexto de lección o diario, tarjetas Preparar presentación / Practicar objeción / Revisar pitch; recomendaciones; modo texto o roleplay; mensaje simulación/datos de ejemplo. |
| D02 | Preparar práctica | PROPUESTO desde DESIGN.md: elegir habilidad, escenario comprador analítico/escéptico/apresurado, texto/voz, duración de práctica 90s como ejemplo, permiso micrófono si voz, iniciar D03, cancelar. |
| D03 | Roleplay · sesión | Derivado executive_roleplay_simulator/DESIGN.md: escenario, contador 90s de ejemplo, objeciones, transcripción, tarjeta táctica, onda placeholder, mantener para hablar o escribir, pausar/terminar D04. Sin datos de evaluación real. |
| D04 | Evaluación y siguiente práctica | PROPUESTO: sesión finalizada, fortalezas y una mejora como ejemplos, fragmento revisable, practicar otra vez D02, revisar lección C02, guardar reflexión E04. No porcentajes de precisión inventados. |
| D05 | Coach · conversación y estados | Derivado copiloto existente: conversación contextual, input texto, adjuntar recurso conceptual, respuesta con enlace F04; estado IA no disponible permite consultar guiones, reintentar; permiso micro denegado ofrece texto. Aviso IA pendiente de activación según documentación actual. |

El DESIGN.md es especificación visual, no captura del simulador. Roleplay y feedback automático son propuestas; IA de Smart Note figura desactivada en documentación local. No mostrar certificaciones ni evaluación validada.

### E · Bóveda · notas y resultados

| ID | Pantalla/estado | Contenido, acciones y salida |
|---|---|---|
| E01 | Bóveda | Referencia b_veda_de_recursos: buscador, Smart Goal Sheet E05, Calculadoras F01, Smart Notebook E02, Smart Diary E04, Guías/Guiones/Audio F03. Dock Bóveda activo. |
| E02 | Smart Notebook · listado | EXISTENTE EN APP sin export completo: buscar, categorías, notas fijadas/archivadas, nueva nota E03, grabar/subir como funciones propuestas; vacío con Crear primera nota. |
| E03 | Nota · editor y detalle | EXISTENTE EN APP: título, cuerpo, categoría, vínculo opcional a tour, guardar, pendiente con fecha para Home, fijar/archivar; grabar/subir archivos propuesto por piloto, no atribuir implementación. Error conserva texto. |
| E04 | Smart Diary · post-tour | Referencia smart_notebook_smart_diary_mobile: Grabar feedback / Subir nota (propuestas), 3 preguntas qué salió bien/dónde te atoraste/qué mejorar, Guardar feedback, Ver recomendaciones Home. Mostrar procesamiento pendiente/IA no disponible sin inventar consejo. |
| E05 | Smart Goal Sheet · actividad | Referencia smart_goal_sheet_registro_mobile: tipo Q/CT/NQ/No Tour, canal Agencia/Socios, venta Sí/No, campo volumen si sí, motivo si no, manager/T.O. opcional, Guardar registro, Ver Home. Estados validación y guardado. |
| E06 | Goal Sheet · definir meta | PROPUESTO sustentado en Home y perfil: periodo mensual, meta y unidad por confirmar, objetivos de actividad opcionales, resumen; Guardar meta -> B01. No calcular proyecciones comerciales no aprobadas. |

Separar datos cuantitativos Goal Sheet y reflexión Diary. Una nota puede producir pendiente; feedback IA necesita disponibilidad. No doble contabilización entre tour B05 y registro E05; regla pendiente. Q/CT/NQ/No Tour requiere diccionario comercial.

### F · Biblioteca y calculadoras

| ID | Pantalla/estado | Contenido, acciones y salida |
|---|---|---|
| F01 | Smart Calculadoras | PROPUESTO desde CTA Bóveda: catálogo con búsqueda, tarjetas de cálculo comercial y objetivo; nombres/fórmulas pendientes de validación; seleccionar F02, volver Bóveda. |
| F02 | Calculadora · detalle | PROPUESTO: título cálculo de ejemplo, entradas Importe / Tasa / Plazo con unidades, Calcular, zona resultado ilustrativo sin cifras ni fórmula afirmada, limpiar, guardar como nota E03; validación campos y disclaimer fórmula por definir fuera del frame. |
| F03 | Guías / guiones / audio | PROPUESTO desde Bóveda y recursos actuales: tabs Guías, Guiones, Audio; búsqueda; filtro por paso; tarjetas con tipo/duración; abrir F04; vacío búsqueda. |
| F04 | Recurso · lectura y audio | Derivado recursos actuales: encabezado, formato/etiquetas, contenido placeholder, versión guion Copiar/Practicar D05; versión audio controles/transcripción; Guardar en Notebook; volver. No grabaciones reales ni afirmaciones comerciales. |

Una plantilla de biblioteca cubre tres categorías; una de detalle cubre texto, guion y audio. Los exports solo muestran accesos; pantallas interiores propuestas. No definir fórmulas financieras ni promesas de rentabilidad.

### G · Gerencia y dirección

| ID | Pantalla/estado | Contenido, acciones y salida |
|---|---|---|
| G01 | Gerente · acceso o licencia | Referencia gerente_acceso_o_licencia: Tengo acceso -> validar código/correo y G02; No tengo -> G05; volver selección de rol. |
| G02 | Configura tu academia | Referencia gerente_configura_tu_contenido: bloques Cargar Roadmap 11 módulos G03 y Crear recurso G04, vista previa asesor, acceso separado Tablero de sala H01 (solo autorizado). |
| G03 | Editor de módulo | PROPUESTO desde CTA gerente: seleccionar paso1-11, título, video/audio/texto placeholder, borrador, vista previa C04, guardar borrador y revisar; publicación requiere acción explícita; estado error de carga. |
| G04 | Editor de recurso | PROPUESTO desde CTA gerente: tipo guía/guion/audio, título, contenido o archivo, categoría y módulo asociado, preview F04, guardar borrador, publicar; estado vacío/carga/error. |
| G05 | Dirección · soluciones | Referencia dirección_soluciones: Metodología Sales Academy, Marca privada/white label, Solución corporativa; precios Por cotizar, implementación aparte por confirmar; elegir opción G06; no checkout ficticio. |
| G06 | Solicitud de orientación | PROPUESTO para CTA Agendar llamada/Elegir solución: organización y correo sintéticos, solución seleccionada, tamaño equipo opcional, disponibilidad, aviso privacidad y consentimiento de contacto, revisar y enviar -> confirmación de solicitud, volver. No afirmar reunión reservada. |

Rol gerente no equivale automáticamente a permiso de publicar o asignar tours. Propuesta requiere validación de permisos y contenido. Cotización sustituye cifras sin unidad/periodicidad confirmada de los exports.

### H · Operación · tablero de sala

| ID | Pantalla/estado | Contenido, acciones y salida |
|---|---|---|
| H01 | Tablero de sala | DESKTOP EXISTENTE EN APP: selector sala y fecha, columnas Rep A/Rep B, tarjetas Lead #101 sintéticas con hora/estado/resultado, Asignar tour H02, Importar H03, Actualizar, historial H04. Sidebar mínimo; permiso rep denegado. |
| H02 | Asignar / editar tour | DESKTOP EXISTENTE EN APP: panel lateral representante de sala, Lead #101, inicio/fin, estado, guardar/cancelar; empalme muestra error y conserva datos. Tour con resultado exige resolver resultado antes de cancelar. |
| H03 | Importar y revisar | DESKTOP EXISTENTE EN APP: CSV/JSON/texto/foto, analizar; tabla rep/lead/inicio/fin/estado con errores por fila; corregir, confirmar solo válidas, resumen importación. Nada se importa antes de confirmación. |
| H04 | Resultado e historial | DESKTOP EXISTENTE EN APP: selección tour, Venta/No venta/Abandono y campos condicionales, historial antes/después, corregir, quitar con confirmación, conflicto exige actualizar; admin mover rep de sala y restaurar demo en zona restringida con confirmación. |

Lámina de escritorio: usar cuatro frames anchos 760px en cuadrícula 2x2 en lugar de teléfonos. Fuentes docs/guia-tablero.md y prototypes/smart-agenda-mockup/ops. Datos ficticios sin nombres. Permisos son parte del flujo, no autenticación implementada nueva.

## Recorridos principales

1. Nuevo representante: A01 → A02 → A03 → A04 → destino C01, E01 o D01. Alta A05 o prueba invitada son propuestas de cierre de acceso, con política pendiente.
2. Acceso existente: A01 → A06 → B01; recuperación A06 → A07 → A06.
3. Aprendizaje: B01 → C01 → C02/C03/C04 → D02 → D03 → D04 → próxima lección. Restricción: C01 → C05 → validación de acceso → módulo permitido.
4. Jornada: B01 → B03 → B05 → resultado → B01; no venta recuperable → B04.
5. Reflexión: E01 → E04 → feedback guardado → IA disponible D01 o estado pendiente → recomendación B01 → práctica D02.
6. Nota y pendiente: E01 → E02 → E03 → pendiente B04/B01. No requiere IA para guardar.
7. Metas y actividad: B01 sin meta → E06 → B01; E01 → E05 → guardado → B01. Reconciliación con resultados de B05 pendiente de definir.
8. Recursos: E01 → F01 → F02 → E03; E01 → F03 → F04 → D05 o E03.
9. Gerente: A03 → G01 → G02 → G03/G04 → vista previa → guardar/revisar; sin licencia → G05 → G06.
10. Dirección: A03 → G05 → G06 → confirmación de solicitud. No implica reunión reservada.
11. Operación: G02 con permiso → H01 → H02/H03 → revisión/confirmación → B03; H01 → H04 → historial/corrección.

## Decisiones pendientes para aprobar el diseño

| Tema | Hallazgo | Tratamiento provisional |
|---|---|---|
| Navegación | Piloto: Home/Roadmap/AI Coach/Bóveda/Perfil. App invitada: HOME/Smart Note/Smart Agent/Road Map/Perfil. | Prevalece piloto para esta propuesta; Notebook dentro de Bóveda y accesos contextuales. |
| Orden curricular | Roadmap paso2 Agenda, paso3 Rapport; export de lección2 dice Warm Up/Rapport. | Se propone Rapport en paso3; validar con responsable de metodología. |
| Progreso vs acceso | Export sugiere desbloquear avanzando y a la vez exige licencia. | Dos estados distintos: completado y permitido por licencia. Regla comercial sin aprobar. |
| Home | Desktop compara canales por tours 62.5/37.5; móvil por volumen 64.5/35.5. | Etiquetar explícitamente la base; no mezclar porcentajes. |
| Metas y VPG | Algunas referencias dejan unidad pendiente; otra usa USD y VPG volumen/tour. | Unidad por confirmar; sin resultados financieros reales. |
| Registro duplicado | Goal Sheet permite registro manual; app ya registra resultado formal de tour. | Mantener entradas separadas en wireframe y resolver fuente única antes de implementación. |
| Onboarding | Perfil indica pregunta1/3 pero no existen diseños de preguntas2/3. | No inventar cuestionario aprobado; simplificar propuesta y registrar hueco. |
| Alta y OAuth | CTA comenzar sin pantalla de registro completa; Google/Apple/ChatGPT en mock. | Alta propuesta, OAuth por validar; no presentar ChatGPT como proveedor operativo. |
| Invitado | Documentación reciente permite probar sin cuenta con datos efímeros. | Conservar camino de prueba y aviso de borrado al recargar. |
| Precios | 49 USD/mes y 499/1999 sin contexto contractual confirmado. | Precio por confirmar/cotización; sin checkout ni compra real. |
| IA y medios | Roleplay solo tiene DESIGN.md; IA de notas consta desactivada. Voz/subida fuera de Smart Note v1. | Propuesta etiquetada y estados de indisponibilidad/entrada textual. |
| Recursos | Calculadoras y bibliotecas interiores no tienen diseños completos. | Plantillas propuestas sin fórmulas, licencias ni contenido inventado como hecho. |
| Gerente | Export muestra guía, no editores ni matriz de permisos. | Editores propuestos; revisar antes de publicar; permisos por validar. |

## Estados transversales

- Cargando: conservar contexto y permitir cancelar donde corresponda.
- Vacío: explicar siguiente acción útil; no mostrar cifras de rendimiento inventadas.
- Validación: error junto al campo, conservar captura, llevar foco al primer error.
- Sin conexión/IA no disponible: mantener notas locales solo si la política lo permite; no afirmar guardado remoto.
- Conflicto de resultado: aviso y actualización explícita, sin sobrescritura silenciosa.
- Licencia inválida: mensaje recuperable, volver a Roadmap y soporte por definir.
- Voz denegada: alternativa de texto.
- Acción destructiva: confirmar eliminación/reinicio/cancelación, mantener salida.
- Navegación: volver al origen en detalles/modales; dock solo para entorno rep.
- Datos: ejemplos sintéticos, sin nombres, cuentas, audios reales ni secretos.

## Fuera de esta entrega

No se modifica la aplicación, no se publican contenidos ni se activan servicios. El sitio comercial y CMS growth tienen un inventario independiente y no se cuentan como pantallas de esta app. Estas láminas no certifican backend, autenticación, IA ni funcionamiento de botones.

