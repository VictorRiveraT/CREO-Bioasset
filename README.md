# CREO BioAsset - Sistema Inteligente de Gestión y Trazabilidad

**BIOASSET** es un sistema integral de trazabilidad, gestión e inventariado de equipos biomédicos. Diseñado para garantizar la seguridad clínica, optimizar la disponibilidad y llevar un control estricto del estado de los activos médicos.

## Arquitectura del Sistema

El proyecto sigue una arquitectura moderna dividida en:

- **Frontend (`/src`)**: Aplicación React + Vite + Tailwind CSS (Shadcn/UI) orquestado con TanStack Router. Consume y muta información en tiempo real.
- **Microservicios .NET 8 (`/services`)**:
  - `gateway/`: Nginx configurado en el puerto 8080. Ejerce de API Gateway, unificando el frontend con los endpoints del backend (`/api/*`).
  - `auth-service/`: Autenticación JWT, RBAC Estricto (Role-Based Access Control) y gestión de permisos granulares por Sedes.
  - `inventario-service/`: Catálogo central de equipos (Activos), ubicaciones y trazabilidad/movimientos.
  - `mantenimiento-service/`: Seguimiento de preventivos/correctivos e incidencias.
  - `alertas-service/`: Sistema de notificaciones tempranas y alertas por correo vía SendGrid.

## Novedades para Demo Final

Se han implementado funcionalidades clave orientadas a la escalabilidad y seguridad de la información:

* **Aislamiento Multisede Estricto (Backend)**: Los microservicios ahora bloquean intrínsecamente operaciones (como `DELETE`, `PUT`, `POST`) sobre activos, usuarios o ubicaciones fuera de la jurisdicción (Sede) permitida para cada cuenta de administrador.
* **Invalidación Activa de Sesiones**: Si un Administrador revoca (inactiva) el acceso de un usuario, su sesión activa es terminada en menos de 5 segundos de forma automática (Polling + Interceptors).
* **Control de Permisos Granulares UI**: Representación visual de roles dinámicos donde se muestran indicadores (`+` o `-`) si el usuario posee más o menos accesos que los correspondientes a su perfil estándar.
* **Depuración Integral UI/UX**: Corrección de inconsistencias visuales, tildes (UTF-8), alineaciones e implementaciones consistentes de notificaciones (Toasts) con respuestas y errores exactos desde el servidor HTTP.
* **Integración Base de Datos SQL Server**: Todos los microservicios se conectan nativamente a sus esquemas específicos dentro de un clúster contenedorizado de SQL Server 2022.

## Cómo ejecutar el proyecto (Desarrollo y Demo)

Todo el backend está orquestado mediante Docker Compose, mientras que el Frontend puede levantarse localmente con HMR de Vite.

1. **Instalar dependencias del frontend**:
   ```bash
   npm install
   ```

2. **Levantar el Backend Completo**:
   ```bash
   docker-compose up -d --build
   ```

3. **Levantar el Frontend**:
   ```bash
   npm run dev
   ```

4. **Acceder a la aplicación**:
   Ingresa a **`http://localhost:8080`**. El gateway (Nginx) resolverá el enrutado entre la interfaz web y los microservicios.

## Estructura de Documentación (`/docs`)
La carpeta `/docs` alberga evidencias técnicas, alineaciones con el marco de trabajo (PMBOK), minutas y el roadmap (`PROGRESS.md`) general de las evoluciones que ha sufrido el producto.

---
_Proyecto desarrollado bajo los más altos estándares de calidad, listo para operar como infraestructura tecnológica clínica._
