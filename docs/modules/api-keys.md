# Api Keys

## Objetivo
Emitir y validar API keys por organización para proteger endpoints y habilitar la ingesta del SDK.

## Rol en el negocio
La API key es la credencial primaria de una organización. Define el perímetro de acceso entre organizaciones y habilita operaciones administrativas y de ingesta.

## Entidades y propiedades
- ApiKey: id, organizationId, keyHash, isActive, allProjects, projectIds, createdAt, updatedAt.
- Una organización puede tener múltiples keys activas con distintos alcances.

## Flujos principales
- Emisión de nuevas keys activas para la organización.
- Rotación de key: crea una nueva key sin revocar las existentes.
- Validación de API key en el guard de autenticación.
- Resolución de scope por proyecto al crear o rotar la key.

## Reglas y validaciones
- La key plana solo se devuelve al momento de creación o rotación.
- La validación se realiza con header `x-api-key` y se deriva organizationId desde la key.
- Operaciones administrativas requieren JWT bearer y rol admin; listados aceptan member o admin.
- Endpoints web no usan `x-api-key`; usan JWT y el organizationId del token.
- `allProjects=true` implica acceso total a los proyectos de la organización.
- Si `allProjects=false`, `projectIds` debe contener proyectos válidos y activos de la organización.

## Consumos y dependencias
- Usado por auth (guard de API key) para construir el contexto de request.
- Usado por ingest y uptime como autenticación primaria del SDK.

## Endpoints
- `POST /v1/organizations/:organizationId/api-keys` crea una API key activa (JWT requerido).
- `GET /v1/organizations/:organizationId/api-keys` lista API keys de la organización (JWT requerido).
- `PATCH /v1/organizations/:organizationId/api-keys/:apiKeyId/revoke` revoca una API key (JWT requerido).
- `POST /v1/organizations/:organizationId/api-keys/rotate` crea una nueva API key (JWT requerido).

## Casos de error
- `Missing authentication headers` cuando faltan headers de autenticación.
- `Invalid API key` cuando la key no es válida.
- `Forbidden` cuando el rol no tiene permisos para crear keys.

## Ejemplos de payloads
- Crear API key con scope acotado
  ```json
  {
    "allProjects": false,
    "projectIds": ["project-1", "project-2"]
  }
  ```
- Crear API key con acceso total
  ```json
  {
    "allProjects": true
  }
  ```
