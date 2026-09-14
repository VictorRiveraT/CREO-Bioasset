USE bioasset;

-- Update existing mantenimientos
UPDATE mantenimiento.Mantenimientos SET Descripcion = 'Limpieza de filtros y calibracion de sensores' WHERE Descripcion IS NULL AND Tipo = 'Preventivo';
UPDATE mantenimiento.Mantenimientos SET Descripcion = 'Reparacion de tarjeta logica dañada' WHERE Descripcion IS NULL AND Tipo = 'Correctivo';

-- Add 5 more users
DECLARE @BiomedicoId2 UNIQUEIDENTIFIER = NEWID();
DECLARE @AsistencialId2 UNIQUEIDENTIFIER = NEWID();
DECLARE @AuditorId UNIQUEIDENTIFIER = NEWID();
DECLARE @EstudianteId UNIQUEIDENTIFIER = NEWID();
DECLARE @AsistencialId3 UNIQUEIDENTIFIER = NEWID();

INSERT INTO auth.Usuarios (Id, Nombre, Email, Password, Rol, Activo, Permisos, Sede) VALUES
(@BiomedicoId2, 'Carlos Mendoza', 'carlos.mendoza@bioasset.pe', '\\\.N2H6R91n2.4M8a9F/P.6k0q3Y0.00000000000000000000', 'biomedico', 1, '{}', 'Todas'),
(@AsistencialId2, 'Maria Perez', 'maria.perez@bioasset.pe', '\\\.N2H6R91n2.4M8a9F/P.6k0q3Y0.00000000000000000000', 'asistencial', 1, '{}', 'Miraflores'),
(@AuditorId, 'Rosa Garcia (Auditora)', 'rosa.garcia@bioasset.pe', '\\\.N2H6R91n2.4M8a9F/P.6k0q3Y0.00000000000000000000', 'auditor', 1, '{}', 'San Isidro'),
(@EstudianteId, 'Jose Alumno', 'jose.alumno@bioasset.pe', '\\\.N2H6R91n2.4M8a9F/P.6k0q3Y0.00000000000000000000', 'estudiante', 1, '{}', 'Surco'),
(@AsistencialId3, 'Elena Casas', 'elena.casas@bioasset.pe', '\\\.N2H6R91n2.4M8a9F/P.6k0q3Y0.00000000000000000000', 'asistencial', 1, '{}', 'Lima Centro');

-- Add 8 Incidencias
DECLARE @Eq1 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'MN-001');
DECLARE @Eq3 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'MN-003');
DECLARE @Eq5 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'MN-005');
DECLARE @Eq8 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'DF-003');
DECLARE @Eq12 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'BI-002');
DECLARE @Eq14 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'BI-004');
DECLARE @Eq18 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'VM-003');
DECLARE @Eq20 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'US-001');

INSERT INTO mantenimiento.Incidencias (Id, activo_id, Titulo, Estado) VALUES
(NEWID(), @Eq1, 'Pantalla parpadea intermitentemente durante uso', 'Abierta'),
(NEWID(), @Eq3, 'Boton de impresion no responde', 'En revision'),
(NEWID(), @Eq5, 'Equipo no enciende', 'Cerrada'),
(NEWID(), @Eq8, 'Cable de paletas sulfatado', 'Abierta'),
(NEWID(), @Eq12, 'Alarma de aire en linea falsa recurrente', 'En revision'),
(NEWID(), @Eq14, 'No retiene carga la bateria', 'Abierta'),
(NEWID(), @Eq18, 'Fuga de presion detectada en manguera', 'Cerrada'),
(NEWID(), @Eq20, 'Transductor linear con imagen borrosa', 'Abierta');

