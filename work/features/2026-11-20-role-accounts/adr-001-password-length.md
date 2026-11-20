# ADR-001 · Claves de diez caracteres

**Status:** accepted

El usuario pidió expresamente claves de no más de diez caracteres. Las nuevas claves temporales tienen exactamente diez, con generación criptográfica aleatoria, letras y números. Se aplica el mismo generador a la recuperación manual.

El mínimo del cambio personal pasa de doce a diez para no imponer una contraseña más larga. El máximo de 128 y el login anterior conservan compatibilidad con cuentas existentes. No se modifican el hash, CSRF, caducidad de 48 horas ni los límites de intentos.
