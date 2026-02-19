# SDK

## Objetivo
Definir el flujo completo de integración del SDK con el backend para ingesta de eventos y heartbeats de uptime, incluyendo credenciales, rutas, payloads, respuestas y errores.

## Alcance
Incluye únicamente procesos que el SDK usa de forma directa:
- Ingesta de eventos de errores.
- Ingesta de heartbeats de uptime.

Incluye además el flujo de provisión de credenciales (API key y DSN) necesario para que el SDK funcione.

## Flujo de provisión de credenciales (pre-requisito del SDK)
1. Crear organización y admin inicial.
2. Crear proyecto para obtener `dsnKey`.
3. Guardar `apiKey` y `dsnKey` en la configuración del SDK.

### Rutas relacionadas
- `POST /v1/organizations`
- `POST /v1/organizations/:organizationId/projects`

### Respuesta esperada (resumen)
- `apiKey.key` se devuelve solo una vez al crear la organización.
- `dsnKey` se devuelve al crear el proyecto.

## Autenticación SDK
El SDK usa autenticación por API key en header:
- Header: `x-api-key: <apiKey>`
Además envía el `dsnKey` en el body para identificar el proyecto.
Cuando la API key tiene scope por proyecto, el `dsnKey` debe pertenecer a uno de esos proyectos.

## Flujo principal del SDK
1. Inicializar el SDK con `baseUrl` (incluye `/v1`), `apiKey`, `dsnKey`.
2. En cada error, construir un evento y enviarlo a `/v1/ingest/events`.
3. Si se habilita uptime, enviar heartbeats a `/v1/uptime/heartbeats`.
4. Manejar errores HTTP y reintentos desde el SDK.

## Endpoints SDK

### 1) Ingesta de eventos
**Ruta**
- `POST /v1/ingest/events`

**Headers**
- `Content-Type: application/json`
- `x-api-key: <apiKey>`
- `x-idempotency-key: <string>` (opcional, máximo 128 caracteres)
- `x-sdk-version: <string>` (opcional)

**Body**
```json
{
  "dsnKey": "dsn_123",
  "event": {
    "event_id": "evt_123",
    "timestamp": "2026-01-25T10:00:00.000Z",
    "level": "error",
    "message": "Error en servicio",
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

**Respuesta**
```json
{
  "event_id": "evt_123"
}
```

**Headers de respuesta**
- `x-protocol-version: 1`
- `x-sdk-version: <string>` (solo si se envía el header en la request)

**Reglas y validaciones**
- `dsnKey` es obligatorio.
- `event` debe ser un objeto.
- `event.event_id` es opcional; si falta o es inválido se genera uno nuevo.
- `event.timestamp` se acepta en ISO 8601; si es inválido se ignora.
- `event.level` permitido: `debug`, `info`, `warn`, `error`, `fatal` (case-insensitive).
- Tamaño máximo de payload: 64 KB.
- Si Redis está habilitado, el evento se encola y se persiste en background.

**Errores comunes**
- `400 INVALID_PAYLOAD` si falta `dsnKey` o `event`.
- `400 INVALID_IDEMPOTENCY_KEY` si `x-idempotency-key` supera 128 caracteres.
- `400 Payload too large` si el body supera 64 KB.
- `400 Ingest queue full` si la cola en Redis supera el límite.
- `404 INVALID_DSN` si el `dsnKey` no existe.
- `403 INVALID_API_KEY` si la API key no pertenece a la organización o no tiene acceso al proyecto.

**Notas de idempotencia**
- Si `event_id` se repite para el mismo proyecto, la respuesta devuelve el `event_id` existente.
 - `x-idempotency-key` permite reintentos seguros cuando no se envía `event_id`.

### 2) Ingesta de heartbeats de uptime
**Ruta**
- `POST /v1/uptime/heartbeats`

**Headers**
- `Content-Type: application/json`
- `x-api-key: <apiKey>`

**Body**
```json
{
  "dsnKey": "dsn_123",
  "status": "up",
  "responseTimeMs": 120,
  "checkedAt": "2026-01-25T10:00:00.000Z",
  "message": "OK"
}
```

**Respuesta**
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

**Reglas y validaciones**
- `dsnKey` es obligatorio.
- `status` obligatorio: `up`, `down`, `degraded`.
- `responseTimeMs` opcional, debe ser número >= 0.
- `checkedAt` opcional en ISO 8601; si no se envía se usa el tiempo actual.
- `message` opcional; si está vacío se ignora.

**Errores comunes**
- `400 Invalid heartbeat payload` si falta `dsnKey` o `status`.
- `400 Invalid status` si el status no coincide con los valores permitidos.
- `400 Invalid checkedAt` si el formato de fecha es inválido.
- `400 Invalid response time` si `responseTimeMs` no es número válido o < 0.
- `404 Project not found` si el `dsnKey` no existe.
- `403 Organization mismatch` si la API key no pertenece a la organización del proyecto.

## Casos de uso del SDK
1. Capturar excepción no controlada y enviar evento con stacktrace.
2. Capturar error manual y enviar evento con tags y contexto adicional.
3. Registrar heartbeats periódicos para detectar downtime o degradación.
4. Enviar heartbeats con latencia (`responseTimeMs`) para calcular estado degraded.

## Buenas prácticas para el SDK
- Reintentar en errores temporales (5xx, timeouts).
- Evitar enviar payloads mayores a 64 KB.
- Normalizar `level` a minúsculas.
- Generar `event_id` UUID si el usuario no lo provee.
- Enviar `timestamp` en UTC ISO 8601.

## Variables de entorno recomendadas (SDK)
- `OBSERVA_BASE_URL`
- `OBSERVA_API_KEY`
- `OBSERVA_DSN_KEY`
