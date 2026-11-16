# Autenticación JWT

Demostración independiente con Node.js 20 o posterior. El login emite un JWT firmado con HS256, válido por 15 minutos. La ruta de perfil verifica su firma y expiración antes de devolver los datos de la cuenta de prueba.

## Inicio

```bash
DEMO_PASSWORD='demo-tcs-local' npm start
```

La API escucha en `http://127.0.0.1:4176`. La clave de firma se genera al iniciar el proceso y los tokens anteriores dejan de funcionar tras un reinicio.

## Evidencia en Postman o Bruno

1. Envía `POST /api/auth/login` con el cuerpo JSON mostrado abajo. Debe responder `200 OK` con `access_token`, `token_type` y `expires_in`.
2. Envía `GET /api/profile` seleccionando **Bearer Token** en Authorization y pega el valor de `access_token`. Debe responder `200 OK` con el correo.
3. Repite el GET con **No Auth**. Debe responder `401 Unauthorized`.

```json
{
  "email": "demo@example.com",
  "password": "demo-tcs-local"
}
```

Oculta el valor del token en las capturas.
