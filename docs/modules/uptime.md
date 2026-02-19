# Uptime

## Objetivo
Medir la disponibilidad de un proyecto a partir de heartbeats periódicos enviados por el SDK.

## Rol en el negocio
Complementa el monitoreo de errores con señales de salud. Permite saber si un servicio está arriba, abajo o degradado, y construir reportes diarios de disponibilidad.

## Funcionamiento
- Requiere header `x-api-key` para registrar heartbeats.
- El SDK envía `dsnKey`, `status`, `responseTimeMs` y `checkedAt` opcional.
- La API valida el proyecto por `dsnKey` y almacena el heartbeat.
- La consulta de histórico y el último estado es pública por proyecto.
- El resumen de uptime calcula horas faltantes y delays por día.
- La retención conserva solo los últimos 90 días de heartbeats.

## Reglas y lógica de negocio
- Un día se divide en 24 slots horarios; si falta un heartbeat en un slot, se considera hora faltante.
- Si el heartbeat llega tarde, se registra como delay en el resumen diario.
- El resumen permite ajustar días y umbral de delay para análisis.
- `status` permitido: `up`, `down`, `degraded`.

## Entidades y propiedades
- UptimeEvent: id, projectId, status, message, responseTimeMs, checkedAt, createdAt.

## Flujos principales
- Ingesta de heartbeat desde SDK.
- Consulta de histórico por día y último estado.
- Cálculo de resumen con horas faltantes y delays.

## Consumos y dependencias
- Consume projects para resolver `dsnKey`.
- Consume auth para validar API key.

## Endpoints
- `POST /v1/uptime/heartbeats` registra un heartbeat del SDK.
- `GET /v1/projects/:projectId/uptime/history?date=YYYY-MM-DD` histórico diario.
- `GET /v1/projects/:projectId/uptime/latest` último heartbeat.
- `GET /v1/projects/:projectId/uptime/summary?days=90&delayThresholdMinutes=10` resumen diario (hasta 365 días).

## Casos de error
- `Invalid heartbeat payload` cuando faltan campos requeridos.
- `Project not found` cuando el `dsnKey` o `projectId` no existe.
- `Organization mismatch` cuando la API key no coincide con la organización o no tiene acceso al proyecto.
- `Invalid status` cuando el status no es válido.
- `Invalid response time` cuando responseTimeMs es negativo o inválido.
- `Invalid checkedAt` cuando la fecha no es válida.

## Ejemplos de payloads
- Registrar heartbeat
  ```json
  {
    "dsnKey": "dsn_123",
    "status": "up",
    "responseTimeMs": 120,
    "checkedAt": "2026-01-25T00:00:00.000Z",
    "message": "OK"
  }
  ```
