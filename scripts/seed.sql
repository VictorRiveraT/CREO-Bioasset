USE bioasset;
DELETE FROM inventario.Activos;
DELETE FROM inventario.Ubicaciones;
DELETE FROM mantenimiento.Mantenimientos;
DELETE FROM alertas.Alertas;

DECLARE @AdminId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM auth.Usuarios WHERE Rol = 'admin');
DECLARE @BiomedicoId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM auth.Usuarios WHERE Rol = 'biomedico');
DECLARE @AsistencialId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM auth.Usuarios WHERE Rol = 'asistencial');

DECLARE @Ubicacion1 UNIQUEIDENTIFIER = NEWID();
DECLARE @Ubicacion2 UNIQUEIDENTIFIER = NEWID();

INSERT INTO inventario.Ubicaciones (Id, Nombre, Descripcion, Activo) VALUES 
(@Ubicacion1, 'UCI', 'Unidad de Cuidados Intensivos', 1),
(@Ubicacion2, 'Emergencia', 'Sala de Emergencias', 1);

INSERT INTO inventario.Activos (Id, Codigo, Nombre, Categoria, Marca, Modelo, Serie, UbicacionId, Estado, FechaAdquisicion, ProximoMantenimiento, Criticidad, activo)
VALUES
(NEWID(), 'MN-001', 'Monitor de Signos Vitales', 'Monitoreo', 'Philips', 'IntelliVue MX400', 'PH123001', @Ubicacion1, 'Operativo', '2022-01-10', '2026-10-01', 'Alta', 1),
(NEWID(), 'MN-002', 'Monitor de Signos Vitales', 'Monitoreo', 'Philips', 'IntelliVue MX400', 'PH123002', @Ubicacion1, 'Operativo', '2022-01-10', '2026-10-01', 'Alta', 1),
(NEWID(), 'MN-003', 'Monitor de Signos Vitales', 'Monitoreo', 'Philips', 'IntelliVue MX400', 'PH123003', @Ubicacion1, 'Mantenimiento', '2022-01-10', '2026-09-01', 'Alta', 1),
(NEWID(), 'MN-004', 'Monitor Multiparametro', 'Monitoreo', 'Mindray', 'BeneVision N12', 'MD45001', @Ubicacion2, 'Operativo', '2023-05-15', '2026-11-15', 'Media', 1),
(NEWID(), 'MN-005', 'Monitor Multiparametro', 'Monitoreo', 'Mindray', 'BeneVision N12', 'MD45002', @Ubicacion2, 'De baja', '2019-02-20', '2024-02-20', 'Media', 0),
(NEWID(), 'DF-001', 'Desfibrilador', 'Reanimacion', 'Zoll', 'R Series', 'ZL112201', @Ubicacion2, 'Operativo', '2021-08-05', '2026-12-01', 'Alta', 1),
(NEWID(), 'DF-002', 'Desfibrilador', 'Reanimacion', 'Zoll', 'R Series', 'ZL112202', @Ubicacion2, 'Operativo', '2021-08-05', '2026-12-01', 'Alta', 1),
(NEWID(), 'DF-003', 'Desfibrilador', 'Reanimacion', 'Mindray', 'BeneHeart D3', 'MD223301', @Ubicacion1, 'Operativo', '2020-03-11', '2026-10-15', 'Alta', 1),
(NEWID(), 'DF-004', 'Desfibrilador', 'Reanimacion', 'Mindray', 'BeneHeart D3', 'MD223302', @Ubicacion1, 'Operativo', '2020-03-11', '2026-10-15', 'Alta', 1),
(NEWID(), 'DF-005', 'Desfibrilador', 'Reanimacion', 'Mindray', 'BeneHeart D3', 'MD223303', @Ubicacion1, 'Inoperativo', '2020-03-11', '2026-08-01', 'Alta', 1),
(NEWID(), 'BI-001', 'Bomba de Infusion', 'Soporte Vida', 'B. Braun', 'Infusomat Space', 'BB99001', @Ubicacion1, 'Operativo', '2024-01-10', '2027-01-10', 'Media', 1),
(NEWID(), 'BI-002', 'Bomba de Infusion', 'Soporte Vida', 'B. Braun', 'Infusomat Space', 'BB99002', @Ubicacion1, 'Operativo', '2024-01-10', '2027-01-10', 'Media', 1),
(NEWID(), 'BI-003', 'Bomba de Infusion', 'Soporte Vida', 'B. Braun', 'Infusomat Space', 'BB99003', @Ubicacion2, 'Operativo', '2024-01-10', '2027-01-10', 'Media', 1),
(NEWID(), 'BI-004', 'Bomba de Infusion', 'Soporte Vida', 'B. Braun', 'Infusomat Space', 'BB99004', @Ubicacion2, 'Mantenimiento', '2024-01-10', '2026-09-05', 'Media', 1),
(NEWID(), 'BI-005', 'Bomba de Infusion', 'Soporte Vida', 'Baxter', 'Sigma Spectrum', 'BX556601', @Ubicacion2, 'Operativo', '2023-06-01', '2026-11-01', 'Media', 1),
(NEWID(), 'VM-001', 'Ventilador Mecanico', 'Soporte Vida', 'Drager', 'Evita V500', 'DR778801', @Ubicacion1, 'Operativo', '2019-11-20', '2026-12-20', 'Alta', 1),
(NEWID(), 'VM-002', 'Ventilador Mecanico', 'Soporte Vida', 'Drager', 'Evita V500', 'DR778802', @Ubicacion1, 'Operativo', '2019-11-20', '2026-12-20', 'Alta', 1),
(NEWID(), 'VM-003', 'Ventilador Mecanico', 'Soporte Vida', 'Drager', 'Evita V500', 'DR778803', @Ubicacion1, 'Operativo', '2019-11-20', '2026-12-20', 'Alta', 1),
(NEWID(), 'VM-004', 'Ventilador Mecanico', 'Soporte Vida', 'Puritan Bennett', '980', 'PB334401', @Ubicacion2, 'Inoperativo', '2020-10-15', '2026-08-15', 'Alta', 1),
(NEWID(), 'VM-005', 'Ventilador Mecanico', 'Soporte Vida', 'Puritan Bennett', '980', 'PB334402', @Ubicacion2, 'Operativo', '2020-10-15', '2026-10-15', 'Alta', 1);

DECLARE @ActivoM1 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'MN-003');
DECLARE @ActivoM2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'BI-004');

INSERT INTO mantenimiento.Mantenimientos (Id, activo_id, biomedico_id, Tipo, Estado, proxima_fecha)
VALUES
(NEWID(), @ActivoM1, @BiomedicoId, 'Preventivo', 'Completado', '2026-09-01'),
(NEWID(), @ActivoM2, @BiomedicoId, 'Correctivo', 'En progreso', '2026-09-05');

DECLARE @ActivoA1 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'MN-004');
DECLARE @ActivoA2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'DF-001');
DECLARE @ActivoA3 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'BI-002');
DECLARE @ActivoA4 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'VM-003');
DECLARE @ActivoA5 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'MN-005');
DECLARE @ActivoA6 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'DF-005');
DECLARE @ActivoA7 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'BI-004');
DECLARE @ActivoA8 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'VM-004');
DECLARE @ActivoA9 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM inventario.Activos WHERE Codigo = 'MN-001');

INSERT INTO alertas.Alertas (Id, activo_id, Tipo, Mensaje, Severidad, Estado)
VALUES
(NEWID(), @ActivoA1, 'Calibración Vencida', 'El equipo Monitor Multiparametro (MN-004) requiere calibración urgente', 'Alta', 'Activa'),
(NEWID(), @ActivoA2, 'Mantenimiento Preventivo Pendiente', 'El equipo Desfibrilador (DF-001) tiene mantenimiento programado para esta semana', 'Media', 'Activa'),
(NEWID(), @ActivoA3, 'Fallo de Autotest', 'La Bomba de Infusion (BI-002) reportó error en su autodiagnóstico diario', 'Alta', 'Activa'),
(NEWID(), @ActivoA4, 'Batería Baja', 'El Ventilador Mecanico (VM-003) requiere reemplazo de batería interna', 'Media', 'Activa'),
(NEWID(), @ActivoA5, 'Equipo Fuera de Servicio', 'El Monitor Multiparametro (MN-005) fue reportado inoperativo por usuario', 'Baja', 'Resuelta'),
(NEWID(), @ActivoA6, 'Mantenimiento Preventivo Vencido', 'El equipo Desfibrilador (DF-005) tiene un retraso de 15 días en mantenimiento', 'Alta', 'Activa'),
(NEWID(), @ActivoA7, 'Error en sensor', 'La Bomba de Infusion (BI-004) detectó anomalía en sensor de presión', 'Alta', 'Resuelta'),
(NEWID(), @ActivoA8, 'Calibración Próxima', 'El Ventilador Mecanico (VM-004) requerirá calibración en 10 días', 'Baja', 'Activa'),
(NEWID(), @ActivoA9, 'Inspección de Rutina', 'Inspección visual y limpieza mensual pendiente para Monitor (MN-001)', 'Baja', 'Activa');

DELETE FROM analitica.Metricas;
INSERT INTO analitica.Metricas (Id, Nombre, Valor)
VALUES
(NEWID(), 'Disponibilidad General', 94.5),
(NEWID(), 'MTBF Promedio (horas)', 4320),
(NEWID(), 'MTTR Promedio (horas)', 4.2),
(NEWID(), 'Cumplimiento Preventivo', 88.5),
(NEWID(), 'Equipos Operativos (%)', 85.0),
(NEWID(), 'Disponibilidad Monitores', 96.2),
(NEWID(), 'Disponibilidad Soporte Vida', 98.1),
(NEWID(), 'Tasa de Fallos Críticos', 1.5);
