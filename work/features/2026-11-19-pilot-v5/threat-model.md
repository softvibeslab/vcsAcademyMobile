# Modelo de amenazas · piloto v5

**Estado:** propuesta documental; no auditoría del VPS ni evidencia de corrección implementada.

## Activos y límites

Cuentas, pertenencia a organización, tours/resultados, metas, notas/Diario privados, PDFs, progreso y permisos. Navegador y enlaces externos son entradas no confiables. La API decide identidad y ámbito; el almacenamiento de archivos está fuera del sitio público. Proveedores de video se incrustan únicamente desde dominios permitidos.

| Amenaza concreta | Control del contrato | Prueba requerida |
|---|---|---|
| Registrar el correo autorizado de otra persona | Sin autocreación por solo conocer correo; alta manual y contraseña temporal entregada fuera del sitio | Registro público denegado; temporal obliga cambio |
| Recuperar cuenta ajena con respuesta demo | Eliminar respuesta pública con reset_token en modo piloto; recuperación manual y revocación | Correo existente/inexistente no entrega token |
| Catálogo o seed demo crea acceso lateral | Catálogo demo deshabilitado y semilla demo prohibida en piloto | Inicio repetido de API no crea usuarios demo |
| Vendedor fuerza rol/organization_id o cambia ID | Ignorar identidad del payload; autorización en todas las consultas/mutaciones | Matriz de dos organizaciones, dos vendedores y dueño |
| Dueño consulta notas privadas de su equipo | El endpoint de notas filtra propietario; no usar permiso de dueño como bypass | 403/404 sin contenido aun para dueño |
| Cuenta revocada mantiene cookie válida | Verificar estado/membresía en cada petición; invalidar sesiones al revocar | Cookie previa falla inmediatamente |
| CSRF o sesión robada por JS | Cookie HttpOnly/Secure/SameSite, validación Origin/token CSRF según contrato; no persistir bearer nuevo en localStorage | Mutación cross-origin rechazada |
| PDF o URL inyecta script, SSRF o path traversal | Hosts y formato de enlace permitidos; sin fetch arbitrario; PDF validado y servido privado con cabeceras seguras | MIME falso, archivo excesivo, path traversal, URL no permitida |
| Enlace directo evita candado de lección | API de lección y descarga PDF propias exigen permiso actual; caché privada | Revocar y repetir URL de la app falla; no se promete bloquear una URL externa de video ya conocida ni DRM |
| Reintento duplica ventas o solicitud | Idempotencia por usuario/operación y transacciones; revisiones para edición | Repetir creación devuelve mismo resultado; edición stale 409 |
| Auditoría expone notas/contraseñas | Guardar actor/acción/referencia/revisión, sin texto sensible ni secretos | Inspección de fixtures de auditoría y logs |
| Restauración borra datos posteriores | Backup consistente, ensayo aislado y plan de recuperación que preserva escrituras nuevas | Ensayo de rollback/restore con conteos y checksums |

## Límites de evidencia

Los mecanismos demo se observaron en el código. No se afirmó exposición actual de los servidores. La auditoría del 16 de noviembre citada en el adjunto no sustituye un preflight nuevo. Los cambios de infraestructura se describirán sobre la configuración real antes de ejecutarlos.
