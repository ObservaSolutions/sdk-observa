# Módulo Ingest Protection

Este módulo es responsable de proteger la API de ingestión contra abusos, ataques de denegación de servicio y tráfico malicioso. Implementa estrategias de limitación de velocidad (rate limiting) y bloqueo de clientes sospechosos.

## Características Principales

### 1. Rate Limiting
Utiliza Redis para controlar la frecuencia de peticiones:
- **Por Dirección IP**: Configurable (default: 60 peticiones/minuto). Protege contra inundación desde una sola fuente.
- **Por PublicKey**: Configurable (default: 1000 peticiones/minuto) por proyecto. Permite un mayor volumen de tráfico legítimo identificado, pero previene que un solo proyecto sature el sistema global.

### 2. Detección y Gestión de Clientes Sospechosos
Permite identificar y bloquear clientes (IPs) que exhiben comportamiento anómalo.
- **Estado**: Los clientes pueden estar en estado `CLEAN`, `SUSPICIOUS` o `BLOCKED`.
- **Bloqueo Automático**: (Futura implementación) El sistema puede bloquear automáticamente IPs que superen consistentemente los límites.
- **Gestión Manual**: Administradores pueden bloquear o desbloquear IPs manualmente a través de la API.

### 3. Integración con Ingestión
Se ejecuta como un paso previo en el controlador de ingestión (`IngestController`). Si una petición es rechazada por rate limiting o bloqueo, se retorna un error `429 Rate Limit Exceeded` o `403 Forbidden` inmediato sin procesar el evento, ahorrando recursos.

## Arquitectura
- **Infraestructura**: Repositorio `SuspiciousClientsTypeOrmRepository` para persistencia de estados de bloqueo y `Redis` para contadores efímeros de rate limiting.
- **Dominio**: Entidad `SuspiciousClient`. Nota: El campo `requestCount` rastrea las peticiones realizadas por el cliente *una vez que ha sido identificado como sospechoso o bloqueado*, no representa el tráfico total histórico de esa IP.
- **Presentación**: `SuspiciousClientsController` para administración.

## Configuración
Los límites de rate limiting son configurables mediante variables de entorno:
- `RATE_LIMIT_WINDOW`: Ventana de tiempo en segundos (default: 60).
- `RATE_LIMIT_IP`: Límite de peticiones por IP en la ventana (default: 60).
- `RATE_LIMIT_PUBLIC_KEY`: Límite de peticiones por PublicKey en la ventana (default: 1000).

Requiere una instancia de Redis configurada y accesible para funcionar correctamente. Si Redis no está disponible, el rate limiting podría no aplicarse o degradarse (dependiendo de la implementación del adaptador).
