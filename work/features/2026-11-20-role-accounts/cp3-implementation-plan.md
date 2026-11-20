# CP3 · Implementación

**Status:** implemented

## Repo Paths

- `backend/app/pilot/identity.py`: generador de claves para altas y recuperación.
- `backend/app/pilot/auth.py`: validación de nueva contraseña.
- `frontend/src/pilot-v5/App.jsx`: atributos y mensajes del formulario.
- `backend/tests/pilot/test_identity.py`, `test_auth.py`: longitud, hash, permisos y cambio real.
- `deploy-update.sh`: nueva imagen y web sobre la misma base, con respaldo y corte coordinado de nginx.

## Pares test/impl

| Par | Prueba antes de implementación | Implementación |
|---|---|---|
| T01 | Alta y recuperación deben generar diez caracteres | Generador criptográfico compartido |
| T02 | Rechazar nueve y aceptar diez en el cambio; comprobar login posterior | Nuevo mínimo de diez |
| T03 | Frontera del formulario contra API real | Atributos y mensajes bilingües |
| T04 | Login y rol de ambas cuentas nuevas | Provisión privada y entrega al correo indicado |

Excepción TDD: atributos y copy de UI, y configuración de despliegue. La frontera funcional se prueba en API y navegador; no se agregan pruebas que solo repitan constantes de la implementación.
