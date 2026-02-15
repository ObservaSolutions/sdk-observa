# Consumo del SDK

Guía de integración para consumir el backend desde el SDK: credenciales, headers, payloads, respuestas y manejo de errores.

## Requisitos
- `baseUrl` del backend con prefijo `/v1`.
- `apiKey` activa de la organización.
- `dsnKey` del proyecto.

## Provisión de credenciales
1. Crear organización para obtener `apiKey` en texto plano.
2. Crear proyecto para obtener `dsnKey`.
3. Guardar ambas credenciales en la configuración del SDK.

## Autenticación
El SDK autentica todas las llamadas con el header:
- `x-api-key: <apiKey>`

Si la API key está acotada por proyecto, el `dsnKey` debe pertenecer a uno de los proyectos permitidos.

## Identificación de proyecto y origen del error
- Cada proyecto tiene su propio `dsnKey`. Si una organización tiene varios proyectos (por ejemplo, Backend API y Web Frontend), el SDK debe usar el `dsnKey` correspondiente para que el evento quede asociado al proyecto correcto.
- El backend no “descubre” el origen; el SDK envía el contexto del error dentro del payload y el backend lo persiste íntegro para análisis posterior.

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
- `context` para agrupar información técnica del entorno y request.

## Health del SDK
Este endpoint valida `apiKey` y `dsnKey` para confirmar conectividad y credenciales.

### Ruta
`POST /v1/ingest/health`

### Headers
- `Content-Type: application/json`
- `x-api-key: <apiKey>`

### Body
```json
{
  "dsnKey": "dsn_123"
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
- `x-api-key: <apiKey>`
- `x-idempotency-key: <string>` (opcional, máximo 128 caracteres)
- `x-sdk-version: <string>` (opcional)

### Body
```json
{
  "dsnKey": "dsn_123",
  "event": {
    "event_id": "evt_123",
    "timestamp": "2026-01-25T10:00:00.000Z",
    "schema_version": 1,
    "level": "error",
    "message": "Error en servicio",
    "exception": {
      "type": "Error",
      "value": "Timeout"
    },
    "context": {
      "system": {
        "pid": 1234,
        "uptimeSeconds": 420,
        "memory": {
          "rss": 123456,
          "heapTotal": 123456,
          "heapUsed": 123456,
          "external": 123456,
          "arrayBuffers": 123456
        }
      },
      "runtime": {
        "node": "20.0.0",
        "platform": "linux",
        "arch": "x64",
        "releaseName": "node"
      },
      "request": {
        "requestId": "req_123",
        "userId": "user_123"
      }
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
- `403 INVALID_API_KEY`
- `429 RATE_LIMITED`

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
- Usar `context.system` para datos dinámicos y `context.runtime` para datos estáticos.
- Evitar enviar `runtime.versions` si no es necesario por tamaño o privacidad.
