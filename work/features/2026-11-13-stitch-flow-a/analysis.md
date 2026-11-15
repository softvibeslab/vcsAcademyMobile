# Adaptación de lámina A de Stitch

Fuente consultada en vivo: projects/11832430028020238900, instancia wireframe-a, pantalla 1213c67cd10242cb8f48135613bc0b68. Copia HTML en source.html. Solicitud del usuario: analizar y ajustar el flujo a la app publicada.

## Diferencias verificadas y alcance
| Fuente | App anterior | Ajuste |
| --- | --- | --- |
| A01 → A02 → A03 | Comenzar saltaba a perfil | Introducción independiente con progreso y retorno |
| A03 Rep → A04 | Selector disponible | Mantener rol y navegación atrás |
| A04 selección única + Continuar → C01/D01/E01 | Click abría login, D01 se confundía con práctica | Selección explícita + Continuar; abrir módulo como invitado sin login automático |
| A05 alta/invitado PROPUESTO | No existía alternativa | Pantalla de acceso por invitación y prueba temporal; no simular registro público sin endpoint |
| A03 gerente → G01; dirección → G05 | Ambos llevaban a login/Home | Entradas públicas específicas; acceso al equipo/admin con autorización real |
| A06 login → B01 | Funciona | Acceso directo a Home; conserva destino al venir de un módulo |
| A07 reset/confirmación/nueva clave/enlace inválido | Un formulario y mensajes mezclados | Estados separados, confirmación de contraseña, reintento y limpieza de errores |
| Prueba temporal | Ausente | Exploración frontend sin usar credenciales demo ni datos privados; pierde estado al recargar |

La lámina distingue explícitamente propuestas de funciones existentes. Registro público, Google/Apple y personalización avanzada quedan fuera: no hay contratos operativos. ES/EN se conserva como pendiente de localización integral, no se dibuja un selector que no traduce la app. Se mantiene el diseño visual actual; los códigos A01/G01 son trazabilidad, no texto de producto.

## Contrato de implementación
Solo frontend; API existente intacta. Invitado consulta catálogo canónico local y materiales ilustrativos, y usa únicamente `/api/smart-agent/public-chat` para preguntas. Acciones de persistencia/roleplay/equipo requieren sesión real. Ninguna elección de rol concede permisos. Sin migraciones, nuevas dependencias ni cuentas automáticas. Publicar nuevo release estático en aisales preservando API, base y /prototipo/.

## Aceptación
Introducción en orden; selector no dispara login; tres destinos abren sin token; CTA de guardar solicita acceso conservando destino; invitado no consulta endpoints privados; gerente/dirección diferenciados; login/error/back/recovery funcionan; refresh de invitado reinicia la prueba; navegación móvil sin overflow; despliegue HTTPS verificado.
