# Consumo del SDK

Guía de integración para consumir el backend desde el SDK: credenciales, headers, payloads, respuestas y manejo de errores.

## Requisitos
- `baseUrl` del backend con prefijo `/v1`.
- **Backend/Servidor**: `apiKey` activa de la organización + `dsnKey` del proyecto.
- **Frontend/Mobile**: `publicKey` del proyecto + `dsnKey` del proyecto.

## Provisión de credenciales
1. Crear organización para obtener `apiKey` en texto plano (uso exclusivo servidor).
2. Crear proyecto indicando su tipo (`FRONTEND`, `BACKEND`, `MOBILE`).
3. Obtener `dsnKey` (siempre) y `publicKey` (solo si es frontend/mobile).
4. Configurar el SDK con las credenciales apropiadas según el entorno.

## Autenticación

El SDK debe autenticar las llamadas usando uno de los siguientes métodos:

### Opción A: Entornos Seguros (Backend)
Usar el header `x-api-key`.
- `x-api-key: <apiKey>`

### Opción B: Entornos Públicos (Frontend/Mobile)
Usar el parámetro `publicKey` en el body o query params (según implementación del SDK), aunque el estándar actual es validar contra la `publicKey` asociada al proyecto en el backend.
Para efectos de este backend, la autenticación en ingestión pública se valida mediante la combinación de `dsnKey` y el origen, pero si se dispone de `publicKey`, esta puede ser usada para validar cuotas específicas.

**Nota Importante**: En la implementación actual del endpoint de ingestión (`/v1/ingest/events`), se prioriza la validación por `x-api-key` para backend. Para frontend, el sistema valida el acceso mediante el `dsnKey` y opcionalmente `publicKey` si se implementa en headers futuros, pero actualmente el mecanismo principal de rate limiting público se basa en IP y `publicKey` si se envía como metadato.

*Actualización*: Se ha habilitado el uso de `publicKey` para identificar el proyecto en entornos donde no se puede exponer la `apiKey`.

## Identificación de proyecto y origen del error
- Cada proyecto tiene su propio `dsnKey`.
- **Proyectos Frontend/Mobile**: Deben usar `publicKey` para que el backend aplique rate limiting por IP y proteja la organización de abuso.
- **Proyectos Backend**: Usan `apiKey` de organización + `dsnKey`.

## Protección y Rate Limiting
El backend implementa protección contra abuso:
- **Por IP**: Límite de 10 peticiones por segundo por IP.
- **Por PublicKey**: Límite de 100 peticiones por segundo por proyecto (si se usa publicKey).
- **Bloqueo**: Clientes que abusen del sistema pueden ser marcados como `SUSPICIOUS` o `BLOCKED`, rechazando sus eventos automáticamente.

## Trazabilidad y stacktrace
Para identificar archivo, función y línea, el SDK debe enviar `exception.stacktrace.frames` en el evento. Ejemplo:
```json
{
  "exception": {
    "type": "Error",
    "value": "Timeout",
    "stacktrace": {
      "frames": [
        {
          "filename": "src/service.ts",
          "function": "doWork",
          "lineno": 42,
          "colno": 13
        }
      ]
    }
  }
}
```
Además se recomienda enviar:
- `tags` para clasificar origen lógico (por ejemplo `service`, `module`, `env`).
- `extra` para contexto adicional del negocio (por ejemplo `orderId`, `userId`).

## Health del SDK
Este endpoint valida `apiKey` (o `publicKey`) y `dsnKey` para confirmar conectividad y credenciales.

### Ruta
`POST /v1/ingest/health`

### Headers
- `Content-Type: application/json`
- `x-api-key: <apiKey>` (Solo Backend)

### Body
```json
{
  "dsnKey": "dsn_123",
  "publicKey": "pk_123" // Opcional, recomendado para Frontend/Mobile
}
```

### Respuesta
```json
{
  "ok": true
}
```

### Errores comunes
- `400 INVALID_PAYLOAD`
- `404 INVALID_DSN`
- `401 INVALID_API_KEY`
- `403 INVALID_API_KEY`

## Envío de eventos de errores
### Ruta
`POST /v1/ingest/events`

### Headers
- `Content-Type: application/json`
- `x-api-key: <apiKey>` (Solo Backend)
- `x-idempotency-key: <string>` (opcional, máximo 128 caracteres)
- `x-sdk-version: <string>` (opcional)

### Body
```json
{
  "dsnKey": "dsn_123",
  "publicKey": "pk_123", // Requerido para entornos sin x-api-key
  "event": {
    "event_id": "evt_123",
    "timestamp": "2026-01-25T10:00:00.000Z",
    "level": "error",
    "message": "Error en servicio",
    "exception": {
      "type": "Error",
      "value": "Timeout"
    },
    "tags": {
      "service": "billing"
    },
    "extra": {
      "orderId": "ord_123"
    }
  }
}
```

### Respuesta
```json
{
  "event_id": "evt_123"
}
```

### Headers de respuesta
- `x-protocol-version: 1`
- `x-sdk-version: <string>` cuando se envía el header en la request

### Errores comunes
- `400 INVALID_PAYLOAD`
- `400 INVALID_IDEMPOTENCY_KEY`
- `400 Payload too large`
- `400 Ingest queue full`
- `404 INVALID_DSN`
- `403 INVALID_API_KEY` / `MISSING_PUBLIC_KEY`
- `429 RATE_LIMITED` (Por IP o por Proyecto)

## Comportamiento de persistencia
- El payload del evento se guarda completo para trazabilidad.
- Si Redis está disponible, el evento se encola y se persiste en background.
- Si Redis no está disponible, el evento se persiste en la base de datos de forma inmediata.

## Envío de heartbeats de uptime
### Ruta
`POST /v1/uptime/heartbeats`

### Headers
- `Content-Type: application/json`
- `x-api-key: <apiKey>`

### Body
```json
{
  "dsnKey": "dsn_123",
  "status": "up",
  "responseTimeMs": 120,
  "checkedAt": "2026-01-25T10:00:00.000Z",
  "message": "OK"
}
```

### Respuesta
```json
{
  "heartbeat": {
    "id": "hb_123",
    "status": "up",
    "responseTimeMs": 120,
    "checkedAt": "2026-01-25T10:00:00.000Z",
    "message": "OK"
  }
}
```

### Errores comunes
- `400 Invalid heartbeat payload`
- `400 Invalid status`
- `400 Invalid checkedAt`
- `400 Invalid response time`
- `404 Project not found`
- `403 Organization mismatch`

## Idempotencia y reintentos
- Si se envía `event.event_id`, el backend deduplica por proyecto.
- Si no se envía `event_id`, usar `x-idempotency-key` para reintentos seguros.
- Evitar reintentos cuando el error es de validación 4xx.

## Buenas prácticas
- No superar 64 KB por evento.
- Enviar `timestamp` en ISO 8601 UTC.
- Normalizar `level` a minúsculas.
- Registrar `x-sdk-version` para trazabilidad.
- Incluir `tags` y `extra` consistentes para facilitar agrupaciones y filtros.
