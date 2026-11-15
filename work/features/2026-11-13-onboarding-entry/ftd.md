# Corrección del flujo de entrada de Representante

## Claridad
Solicitud: al continuar con Rep mostrar «¿Por dónde prefieres empezar?» y las tres opciones aportadas por el usuario.
Hecho cuando: Rep → selector; Roadmap/C01, Coach/D01 y Bóveda/E01 disponibles; conservar destino al autenticarse, sin otorgar acceso por seleccionar un rol. Acceso existente y otros roles se conservan.
Alcance: frontend; sin contratos ni cambios en autorización.

## Evidencia
| Paso | Estado | Comando | Resultado |
| --- | --- | --- | --- |
| T01 | RED | node work/features/2026-11-13-onboarding-entry/verify.cjs | No aparece el selector después de continuar como Rep; red.txt |
| T01 | GREEN | node work/features/2026-11-13-onboarding-entry/verify.cjs | Las tres opciones conservan el destino tras acceso; 390px sin desbordamiento; green.txt |
| Build | PASS | npm run build:web | Ambas entradas compiladas; build.txt |
| Regresión | PASS | node --test frontend/src/pilot/model.test.mjs | 5 pruebas aprobadas |

## Cierre TRUST 5
Solicitud y textos trazados al selector; RED/GREEN ejecutados; no se omite autorización del backend; cambios limitados a Auth, destino de login y estilos. La sesión solo se solicita después de elegir una sección; al entrar se abre esa sección en lugar de Home. C01 → Roadmap, D01 → Roleplay, E01 → Bóveda. Los códigos internos no se muestran como contenido al usuario.
