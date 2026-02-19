# Módulo Auth (Autenticación)

Este módulo gestiona la seguridad y el acceso a la API, tanto para usuarios web (JWT) como para sistemas externos (API Keys). Se divide en dos componentes principales: `Auth` (Guardias y estrategias base) y `AuthWeb` (Flujos de login/registro para usuarios).

## Componentes

### 1. Auth (Core)
Provee los mecanismos fundamentales de protección de rutas.
- **Guards**:
    - `JwtAuthGuard`: Protege rutas que requieren un usuario autenticado vía JWT.
    - `ApiKeyGuard`: Protege rutas de ingestión o acceso de servidor a servidor usando `x-api-key`.
    - `RolesGuard`: Verifica que el usuario tenga el rol necesario (Owner, Admin, Member) dentro de la organización.
- **Decorators**:
    - `@CurrentUser()`: Extrae el usuario del request.
    - `@Public()`: Marca una ruta como pública (bypass de guardias globales).
    - `@Roles(...)`: Define los roles permitidos para una ruta.

### 2. AuthWeb (Usuarios)
Implementa la lógica de negocio para la gestión de sesiones de usuario.
- **Login**: Validación de credenciales (email/password) y emisión de JWT.
- **Registro**: Creación de nuevas cuentas de usuario.
- **Recuperación de contraseña**: Flujo de "Olvidé mi contraseña" con tokens temporales.
- **Cambio de contraseña**: Actualización segura de credenciales.

## Flujos Principales

### Login
1. Usuario envía email y password.
2. Se valida el usuario en base de datos.
3. Se verifica el hash del password.
4. Si es correcto, se genera un JWT firmado con `JWT_SECRET`.
5. Se retorna el token y la información del usuario.

### Protección por API Key
1. El cliente envía header `x-api-key`.
2. `ApiKeyGuard` intercepta la petición.
3. Se busca la key en base de datos y se valida que esté activa.
4. Se inyecta el contexto de la organización en el request.

## Configuración
- `JWT_SECRET`: Clave para firmar tokens.
- `JWT_EXPIRATION`: Tiempo de vida del token (ej. "1d").
