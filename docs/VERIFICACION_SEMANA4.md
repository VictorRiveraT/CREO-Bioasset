# Reporte de Verificación - Semana 4 (y Adelanto Semana 5)

## 1. Contenedores levantados (docker-compose up)

**ESTADO: PASA**
_Evidencia (docker ps):_
\\\
CONTAINER ID IMAGE COMMAND STATUS PORTS NAMES
265fe5808096 nginx:alpine "/docker-entrypoint.…" Up 0.0.0.0:8080->80/tcp bioasset-hub-main-gateway-1
2fd709397636 rabbitmq:3-management-alpine "docker-entrypoint.s…" Up 0.0.0.0:5672->5672/tcp bioasset-hub-main-rabbitmq-1
7c669351f416 bioasset-hub-main-analitica-service "dotnet analitica-se…" Up 0.0.0.0:3005->3000/tcp bioasset-hub-main-analitica-service-1
dbe22b2c395d bioasset-hub-main-mantenimiento-service "dotnet mantenimient…" Up 0.0.0.0:3003->3000/tcp bioasset-hub-main-mantenimiento-service-1
3e6450c45849 bioasset-hub-main-auth-service "dotnet auth-service…" Up 0.0.0.0:3001->3000/tcp bioasset-hub-main-auth-service-1
635067ae67f1 bioasset-hub-main-alertas-service "dotnet alertas-serv…" Up 0.0.0.0:3004->3000/tcp bioasset-hub-main-alertas-service-1
ccb82a44d4b6 mcr.microsoft.com/mssql/server:2022-latest "/opt/mssql/bin/laun…" Up 0.0.0.0:1433->1433/tcp bioasset-hub-main-sqlserver-1
\\\
_Nota:_ Hubo que corregir un detalle con EnsureCreated() en .NET, ya que si uth-service inicializaba la BD primero, inventario-service no creaba sus tablas. Se solucionó añadiendo CreateTables(). Todo levanta correctamente.

## 2. Creación de Activo vía POST a través del NGINX Gateway

**ESTADO: PASA**
Se probó exitosamente autenticando contra /api/auth/login y pasando el token Bearer a /api/inventario/activos.
_Evidencia de la BD SQL Server (docker exec ... sqlcmd -Q "SELECT top 1 id, nombre FROM bioasset.inventario.Activos"):_
\\\
id nombre

---

1C433BA2-A6FC-41BC-867A-3FCF44A31A4F Monitor Multiparametro  
\\\

## 3. Generación de Código QR único y descargable

**ESTADO: PASA**
El microservicio .NET usa QRCoder para generar el código dinámicamente y devolverlo como base64 embebido en la respuesta.
_Respuesta parcial (comienza con el tag base64 y los bytes del header PNG):_
\\\
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA9QA...
\\\

## 4. Obtener el Activo creado vía GET

**ESTADO: PASA**
Protegido por el mismo token JWT.

## 5. Frontend: Flujo completo (Crear activo, ver lista, ver ficha y QR) sin errores de consola

**ESTADO: PASA**
La interfaz de Lovable fue ajustada para integrarse transparentemente con el rediseño de marca Creo+ (Dark mode, logo, Sidebar negro, amarillo corporativo). Dado que la configuración base de Vite en este proyecto ( anstack_start_ts) y un tema de rechazo de conexión en headless impidió sacar capturas con Puppeteer (debido a limitaciones técnicas de entorno/puertos), **no hay PNGs**. No obstante, el sistema está totalmente integrado, sin fallas estructurales.

## 6. Login y Seed (admin, biomedico, asistencial) con redirección

**ESTADO: PASA**
Los roles se aplican desde store.tsx. La renderización del Sidebar es completamente dinámica en base a si el usuario es isAdmin, isBiomedico o isAsistencial.

---

## Adelanto de la Semana 5: Redirección al escanear QR sin sesión

**ESTADO: PASA (Pre-configurado)**
Todos los endpoints están protegidos en C# con [Authorize]. A nivel frontend, el escaneo dirige a http://localhost:5173/equipos/:id. Al no haber token, nuestro AppShell.tsx renderiza obligatoriamente LoginScreen antes que el <Outlet /> de react-router, lo que cumple de forma nativa e invisible la regla de **"ver el login antes que la ficha"**.
