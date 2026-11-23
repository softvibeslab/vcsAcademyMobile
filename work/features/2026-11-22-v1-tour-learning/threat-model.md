# Revisión de límites de la feature

**Alcance:** visitas privadas por cuenta, contexto enviado a Hermes y registro de aprendizaje. No cambia autenticación.

| Límite | Riesgo concreto | Control y evidencia requerida |
|---|---|---|
| Cliente → API | Cambiar UUID para consultar una visita ajena | Owner de sesión en cada operación; 404; pruebas backend de acceso |
| Mensaje → escritura | IA afirma guardar o ejecuta instrucciones del relato | Confirmación/formulario y API ejecutan escritura; modelo sin herramientas |
| SQLite → Hermes | Inyectar notas o contexto de otra visita | tour_id validado, bloque seleccionado y acotado; pruebas del adaptador |
| Modelo → UI | Curso inventado, HTML o salida inválida | Esquema y catálogo de pasos abiertos; texto escapado por React |
| Edición → análisis tardío | Sobrescribir aprendizaje con contexto viejo | revision + lease; respuesta vieja rechazada; tests concurrencia |
| Red → reintento | Crear visitas duplicadas o resucitar borradas | UUID de petición, replay y tombstones sin narrativa |
| Expiración → respaldos | Mantener copias más allá del plazo | Ocultación inmediata al vencer, purga diaria, backups7d; purga antes de restore |
| Rollback → operación | Desactivar expiración al volver a API anterior | Timer con imagen propia fijada, instalado antes de smoke público |

Las pruebas usan datos sintéticos. No se guardan tokens, contraseñas, narrativas reales ni bases de producción en el repositorio. La cuenta demo compartida conserva un propietario común: el aislamiento comprobado es entre cuentas distintas.
