# CONTEXTO DEL PROYECTO — CREO BioAsset

## 1. Árbol de directorios completo

El repositorio principal está bajo `bioasset-hub-main` e incluye:

- `/docs`: Documentos de progreso y reportes de QA (PROGRESS.md, SEGURIDAD_Y_BUGS.md, etc.).
- `/services`: Contiene los 5 microservicios .NET (Minimal APIs) y la configuración del API Gateway (Nginx).
- `/src`: Frontend React + Vite con arquitectura PWA y `shadcn/ui`.

```text
bioasset-hub-main
+--- .gitignore
+--- components.json
+--- docker-compose.yml
+--- docs
|   +--- PROGRESS.md
|   +--- SEGURIDAD_Y_BUGS.md
|   \--- ... (otros md)
+--- package.json
+--- scripts
|   \--- seed.sql
+--- services
|   +--- alertas-service
|   |   +--- appsettings.json
|   |   +--- Dockerfile
|   |   +--- alertas-service.csproj
|   |   \--- Program.cs
|   +--- analitica-service
|   |   +--- appsettings.json
|   |   +--- Dockerfile
|   |   +--- analitica-service.csproj
|   |   \--- Program.cs
|   +--- auth-service
|   |   +--- appsettings.json
|   |   +--- Dockerfile
|   |   +--- auth-service.csproj
|   |   \--- Program.cs
|   +--- gateway
|   |   \--- nginx.conf
|   +--- inventario-service
|   |   +--- appsettings.json
|   |   +--- db (scripts sql obsoletos por EF Core)
|   |   +--- Dockerfile
|   |   +--- inventario-service.csproj
|   |   \--- Program.cs
|   \--- mantenimiento-service
|       +--- appsettings.json
|       +--- Dockerfile
|       +--- mantenimiento-service.csproj
|       \--- Program.cs
+--- src
|   +--- components (ui y domain)
|   +--- hooks
|   +--- lib
|   |   +--- bioasset (apiClient.ts, store.tsx, types.ts)
|   |   \--- utils.ts
|   +--- routes (alertas, equipos, index, etc.)
|   +--- router.tsx
|   +--- server.ts
|   \--- styles.css
\--- vite.config.ts
```

## 2. Stack y versiones reales

- **Backend (.NET)**: .NET 8.0 explícito en los `.csproj`. Los servicios usan el paradigma **Minimal APIs** en un solo archivo (`Program.cs`). No usan el patrón MVC / Clean Architecture documentado clásicamente.
- **Librerías C# (NuGet)**: `Microsoft.AspNetCore.Authentication.JwtBearer` 8.0.0, `Microsoft.EntityFrameworkCore.SqlServer` 8.0.0, `RabbitMQ.Client` 6.8.1 (importado, pero sin uso real), `QRCoder` 1.4.3.
- **Frontend (npm)**: React 19.2.0, Vite 8.2.0, `@tanstack/react-router` 1.170.18, Tailwind CSS 4.2.1, `shadcn/ui` a través de componentes Radix (`@radix-ui/react-*`).
- **Infraestructura (docker-compose.yml)**:
  - Nginx: `nginx:alpine`
  - Base de datos: SQL Server (`mcr.microsoft.com/mssql/server:2022-latest`)
  - Cola de mensajes: `rabbitmq:3-management-alpine`

**Diferencia respecto al Documento:** El proyecto coincide tecnológicamente con las especificaciones (.NET 8, EF Core, SQL Server, RabbitMQ, React), PERO la implementación de Entity Framework es _Code-First sin Control de Migraciones_ (invoca `EnsureCreated()` en runtime) y el Frontend migró internamente a Vite/Tanstack en lugar de un React CRA tradicional.

## 3. Estado detallado por microservicio

### auth-service

- **Endpoints implementados**:
  - `GET /health` (Sin auth): Retorna estado del servicio.
  - `POST /login` (Sin auth): Valida email y password hasheado, retorna JWT y usuario.
  - `GET /me` (Auth): Retorna usuario a partir del token.
  - `GET /usuarios` (Auth): Lista todos los usuarios.
  - `PUT /usuarios/{id}/toggle` (Auth): Activa/desactiva flag de usuario.
- **Modelos/Entidades**: `Usuario` (`Id`, `Nombre`, `Email`, `Password`, `Rol`, `Activo`), alojado en schema `auth`.
- **Migraciones EF Core**: Ninguna. Usa `db.Database.EnsureCreated()` en `Program.cs`.
- **Lógica de negocio implementada**: Validación manual de password hasheado (un simple SHA256 base64, sin sal/bcrypt). Token incluye claims `id` y `role` expiran a los 7 días. Contiene seeding por defecto (Admin, Biomedico, Luis).
- **Eventos RabbitMQ**: No publica ni consume eventos.
- **Código placeholder/TODO/mock**: Ningún comentario literal de TODO, pero se usan hashes SHA256 básicos precarios en `string HashPassword(string password)`.
- **Cobertura de pruebas**: 0 pruebas unitarias/integración configuradas.
- **% de avance estimado**: 70%. Funciona para login y roles RBAC de manera aislada, pero su criptografía de contraseñas es precaria y no emite eventos de auditoría/creación según el modelo maduro.

### inventario-service

- **Endpoints implementados**:
  - `GET /health` (Sin auth).
  - `GET /ubicaciones` (Auth), `POST /ubicaciones` (Admin), `PUT /ubicaciones/{id}` (Admin).
  - `GET /activos`, `GET /activos/{id}`, `POST /activos` (Admin, Biomédico), `PUT /activos/{id}`, `PATCH /activos/{id}` (Admin, Biomédico). POST genera QR dinámico (PNG base64).
  - `GET /movimientos`, `POST /movimientos` (Auth).
- **Modelos/Entidades**: `Ubicacion`, `Activo`, `Movimiento` (schema `inventario`).
- **Migraciones EF Core**: Usa `EnsureCreated` y `CreateTables()` de forma precaria.
- **Lógica de negocio implementada**: Filtros básicos en GET activos (`estado`, `ubicacion`). Sincrónicamente, al crear con `POST /activos`, genera un código QR a base de URL (con librería `QRCoder`), y lo devuelve en Base64 PNG.
- **Eventos RabbitMQ**: Ninguno (a pesar de tener `RabbitMQ.Client` importado en `.csproj`, el archivo `Program.cs` carece de sentencias pub/sub).
- **Código placeholder/TODO/mock**: En frontend hay un comentario `// Hacky mapping, but UI uses 'resultado'` por cómo el endpoint formatea la info, pero el código C# es directo.
- **Cobertura de pruebas**: 0 pruebas.
- **% de avance estimado**: 80%. CRUD operativo, pero completamente síncrono. No comunica eventos de movimiento a RabbitMQ (vital para analítica).

### mantenimiento-service

- **Endpoints implementados**:
  - `GET /mantenimientos` (Auth), `POST /mantenimientos` (Admin, Biomédico).
  - `GET /incidencias` (Auth), `POST /incidencias` (Auth).
- **Modelos/Entidades**: `Mantenimiento`, `Incidencia` (schema `mantenimiento`). Fechas se guardan como `string`.
- **Migraciones EF Core**: Usa `EnsureCreated`.
- **Lógica de negocio implementada**: CRUD muy primitivo. Solo inserción y listado directo de BD. Ninguna validación de estados de ticket (se puede saltar flujos de trabajo sin control).
- **Eventos RabbitMQ**: Ninguno. La documentación `PROGRESS.md` afirma publicar el evento `activo.falla_reportada`, **pero el código fuente real (`Program.cs`) omite por completo esto**.
- **Código placeholder/TODO/mock**: Sin comentarios explícitos, es un andamio vacío.
- **Cobertura de pruebas**: 0 pruebas.
- **% de avance estimado**: 30%. Básicamente un "scaffolding" para salir del paso. Falta toda la lógica de estado de los mantenimientos.

### alertas-service

- **Endpoints implementados**: `GET /alertas` (Auth req).
- **Modelos/Entidades**: `Alerta` (`Id`, `ActivoId`, `Tipo`, `Mensaje`, `Severidad`, `Estado`) en schema `alertas`.
- **Migraciones EF Core**: Usa `EnsureCreated`.
- **Lógica de negocio implementada**: Endpoint devuelve JSON plano de la tabla. No hay cron-jobs ni trabajadores (workers) reales implementados en C#.
- **Eventos RabbitMQ**: Ninguno. No consume alertas externas de mantenimiento ni inventario.
- **Código placeholder/TODO/mock**: Ninguno en código, es un archivo base vacío.
- **Cobertura de pruebas**: 0 pruebas.
- **% de avance estimado**: 10%. Solo existe la tabla, modelo de datos y un endpoint.

### analitica-service

- **Endpoints implementados**: `GET /metricas` (Auth req).
- **Modelos/Entidades**: `Metrica` (`Nombre`, `Valor`) en schema `analitica`.
- **Migraciones EF Core**: Usa `EnsureCreated`.
- **Lógica de negocio implementada**: Ninguna.
- **Eventos RabbitMQ**: Ninguno. No escucha los eventos que erróneamente documenta el `PROGRESS.md`.
- **Código placeholder/TODO/mock**: Vacío por completo.
- **Cobertura de pruebas**: 0 pruebas.
- **% de avance estimado**: 5%. Un caparazón vacío de Minimal API.

## 4. Docker / Infraestructura

- **Contenido del docker-compose.yml**: Compila las imágenes de C# de los 5 servicios usando volúmenes de build locales exponiéndolos todos estáticamente al puerto interno `3000` (`PORT=3000`). Declara una DB en `mcr.microsoft.com/mssql/server:2022-latest` (puerto `1433`, SA / Your_password123), un broker de mensajería `rabbitmq:3-management-alpine` (puerto `5672`/`15672`, guest/guest), y un `gateway` Nginx (puerto `8080`).
- **Qué levanta**: Todo levanta perfectamente con `docker-compose up`. No hay fallos de red.
- **Configuración Nginx (API Gateway)**: Enruta exitosamente. `location /` proxy hacia el frontend en el host (`http://host.docker.internal:8081`). Rutas `/api/auth/`, `/api/inventario/`, etc. proxy_pass hacia los respectivos contenedores de C# (puerto 3000). Intercepta peticiones CORS (`OPTIONS`) con un bloque estático HTTP `204 No Content` con headers `Access-Control-Allow-Origin: *`.
- **RabbitMQ**: La instancia corre perfectamente con guest/guest, pero **no está configurada** a nivel de exchanges, queues, DLQ (Dead-letter queue) ni reintentos. Esto se debe a que NINGUNO de los microservicios C# tiene código que se conecte a él.

## 5. Seguridad / Auth

- **Generación y validación JWT**: Se genera manualmente en el POST `/login` del `auth-service` con `JwtSecurityTokenHandler` usando `SymmetricSecurityKey` hardcodeada (`"Jwt:Secret"`). El token expira en 7 días y su payload incluye los claims `id` y el `ClaimTypes.Role`.
- **Roles en código**: Existen `admin`, `biomedico`, `asistencial`. Estos ya se aplican exitosamente usando el atributo nativo `[Authorize(Roles = "admin,biomedico")]` en Minimal APIs (ej. POST/PUT en Inventario).
- **Dónde se valida el RBAC**: El RBAC ya se valida de forma descentralizada en **cada microservicio**, comprobando el token contra el Secret compartido en su `Program.cs`. El API Gateway _solamente_ enruta y maneja el pre-flight CORS (no valida tokens ni reglas de negocio), contradiciendo algunas arquitecturas estrictas pero simplificando la implementación actual.

## 6. Frontend PWA

- **Componentes/Páginas y su estado**: Vite + React Router funcional. Vistas funcionales como `/alertas`, `/configuracion`, `/equipos`, `/incidencias`, `/mantenimiento`, `/reportes`, `/trazabilidad`, `/usuarios`.
- **Mocks vs API (Alerta Crítica)**: Si bien existe un `fetchApi()` funcional en `apiClient.ts` conectado a los endpoints reales (Login, CRUD Equipos), el proveedor del estado global (`src/lib/bioasset/store.tsx`) **inyecta masivamente datos Mock hardcodeados**. Combina los datos de BD real con `MOCK_EQUIPMENT` (45 items falsos), `MOCK_MAINTENANCE` (30 items) y `MOCK_MOVEMENTS` (25 items). La UI miente respecto a la volumetría real porque está contaminada con Dummies.
- **Lector QR / Componentes**: El `EquipmentDialog` descarga correctamente el string Base64 del código QR devuelto por C# al crear un activo.
- **Vistas por rol**: Condicionales en menú lateral están operativas. Rutas enteras quedan ocultas (ej. Asistencial no puede ver la Configuración) evaluando `isAdmin`, `isAsistencial` desde el Context.

## 7. Desviaciones respecto al Documento de Arquitectura original

1. **RabbitMQ Inexistente en Código**: El Documento (y los historiales) dictan mensajería Event-Driven, pero en C# la integración **no existe**. Las referencias en `.csproj` son inútiles sin implementación en los `Program.cs`.
2. **Arquitectura C# Simplista**: Se documentó diseño por capas (Controllers / Clean Architecture). Todo el código está amontonado en 5 archivos `Program.cs` que usan **Minimal APIs**. Modelos, endpoints y DbContext están en el mismo archivo.
3. **Manejo de EF Migraciones**: Documentos sugieren migraciones formales. Acá se lanza predecible y peligrosamente `EnsureCreated()` en runtime, lo cual descarta versionamiento de Data Scheme.
4. **Almacenamiento de Contraseñas**: El diseño original pediría un ASP.NET Core Identity u ORM con salteado (bcrypt/Argon2). Se optó por una encriptación SHA256 base64 insegura y básica en el `auth-service`.
5. **Mocks Sobrevivientes en el Frontend**: Se documentó falsamente ("Reemplazo de Mock local completado") en el `PROGRESS.md` que la App dependía 100% del backend. Sin embargo, en el arranque de sesión se autoinyectan más de 100 registros Dummy localmente.

## 8. Problemas conocidos / bugs / bloqueantes

- **Cero Flujo Asíncrono**: Pese a la infraestructura arriba, Alertas, Mantenimiento y Analíticas están bloqueadas / inactivas ante la falta de `RabbitMQ` codificado en C#.
- **Datos "Falsos" en Producción**: La UI carga los arreglos `MOCK_...` inyectados en `store.tsx`. Esto descalifica la app de inmediato para una salida de prueba funcional (UAT).
- **CORS Permisivo**: El API Gateway responde `Access-Control-Allow-Origin: *` de forma abierta a todas las peticiones OPTIONS, lo cual en prod debe limitarse.
- **Modelo de Fechas Mantenimiento**: En `mantenimiento-service`, `ProximaFecha` es `string?`, lo que es un bug predecible para validación / queries reales de fechas futuras.

## 9. Historial de avance (changelog resumido)

- **Semanas Iniciales**: Scaffolding en Node.js, y estructuración de Frontend con Vite y Tanstack Router, implementando el UI Toolkit y vistas estáticas de la plataforma Creo+.
- **Semana 4**: Generación de códigos QR para inventario y trazabilidad básica.
- **Semana 5**: Migración abrupta y total a C# (.NET 8.0 Minimal APIs). Se integró Auth JWT, Base de Datos SQL Server con EF Core nativo (Code-first), unificando redes Docker vía el Nginx Gateway. Se resolvió RBAC en las vistas y enrutadores. Se actualizaron documentos declarando "falsamente" avances en eventos asíncronos.

## 10. Próximos pasos planeados

1. **Limpiar Mocks Urgente**: Remover de `src/lib/bioasset/store.tsx` los arreglos generados (`MOCK_EQUIPMENT`, `MOCK_MAINTENANCE`, `MOCK_MOVEMENTS`) para visualizar únicamente la data insertada en SQL Server.
2. **Implementar RabbitMQ Event Bus**: Enchufar el cliente RabbitMQ en .NET. Lograr que Mantenimiento envíe un evento y Alertas/Analíticas los escuchen.
3. **Refactorizar Arquitectura de Datos**: Reemplazar los `EnsureCreated()` con un enfoque robusto de control de versionamiento (EF Migrations) y migrar los tipos de dato (de strings a DateTimes correctos).
4. **Mejorar Seguridad**: Limitar CORS en Nginx, cambiar encriptación SHA256 a Bcrypt o similar para los contraseñas en `auth-service`.

## 11. Resumen ejecutivo

La aplicación está migrada exitosamente a **.NET 8** (Minimal APIs + SQL Server) con un frontend PWA **React+Vite** que luce robusto y cuenta con un RBAC implementado (JWT). Sin embargo, el proyecto sufre de un grave **"falso avance documentado"**: el sistema de eventos por _RabbitMQ_ es totalmente ficticio en el código actual (no hay líneas que lo usen), y el frontend esconde las carencias del backend inyectando más de 100 registros mockeados localmente de forma silenciosa. El riesgo más urgente es retirar esos mocks y crear el hub de eventos asíncrono para que Alertas y Analítica dejen de ser cascarones vacíos.
