# Ajuste del verificador SSH

La primera comprobación esperaba la palabra `session` en el diagnóstico de rechazo. OpenSSH devuelve `channel 0: open failed: connect failed: open failed` para MaxSessions=0, con exit255 y salida vacía. Se ajustó la expectativa al rechazo real de apertura de canal; no se cambió la política SSH. El destino permitido funcionó y destino22/forwardremoto fueron rechazados desde la primera ejecución.
