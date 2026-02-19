# Módulo Incidents

Este módulo gestiona el ciclo de vida de los incidentes reportados por los usuarios. Un incidente es un evento de negocio o técnico que requiere seguimiento y resolución manual o automatizada, agrupando múltiples eventos de error similares o reportes directos.

## Entidades Principales

### Incident
- **Title**: Título descriptivo del incidente.
- **Status**: Estado actual del incidente (ej. `OPEN`, `RESOLVED`, `IGNORED`).
- **StartedAt**: Fecha y hora en que comenzó el incidente.
- **Project**: Proyecto al que pertenece el incidente.
- **Updates**: Historial de cambios de estado y comentarios.

### IncidentUpdate
- **Status**: Nuevo estado del incidente.
- **Message**: Comentario o nota explicativa del cambio.
- **CreatedAt**: Fecha del cambio.

## Funcionalidad

### Creación y Gestión
- **Reportar incidente**: Los usuarios pueden crear incidentes manualmente para tracking de problemas conocidos.
- **Actualizar estado**: Se puede cambiar el estado de un incidente (`OPEN` -> `RESOLVED`) agregando un mensaje opcional.
- **Historial**: Cada cambio de estado genera un registro en `IncidentUpdate` para auditoría y seguimiento.

### Consultas
- **Listar incidentes**: Obtener todos los incidentes de un proyecto.
- **Histórico**: Obtener incidentes agrupados por fecha para visualización en calendarios o líneas de tiempo.
- **Detalle**: Obtener información completa de un incidente específico incluyendo sus actualizaciones.

## Relación con Ingestión
Aunque actualmente los incidentes se crean manualmente o vía API, en el futuro se planea que la ingestión masiva de eventos de error similares pueda disparar la creación automática de un incidente o agruparse bajo uno existente.

## Seguridad
- **Creación/Edición**: Requiere rol `MEMBER` o superior.
- **Lectura**: Requiere rol `MEMBER` o superior (excepto endpoint público de histórico si se habilita).
