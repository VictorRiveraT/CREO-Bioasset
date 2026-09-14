# CREO BioAsset - Sistema de Gestión de Equipos Biomédicos

BIOASSET es un sistema para centralizar y gestionar la información de equipos biomédicos de una institución de salud.

## Estructura del Repositorio

El proyecto se divide en las siguientes áreas principales para separar responsabilidades entre el frontend, los microservicios del backend y la documentación generada:

- **`/src`**: Frontend de la aplicación (React + Vite + Tailwind + TanStack Router). **NOTA IMPORTANTE**: Esta carpeta contiene el trabajo generado por Lovable y los componentes de UI. *No modificar su estructura interna* sin previa coordinación, para evitar conflictos con el diseño de la interfaz.
- **`/services`**: Backend del sistema implementado bajo arquitectura de microservicios en .NET 8 (Minimal APIs, C#, Entity Framework Core). Contiene:
  - `gateway/`: API Gateway (Nginx) configurado en el puerto 8080 que unifica y expone tanto el frontend (proxy hacia Vite) como los endpoints de cada microservicio bajo `/api/*`.
  - `auth-service/`: Gestión de usuarios y autenticación (JWT).
  - `inventario-service/`: Catálogo de activos, ficha técnica y generación de códigos QR.
  - `mantenimiento-service/`: Registro de revisiones, mantenimientos preventivos/correctivos.
  - `alertas-service/`: Motor básico para identificar calibraciones vencidas o próximos mantenimientos.
  - `analitica-service/`: Indicadores y métricas para alimentar los reportes y dashboards.
- **`/docs`**: Documentación del progreso, verificaciones semanales (como `VERIFICACION_SEMANA4.md`, `VERIFICACION_PANTALLAS.md`), capturas de pantalla de evidencia y bitácora del desarrollo (`PROGRESS.md`).
- **`/scripts`**: Scripts utilitarios (como `seed.sql` para poblar la base de datos local con información de prueba).

## Cómo ejecutar el proyecto en Desarrollo

Todo el sistema está orquestado mediante `docker-compose`, pero el servidor de desarrollo del frontend (Vite) se ejecuta en el host local para permitir Hot-Reload (HMR).

1. Instalar dependencias del frontend:
   ```bash
   npm install
   ```

2. Levantar el servidor de desarrollo de Vite (Frontend):
   ```bash
   npm run dev
   ```
   *(Vite se levantará típicamente en `http://localhost:8081` si el 8080 está ocupado)*

3. Levantar los microservicios y el Gateway (Backend + Nginx):
   ```bash
   docker-compose up -d --build
   ```

4. **Acceder a la aplicación**:
   Ingresa a **`http://localhost:8080`**.
   El Nginx (Gateway) está configurado para servir el Frontend completo en la raíz `/` (incluyendo Hot-Reload) y enrutar las peticiones `/api/*` hacia los microservicios de .NET correspondientes.

### Base de Datos y Datos de Prueba
Si necesitas cargar los datos de demostración iniciales (20+ equipos y 3 usuarios), puedes ejecutar el script de seed directamente contra el contenedor de SQL Server:
```bash
docker exec -i bioasset-hub-main-sqlserver-1 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P Your_password123 -C -d bioasset -i /tmp/seed.sql
```
*(Asegúrate de copiar primero el archivo con `docker cp scripts/seed.sql bioasset-hub-main-sqlserver-1:/tmp/seed.sql`)*

---
*Este proyecto fue inicializado con Lovable y posteriormente extendido con una arquitectura robusta de microservicios en .NET Core.*
