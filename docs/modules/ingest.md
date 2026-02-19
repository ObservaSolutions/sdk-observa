# Ingest

## Objetivo
Registrar eventos de errores enviados por el SDK y asociarlos a un proyecto.

## Rol en el negocio
Es la puerta de entrada de la observabilidad. Cada evento alimenta la creación de incidentes y el histórico de fallas, por lo que este módulo valida el origen y persiste el payload completo para análisis posterior.

## Funcionamiento
- **Autenticación**:
  - Backend: Requiere header `x-api-key`.
  - Frontend/Mobile: Puede usar `publicKey` en el payload en lugar de `x-api-key`.
- **Identificación**: El SDK envía `dsnKey` (siempre) y `publicKey` (si aplica).
- **Protección**: Se valida rate limiting por IP y por proyecto antes de procesar.
- **Idempotencia**: Se permite por header `x-idempotency-key` (máximo 128 caracteres).
- **Respuesta**: Se responde con `x-protocol-version: 1` y refleja `x-sdk-version` si se envía.
- **Normalización**: `event_id` (o se genera si falta) con tope de 128 caracteres.
- **Validación**: `timestamp` se parsea y se guarda solo si es válido. `level` se normaliza. Tamaño del payload se valida.
- **Cola**: Si Redis está disponible, se encola el evento y se drena en background.

## Reglas y validaciones
- El `dsnKey` o `publicKey` debe pertenecer a un proyecto activo.
- **Validación de API Key**:
  - Si se envía `x-api-key`: Se valida que pertenezca a la organización del proyecto.
  - Si NO se envía `x-api-key`: Se requiere `publicKey` válida asociada al proyecto.
- El payload del evento se guarda íntegro para trazabilidad.
- Límite de tamaño de payload (64 KB por evento).
- Idempotencia por índice único `(projectId, eventId)`; reintentos no duplican.

## Flujos principales
- Ingesta inmediata a base de datos cuando no hay Redis.
- Ingesta con backpressure usando Redis como buffer.
- Retorno inmediato de `event_id` para soporte de reintentos del SDK.

## Consumos y dependencias
- Consume **projects** para resolver `dsnKey` o `publicKey` a `projectId`.
- Consume **auth** para validar API key (si se proporciona).
- Consume **ingest-protection** para rate limiting y validación de clientes sospechosos.
- Consume **redis** cuando está habilitado para buffering.

## Endpoints
- `POST /v1/ingest/events` ingesta de eventos del SDK.
- `POST /v1/ingest/health` verificación de conectividad y credenciales.

## Casos de error
- `INVALID_PAYLOAD` cuando falta `dsnKey` y `publicKey`, o falta `event`.
- `INVALID_DSN` cuando las credenciales no pertenecen a ningún proyecto.
- `INVALID_API_KEY` cuando la API key no coincide o es requerida pero no enviada (en proyectos Backend).
- `MISSING_PUBLIC_KEY` si se intenta acceso público sin `publicKey`.
- `RATE_LIMITED` cuando se alcanza el límite de ingesta (por IP o Proyecto).
- `Payload too large` cuando supera 64 KB.
- `Ingest queue full` cuando la cola de Redis está saturada.

## Ejemplos de payloads
- Ingesta de evento (Backend)
  ```json
  {
    "dsnKey": "dsn_123",
    "event": { ... }
  }
  ```
- Ingesta de evento (Frontend)
  ```json
  {
    "dsnKey": "dsn_123",
    "publicKey": "pk_456",
    "event": { ... }
  }
  ```
