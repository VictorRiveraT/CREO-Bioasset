# Reporte de Auditoría: Seguridad y Funcionalidad

| Hallazgo | Severidad | Evidencia | Estado |
|----------|-----------|-----------|--------|
| **Contraseñas en texto plano (SQL)** | Crítica | sqlcmd reveló contraseñas legibles (ioasset) en uth.Usuarios. | Parchado |
| **Falta de RBAC (Roles) en inventario-service** | Crítica | POST /activos retornó 201 Created con un token de Asistencial (que debería ser Read-Only). | Parchado |
| **Falta total de Auth en Mantenimiento, Alertas y Analítica** | Crítica | No existía el decorador [Authorize], cualquier request entraba. | Parchado |
| **Ausencia de endpoint POST para Mantenimiento** | Alta (Bug Funcional) | curl -X POST /api/mantenimiento/mantenimientos devolvió 405 Method Not Allowed. | Parchado |
| **Acceso a vista Usuarios para roles no administradores** | Alta (Bug Funcional) | El archivo usuarios.tsx no impedía la renderización a Asistenciales/Biomédicos si se navegaba directamente a la URL. | Parchado |
| **CORS global permisivo (*) en el Gateway** | Media | 
ginx.conf usa Access-Control-Allow-Origin: *. | Pendiente (Semana 13) |
| **Credenciales por defecto en DB/MQ** | Media | sa con password en el docker-compose.yml, y guest en RabbitMQ. | Pendiente (Semana 13) |
| **Inyección SQL** | No Vulnerable | Se probó '; DROP TABLE auth.Usuarios-- en un POST y fue mitigado por EF Core (lo guardó literal). | No aplica |
| **XSS en Frontend** | No Vulnerable | React mitiga la inyección de JS, dangerouslySetInnerHTML no se usa para data de usuario. | No aplica |
| **Fuga de Información en Errores (Stack trace)** | No Vulnerable | Un request con GUID malformado retornó 400 Bad Request genérico en .NET Minimal API. | No aplica |

## Proceso de Parcheo y Verificación
- **Contraseñas**: Se modificó uth-service/Program.cs para inyectar SHA256 manual mediante ComputeHash, se eliminaron los registros anteriores y se forzó re-creación.
- **Microservicios .NET**: Se inyectó AddAuthentication().AddJwtBearer() copiando el JWT Secret en todos los servicios faltantes, y se agregó validación a nivel de endpoint: [Authorize(Roles = "admin,biomedico")] (o solo dmin).
- **Frontend**: Se inyectó <Navigate to="/" replace /> en el archivo usuarios.tsx apoyándose en el hook useBio().
- **Inyección SQL**: El token se probó enviando un string destructivo directo a la base de datos y fue sanitizado correctamente por el ORM.
