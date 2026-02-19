# Módulo Users

Este módulo gestiona la información personal y las credenciales de los usuarios registrados en el sistema. Provee mecanismos para la gestión de perfil, cambios de contraseña y roles dentro de las organizaciones.

## Entidades Principales

### User
- **Name**: Nombre completo del usuario.
- **Username**: Identificador único de usuario (opcionalmente usado en login).
- **Email**: Correo electrónico principal (usado para login).
- **Password**: Hash de la contraseña segura.
- **IsActive**: Estado del usuario (bloqueo por seguridad o desactivación manual).

### Relación con Organizaciones
- Un usuario puede pertenecer a múltiples organizaciones con diferentes roles (`OWNER`, `ADMIN`, `MEMBER`).
- La entidad `OrganizationUser` gestiona esta relación muchos-a-muchos.

## Funcionalidad

### Perfil de Usuario
- **Actualización**: Los usuarios pueden modificar su nombre y correo.
- **Cambio de Contraseña**: Endpoint seguro para actualizar la contraseña actual.
- **Recuperación**: Flujo de restablecimiento de contraseña vía token por email.

### Seguridad
- **Hasheo de contraseñas**: Se utiliza bcrypt para almacenar las contraseñas de forma segura.
- **Token JWT**: Al hacer login, se genera un JWT que contiene el ID del usuario y roles básicos.

## Relación con Auth
El módulo `Auth` utiliza el servicio de `Users` para buscar usuarios por email durante el login y validar sus credenciales.
