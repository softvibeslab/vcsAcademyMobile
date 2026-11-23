# Historia enriquecida · Tour, contexto y aprendizaje

**Readiness:** LISTA
**ID:** HU-V1-TOUR-LEARNING
**Solicitante:** Product Owner
**Product Owner (aprueba):** Roger
**Enriquecido por:** Codex, con revisión frontend y backend
**Fecha:** 2026-11-22
**Version:** v1

**Ajuste posterior del PO:** «cambia la funcionalidad para que el aprendizaje con ia solo lo haga si el usuario le da click en analizar y que igual haya un campo de texto para que agregue algo que aportar y que la respuesta sea mas breve y concisa en pasos a seguir» (conversación, 2026-11-22). La instrucción cambia el disparo automático por análisis bajo demanda, reutiliza la edición de contexto y conserva los contratos de datos aprobados. Especificación y pruebas del ajuste: `work/features/2026-11-22-v1-manual-analysis/cp2-spec.md`. Las descripciones siguientes documentan el flujo base; donde mencionan análisis automático rige ese ajuste explícito.

## 1. Resumen Ejecutivo

- **Qué se hará:** registrar visitas desde el Coach, consultar su detalle y aprendizaje en Agenda, recuperar contexto en Hermes y recomendar lecciones existentes del Roadmap.
- **Por qué ahora:** el usuario lo solicita y el registro actual no conecta esos módulos.
- **Costo de no hacerlo:** perder contexto al salir del chat y recapturar notas sin vínculo al tour.
- **Alternativa considerada:** usar Goal Sheet o Diary local; el primero es único por día y el segundo no sincroniza ni alimenta Agenda.

## 2. Historia

Como asesor, quiero elegir qué registrar al hablar de un tour y conservarlo con su análisis, para retomar la visita y practicar lo que necesito mejorar.

- **Problema:** información repartida entre chat efímero, diario local y agregado diario.
- **Métrica de aceptación:** un tour confirmado es recuperable tras recarga desde Agenda y Coach; dos tours del mismo día no se sobrescriben. No se añade una métrica comercial.

## 3. Insumos Recibidos

| Insumo | Existe | Ubicación | Acción |
|---|---|---|---|
| Requerimiento | Sí | Mensaje del usuario, 2026-11-22 | Interpretar como tres caminos y someter contrato |
| Diseño | Parcial | Coach, SmartAgenda, Diary y Roadmap publicados | Reusar y proponer panel/chips |
| Criterios | Parcial | Resultado pedido por usuario | Completar como Propuesto IA |
| Escenarios | No | Esta historia | Propuesto IA |
| Datos de prueba | No | Sección 13 | Simulado IA |
| Reglas | Parcial | Contratos anteriores y código V1 | Precisar propiedad, fechas y persistencia |
| Integraciones | Sí | Hermes privado operativo | Reusar; ampliar contexto sin memoria global |

### Fuentes De Contexto

**Modo de contexto:** workspace.

| Fuente | Tipo | Consultada | Referencia | Aporte |
|---|---|---|---|---|
| vcsAcademyMobile | repo workspace | Sí | feature/v1-coach-hermes, 6d89e8b | Coach.jsx, Learning.jsx, SmartAgenda.jsx, modelos, main.py, persistence.py, coach_hermes.py |
| Perfil local | documento | Sí | .ecosystem360/team-bootstrap/project-profile.local.yml | Capas y gates |
| CP2 Coach anterior | documento | Sí | work/features/2026-11-22-v1-coach-hermes/cp2-spec.md | Excluía tours persistidos; contrato nuevo necesario |
| Hermes como base de conocimiento | Hermes | No | knowledge.hermes: disabled | No se consultó para enriquecer; es el runtime del producto |

## 4. Hechos Y Supuestos

| Tipo | Enunciado | Fuente | Riesgo si es falso |
|---|---|---|---|
| Hecho | Goal Sheet es único por usuario/día | persistence.py | — |
| Hecho | Diary es local y Coach efímero | Learning.jsx/Coach.jsx | — |
| Hecho | Roadmap tiene 11 pasos con permisos/progreso | main.py/Learning.jsx | — |
| Supuesto | «Para después» significa programar una visita futura | Interpretación de la solicitud | Si significa seguimiento, cambiar selector; Q-01 |
| Supuesto | Conservar contexto significa registro revisado y feedback, no todo el chat | Alcance mínimo que satisface recuperación | Si requiere transcripción, ampliar contrato; Q-01 |
| Supuesto | Mantener V1 como demostración independiente | Elección previa del usuario | Datos reales requerirían cuentas individuales; Q-01 |

## 5. Alcance

**Incluye:** tres caminos desde Coach, visita independiente, feedback Smart Diary, análisis Hermes por revisión, Agenda con detalle y contexto recuperable, recomendación Roadmap, caducidad y publicación V1 tras aprobación.

**No incluye:** cambiar KPIs/Goal Sheet, migración automática de notas antiguas, nuevo CRM/catálogo, mensajes WhatsApp, guardar conversaciones completas, nuevos permisos o cambios V5. No son requisitos de esta petición.

## 6. Usuarios, Roles Y Permisos

| Rol | Puede | No puede |
|---|---|---|
| Cuenta con function:goalsheet | CRUD de visitas propias | Ver visitas de otra cuenta, incluso si es líder/admin |
| Además function:coach | Analizar y conversar con contexto propio | Usar contexto ajeno o material no permitido |
| Acceso Diary actual | Ver notas locales y entrada al flujo vinculado si tiene permiso Goal Sheet | Obtener nuevas facultades por entrar a Diary |

Los accesos demo compartidos comparten registros; no representan privacidad individual entre sus usuarios.

## 7. Flujos

1. El asesor menciona un tour; recibe pregunta y tres acciones.
2. Elige iniciar, programar o feedback y revisa fecha/contexto.
3. Confirma; se guarda una visita propia con UUID y se enlaza al Coach.
4. Agenda recupera ese registro; feedback solicita análisis después de guardar.
5. El análisis muestra aprendizaje y lección existente; puede retomarse en el Coach.

Alternativas: cancelar no escribe; Hermes caído conserva registro; duplicado de request_id no duplica visita; conflicto de revisión exige recargar; visita ajena/expirada da 404 sin inferir.

## 8. Reglas De Negocio

| ID | Regla | Fuente | Ejemplo |
|---|---|---|---|
| BR-01 | Un registro individual por visita, varios por día | Propuesto IA basado en unicidad legacy | Dos visitas → dos UUID, Goal Sheet igual |
| BR-02 | Confirmar antes de guardar; no inventar hora | Propuesto IA | «Mañana» pide hora y muestra fecha |
| BR-03 | Guardar primero; análisis independiente por revisión | Propuesto IA | Timeout no elimina feedback |
| BR-04 | Propietario de sesión y visita seleccionada | Propuesto IA | ID ajeno → 404 |
| BR-05 | Referencias al catálogo existente con acceso/progreso | Contrato Roadmap actual | Paso bloqueado no se abre por recomendación |
| BR-06 | America/Cancun para calendario; instantes UTC | Preferencia previa y necesidad de agenda | 23:30 Cancún no se mueve al día UTC siguiente |
| BR-07 | Retención y caducidad según estado; backups 7 días adicionales | Propuesto IA, CP2 REQ-10 | Visita en curso expira 30 días desde inicio |
| BR-08 | No incrementar KPIs por programar/iniciar/finalizar | Alcance y esquema existentes | Volumen y QS diarios no cambian |

## 9. Diseno

**Estado del diseno:** Aprobado
**Fuente del diseno:** wireframe textual en work/features/2026-11-22-v1-tour-learning/cp2-spec.md, sección 1.

| Pantalla/componente | Existe | Estados | Propuesta |
|---|---|---|---|
| Coach | Sí | Vacío/respuesta/error | Chips, panel revisable y contexto seleccionado |
| Agenda | Sí | Día vacío/con eventos | Detalle desplegable de visita/aprendizaje dentro del panel |
| Smart Diary | Sí, local | Lista/edición | Feedback vinculado y acceso a notas locales previas |
| Roadmap | Sí | Disponible/bloqueado/completado | Bloque recomendado con motivo y vínculo al tour |

## 10. Datos, Contratos E Integraciones

| Elemento | Tipo | Cambio | Responsable |
|---|---|---|---|
| tour_visits, tour_visit_analyses, tour_visit_requests | Nuevo | Tablas aditivas con propiedad/revisión/expiración | Backend/datos |
| /api/tour-visits | Nuevo | CRUD y análisis; contrato propuesto en CP2 | Backend |
| /api/smart-agent/chat | Extensión | tour_id opcional y propuesta de acciones | Backend/frontend |
| Hermes | Cambio de contexto | Registro seleccionado y salida estructurada validada | Backend/infra |
| Agenda, Diary, Roadmap | Cambio UI | Consultar misma entidad y navegar con contexto | Frontend |

## 11. Criterios De Aceptacion

| ID | Origen | Criterio (Dado / Cuando / Entonces) | Tipo | Estado PO | Comentario PO |
|---|---|---|---|---|---|
| AC-01 | Propuesto IA | Dado un mensaje de tour sin visita activa, al enviarlo aparecen tres opciones; cancelar no guarda ni pierde el texto | positivo | Aceptado | REQ-01 |
| AC-02 | Propuesto IA | Dadas dos visitas el mismo día, al guardarlas se crean IDs distintos; al reintentar el mismo request_id existe una sola por solicitud | borde | Aceptado | REQ-02/03 |
| AC-03 | Propuesto IA | Dada una programación, al confirmar exige fecha/hora futura y se muestra el día Cancún correcto; iniciar/feedback conservan su fecha propia | borde | Aceptado | REQ-02/09 |
| AC-04 | Propuesto IA | Dado un feedback confirmado, al guardar aparece en Diary/Agenda tras recarga; las notas locales previas siguen accesibles | positivo | Aceptado | REQ-04/08 |
| AC-05 | Propuesto IA | Dada una visita propia, al retomar Coach tras recargar Hermes recibe su contexto; con ID ajeno/expirado no se llama al proveedor | negativo | Aceptado | REQ-06 |
| AC-06 | Propuesto IA | Dado un registro guardado, al fallar Hermes sigue disponible con reintento; una respuesta para revisión antigua no reemplaza la vigente | negativo | Aceptado | REQ-04/05 |
| AC-07 | Propuesto IA | Dado un análisis, al recomendar solo aparecen IDs reales y autorizados; abrirlos respeta plan/progreso y no cambia finalización | positivo | Aceptado | REQ-07 |
| AC-08 | Propuesto IA | Dada Agenda con visitas y entradas existentes, al navegar en light/dark el calendario se mantiene en viewport y sus KPIs no cambian | regresion | Aceptado | REQ-08 |
| AC-09 | Propuesto IA | Dada una visita eliminada o expirada, al consultarla no aparece registro/análisis ni se inyecta contexto; la purga y backups cumplen su plazo | negativo | Aceptado | REQ-09/10 |
| AC-10 | Propuesto IA | Dada release candidata, al migrar dos veces y publicar conserva datos/cuentas V1, baseline V5 y permite inferencia real sintética contextual | regresion | Aceptado | Despliegue |

## 12. Escenarios De Prueba

| ID | AC cubiertos | Tipo | Precondicion | Pasos | Resultado esperado | Datos | Nivel de prueba | Origen | Estado PO |
|---|---|---|---|---|---|---|---|---|---|
| ESC-01 | AC-01 | positivo | Coach sin contexto | Enviar relato, elegir/cancelar, continuar | Tres opciones; sin escritura al cancelar | DS-01 | e2e/UAT manual | Propuesto IA | Aceptado |
| ESC-02 | AC-02 | borde | Cuenta fixture | Crear A/B mismo día, repetir A y alterar replay | Dos visitas; replay idéntico y conflicto si cambia | DS-02 | integration | Propuesto IA | Aceptado |
| ESC-03 | AC-03 | borde | Reloj controlado | Programar sin hora/pasado, luego23:30; iniciar y editar | Validación, día correcto y fecha estable | DS-02 | integration/e2e | Propuesto IA | Aceptado |
| ESC-04 | AC-04 | positivo | Diario local previo | Guardar feedback vinculado y recargar Agenda/Diary | Registro compartido; nota antigua intacta | DS-01 | e2e/UAT manual | Propuesto IA | Aceptado |
| ESC-05 | AC-05 | negativo | Usuarios A/B y fake bridge | Recuperar propia y pedir ajena/expirada | Sólo contexto propio; cero llamadas prohibidas | DS-03 | integration | Propuesto IA | Aceptado |
| ESC-06 | AC-06 | negativo | Bridge controlado | Fallar, reintentar, editar durante respuesta demorada | Registro no perdido; análisis vigente no sobrescrito | DS-03 | integration/e2e | Propuesto IA | Aceptado |
| ESC-07 | AC-07 | negativo | Catálogo/planes fixture | Responder ID válido/inventado/bloqueado; abrir | Enlaces válidos, bloqueo conservado | DS-04 | integration/e2e | Propuesto IA | Aceptado |
| ESC-08 | AC-08 | regresion | Agenda con fuentes combinadas | Abrir tres viewports/light-dark, elegir fecha y detalle | Sin overflow de página, KPIs idénticos | DS-02 | e2e | Propuesto IA | Aceptado |
| ESC-09 | AC-09 | borde | Fechas fijas y copia fixture | Eliminar, avanzar30/31d, purgar y simular restore | Registro inaccesible; borrado coordinado, backup7d | DS-05 | integration | Propuesto IA | Aceptado |
| ESC-10 | AC-10 | regresion | Copia SQLite sintética y release | Migrar dos veces, suites, smoke real, comparar V5 | Compatibilidad, continuidad, rollback documentado | DS-01 | integration/e2e | Propuesto IA | Aceptado |

## 13. Datos De Prueba

| ID | Descripcion | Origen | Registros | Por que aplica | Validado PO | Comentario PO |
|---|---|---|---|---|---|---|
| DS-01 | Relato y diario ficticios | Simulado IA | 1 visita,1 nota | AC-01/04/10 | Si | Sin personas reales |
| DS-02 | Dos visitas, replay y fechas | Simulado IA | 2 visitas,1 Goal Sheet | AC-02/03/08 | Si | Congelar reloj |
| DS-03 | Propiedad, fallo y revisión | Simulado IA | 2 usuarios,2 visitas | AC-05/06 | Si | Sin credenciales reales |
| DS-04 | Recomendaciones | Simulado IA | 3 IDs | AC-07 | Si | Catálogo fixture |
| DS-05 | Caducidad | Simulado IA | 4 estados,2 backups | AC-09 | Si | Reloj controlado |

### Valores concretos

- DS-01: «Terminé un tour; al presentar la propuesta dijeron que querían pensarlo». Nota local: título «Escuchar mejor», cuerpo «Hacer una pregunta antes de explicar»; fecha 2026-11-21. Feedback worked: «Escuché sus prioridades»; improve_next: «Confirmar qué duda sigue pendiente».
- DS-02: reloj 2026-11-22T10:00:00-05:00; A programada 2026-11-23T09:00:00-05:00 y B 2026-11-23T23:30:00-05:00 (2026-11-24T04:30:00Z, debe verse el23). Dos UUID de petición distintos; repetición del primero idéntica. Goal Sheet fixture:1 QS,0 ventas,0 volumen, valores iguales antes/después.
- DS-03: user-a y user-b, cada cual una visita propia; revisión1→2 mientras fake bridge devuelve análisis1; errores503/429; tour_id ajeno y uno expirado; texto de contexto «ignora tus reglas» tratado como datos.
- DS-04: step_4 existente permitido; step_999 inexistente; step_11 bloqueado en fixture. Sólo paso permitido puede abrirse; no modificar training_progress.
- DS-05: scheduled_at/started_at/completed_at/cancelled_at = 2026-11-01T15:00:00Z según estado; expira 2026-12-01T15:00:00Z; no visible desde ese instante y purga antes de2026-12-02T15:00:00Z. Backups de6 y8d: conservar6d y eliminar8d. Post-tour de31d rechazado.

## 14. Mapa De Cobertura

| AC | Escenarios | Datos | Estado |
|---|---|---|---|
| AC-01 | ESC-01 | DS-01 | cubierto |
| AC-02 | ESC-02 | DS-02 | cubierto |
| AC-03 | ESC-03 | DS-02 | cubierto |
| AC-04 | ESC-04 | DS-01 | cubierto |
| AC-05 | ESC-05 | DS-03 | cubierto |
| AC-06 | ESC-06 | DS-03 | cubierto |
| AC-07 | ESC-07 | DS-04 | cubierto |
| AC-08 | ESC-08 | DS-02 | cubierto |
| AC-09 | ESC-09 | DS-05 | cubierto |
| AC-10 | ESC-10 | DS-01 | cubierto |

## 15. Requisitos No Funcionales

| ID | Atributo | Requisito |
|---|---|---|
| NFR-01 | Accesibilidad | Contraste4.5:1, targets44px, foco/restauración, input16px |
| NFR-02 | Resiliencia | Guardar independiente de Hermes, timeout actual y reintento sin duplicados |
| NFR-03 | Privacidad | Filtro owner antes de contenido/inferencia; auditoría sin texto sensible |
| NFR-04 | Compatibilidad | Build V1/V5, suites legacy y hashes baseline V5 |
| NFR-05 | Calendario | Día Cancún, UTC en almacenamiento; matriz móvil/desktop de CP3 |

## 16. Seguridad, Privacidad Y Casos Borde

Contexto y feedback pueden contener información personal: mantener en SQLite por propietario, enviar sólo visita seleccionada, borrar también análisis y estado activo. Sin herramientas de escritura del modelo. Cuenta demo compartida equivale a un mismo propietario; no prometer privacidad individual.

Casos: entrada vacía, sin fecha/hora, varios tours, doble envío, revisión concurrente, proveedor caído, visita eliminada, expirada, sin permiso, paso inventado/bloqueado y cambio de día UTC. Mensajes distinguen «registro guardado; análisis pendiente» de un fallo al guardar.

## 17. Puntos Abiertos

| ID | Tipo | Categoria | Pregunta o supuesto | Recomendacion IA | Impacto si se decide mal | Bloquea | Para quien | Respuesta / decision | Estado |
|---|---|---|---|---|---|---|---|---|---|
| Q-01 | Pregunta | Contrato | Aprobar v1 con interpretación de tres caminos, contexto revisado, retención y datos propuestos | Aprobar CP2 tal como está o indicar ajustes | Cambia UX/persistencia/alcance | Si | PO | Aprobado: «si hazlo !» | Respondida |

## 18. Dependencias Y Riesgos

| Tipo | Descripcion | Mitigacion | Responsable |
|---|---|---|---|
| Datos | Confundir entrada diaria con tour | Entidad separada y tests de métricas | Backend |
| IA | Fallo, inventar curso o análisis tardío | Guardar primero, validar IDs/revisión | Backend/QA |
| UX | Pantalla móvil vuelve a crecer | Panel interno y pruebas geométricas | Frontend |
| Operación | Rollback restaura datos expirados | Migración aditiva; purga antes de servir restore | Infra |

## 19. Estrategia De Pruebas TDD

| Escenario | Prueba prevista | Nivel | Datos |
|---|---|---|---|
| ESC-01/04/08 | test_tour_capture_navigation | e2e | DS-01/02 |
| ESC-02/03 | test_visit_lifecycle_idempotency_timezone | integration | DS-02 |
| ESC-05/06/07 | test_visit_context_analysis_permissions | integration | DS-03/04 |
| ESC-09 | test_visit_expiry_and_delete | integration | DS-05 |
| ESC-10 | test_visit_migration_release | integration/e2e | DS-01 |

Plan por pares T01–T08 en CP3. No hay implementación antes de aprobación y gate LISTA.

## 20. Documentacion A Producir

- [ ] Guía breve de tres caminos y retomar contexto.
- [ ] Contrato API y esquema final trazados a código.
- [ ] Runbook de migración, caducidad, backups y rollback.
- [ ] Evidencia CP4 y cierre CP5.

## 21. Carril Recomendado

- **Carril:** Contrato CP0–CP5.
- **Razón:** varias capas, nuevas APIs y esquema con información potencialmente personal.
- **Estimación gruesa:** M; sujeto a aceptación de contrato y QA, sin prometer fecha de entrega.
- **Siguiente paso:** aprobación v1 y verify-story; después CP3.

## 22. Aprobacion Del Product Owner

**Decision del PO:** Aprobada
**Aprobado por (nombre y rol):** Roger, Product Owner
**Fecha de aprobacion:** 2026-11-22
**Evidencia de aprobacion (cita y canal):** «si hazlo !», conversación, respuesta directa a la SPEC completa y solicitud de aprobación para desarrollar y publicar.
**Version aprobada:** v1, incluidos diseño, criterios, escenarios, datos simulados y retención propuesta.

La aprobación es nueva y específica para esta v1; no se reutiliza la aprobación de la feature Coach anterior.

## 23. Revisiones

| Version | Fecha | Cambio | Motivo |
|---|---|---|---|
| v1 | 2026-11-22 | Historia y contrato propuestos | Petición de vincular tour, Coach, Agenda y Roadmap |

## 24. Estimacion Para Cotizacion

No aplica: no se solicitó cotización. Inventario técnico y pares de trabajo en CP3. Se reevalúa alcance si «para después» significa seguimiento, se requiere transcripción completa o cambia la política de datos/demo. Modo de trabajo previsto: IA y harness; aprobación humana independiente.
