# Módulo Projects

Gestiona el ciclo de vida de los proyectos dentro de las organizaciones. Un proyecto es la unidad fundamental donde se agrupan los eventos de error y las configuraciones de monitoreo.

## Entidades Principales

### Project
- **Organization**: Cada proyecto pertenece a una organización.
- **Type**: Define el entorno del proyecto.
    - `BACKEND`: Proyectos de servidor. Solo requieren `dsnKey` y autenticación segura (`x-api-key`).
    - `FRONTEND`: Aplicaciones web cliente. Requieren `publicKey` para ingestión pública.
    - `MOBILE`: Aplicaciones móviles. Similar a frontend, requieren `publicKey`.
- **Keys**:
    - `dsnKey`: Identificador único privado/interno del proyecto. Se genera siempre.
    - `publicKey`: Identificador público para uso en clientes (browser/mobile). Solo se genera para proyectos `FRONTEND` y `MOBILE`.

## Funcionalidad

### Creación de Proyectos
Al crear un proyecto, el sistema genera automáticamente las credenciales necesarias según el tipo seleccionado.
- `BACKEND` -> Genera `dsnKey`. `publicKey` es `null`.
- `FRONTEND`/`MOBILE` -> Genera `dsnKey` y `publicKey`.

### Validación
El módulo provee métodos para buscar proyectos por `dsnKey` o `publicKey`, permitiendo al módulo de ingestión validar el destino de los eventos.

### Relación con API Keys
Aunque los proyectos tienen sus propias keys (`dsn` y `public`), el acceso administrativo y la ingestión desde servidores (backend) siguen dependiendo de las `ApiKeys` de la organización. La `publicKey` es una excepción para permitir ingestión anónima/pública controlada por rate limiting.
