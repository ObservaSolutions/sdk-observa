# Módulo Organizations

Este módulo es responsable de la gestión de organizaciones (tenants) dentro del sistema. Una organización es el contenedor principal de todos los recursos (usuarios, proyectos, API keys, incidentes) y define los límites de seguridad y facturación.

## Entidades Principales

### Organization
- **Name**: Nombre descriptivo de la organización.
- **Owner**: Usuario propietario de la organización (tiene control total).
- **Users**: Lista de usuarios que pertenecen a la organización con sus roles.
- **ApiKeys**: Lista de claves de acceso para sistemas externos.
- **Projects**: Lista de proyectos dentro de la organización.

### OrganizationUser
- **User**: Referencia al usuario.
- **Organization**: Referencia a la organización.
- **Role**: Rol asignado (`OWNER`, `ADMIN`, `MEMBER`).
- **IsActive**: Estado de la membresía.

## Funcionalidad

### Gestión de Organizaciones
- **Creación**: Al crear una organización, el usuario creador se asigna automáticamente como `OWNER`.
- **Actualización**: Solo el `OWNER` o `ADMIN` pueden cambiar el nombre o configuración.
- **Eliminación**: Solo el `OWNER` puede eliminar la organización (cascada a todos los recursos).

### Gestión de Miembros
- **Invitación**: `ADMIN` u `OWNER` pueden invitar usuarios por correo electrónico.
- **Roles**: Se pueden asignar roles (`MEMBER`, `ADMIN`) a los usuarios invitados.
- **Transferencia de Propiedad**: El `OWNER` actual puede transferir la propiedad a otro miembro, pasando a ser `ADMIN` o `MEMBER`.
- **Salida**: Los usuarios pueden abandonar una organización voluntariamente.

## Roles y Permisos
- **OWNER**: Control total, gestión de facturación (futuro), eliminación de org, transferencia de propiedad.
- **ADMIN**: Gestión de usuarios, proyectos, API keys, configuración de org (nombre).
- **MEMBER**: Acceso a proyectos, incidentes, lectura de configuraciones, creación de incidentes.

## Relación con Auth
El guardia `RolesGuard` utiliza la información de `OrganizationUser` para validar el acceso a los recursos protegidos por organización.
