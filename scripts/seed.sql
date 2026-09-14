USE bioasset;

DELETE FROM inventario.Movimientos;
DELETE FROM mantenimiento.Mantenimientos;
DELETE FROM alertas.Alertas;
DELETE FROM inventario.Activos;
DELETE FROM inventario.Ubicaciones;
DELETE FROM analitica.Metricas;

DECLARE @AdminId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM auth.Usuarios WHERE Rol = 'admin');
DECLARE @BiomedicoId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM auth.Usuarios WHERE Rol = 'biomedico');
DECLARE @AsistencialId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM auth.Usuarios WHERE Rol = 'asistencial');

IF @BiomedicoId IS NULL SET @BiomedicoId = NEWID();
IF @AdminId IS NULL SET @AdminId = NEWID();

DECLARE @Ub_Mira_P1 UNIQUEIDENTIFIER = NEWID(); DECLARE @Ub_Mira_P2 UNIQUEIDENTIFIER = NEWID();
DECLARE @Ub_SanI_P1 UNIQUEIDENTIFIER = NEWID(); DECLARE @Ub_SanI_P3 UNIQUEIDENTIFIER = NEWID();
DECLARE @Ub_Surco_S1 UNIQUEIDENTIFIER = NEWID(); DECLARE @Ub_Surco_P2 UNIQUEIDENTIFIER = NEWID();
DECLARE @Ub_Lima_P4 UNIQUEIDENTIFIER = NEWID(); DECLARE @Ub_Lima_S2 UNIQUEIDENTIFIER = NEWID();

INSERT INTO inventario.Ubicaciones (Id, Nombre, Descripcion, Piso, Sede, Activo) VALUES 
(@Ub_Mira_P1, 'Emergencia', 'Sala de Triaje y Emergencias', 'Piso 1', 'Miraflores', 1),
(@Ub_Mira_P2, 'UCI Adultos', 'Unidad de Cuidados Intensivos', 'Piso 2', 'Miraflores', 1),
(@Ub_SanI_P1, 'Laboratorio', 'Analisis clinicos', 'Piso 1', 'San Isidro', 1),
(@Ub_SanI_P3, 'Quirofano A', 'Centro Quirurgico Principal', 'Piso 3', 'San Isidro', 1),
(@Ub_Surco_S1, 'Imagenologia', 'Rayos X, RM y Tomografia', 'Sotano 1', 'Surco', 1),
(@Ub_Surco_P2, 'Pediatria', 'Hospitalizacion Infantil', 'Piso 2', 'Surco', 1),
(@Ub_Lima_P4, 'Cardiologia', 'Pabellon de Cardiologia', 'Piso 4', 'Lima Centro', 1),
(@Ub_Lima_S2, 'Almacen Central', 'Almacen de equipos de reserva', 'Sotano 2', 'Lima Centro', 1);

DECLARE @Eq1 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq2 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq3 UNIQUEIDENTIFIER = NEWID();
DECLARE @Eq4 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq5 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq6 UNIQUEIDENTIFIER = NEWID();
DECLARE @Eq7 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq8 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq9 UNIQUEIDENTIFIER = NEWID();
DECLARE @Eq10 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq11 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq12 UNIQUEIDENTIFIER = NEWID();
DECLARE @Eq13 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq14 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq15 UNIQUEIDENTIFIER = NEWID();
DECLARE @Eq16 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq17 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq18 UNIQUEIDENTIFIER = NEWID();
DECLARE @Eq19 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq20 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq21 UNIQUEIDENTIFIER = NEWID();
DECLARE @Eq22 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq23 UNIQUEIDENTIFIER = NEWID(); DECLARE @Eq24 UNIQUEIDENTIFIER = NEWID();
DECLARE @Eq25 UNIQUEIDENTIFIER = NEWID();

INSERT INTO inventario.Activos (Id, Codigo, Nombre, Categoria, Marca, Modelo, Serie, UbicacionId, Estado, FechaAdquisicion, ProximoMantenimiento, Criticidad, activo) VALUES
(@Eq1, 'MN-001', 'Monitor Multiparametro', 'Monitoreo', 'Philips', 'IntelliVue MX400', 'PH123001', @Ub_Mira_P2, 'Operativo', '2022-01-10', '2026-10-01', 'Alta', 1),
(@Eq2, 'MN-002', 'Monitor de Signos Vitales', 'Monitoreo', 'Philips', 'IntelliVue MX400', 'PH123002', @Ub_Mira_P1, 'Operativo', '2022-01-10', '2026-10-01', 'Media', 1),
(@Eq3, 'MN-003', 'Monitor Fetal', 'Monitoreo', 'GE Healthcare', 'Corometrics 250cx', 'GE44332', @Ub_Surco_P2, 'En mantenimiento', '2021-05-12', '2026-09-01', 'Media', 1),
(@Eq4, 'MN-004', 'Monitor Multiparametro', 'Monitoreo', 'Mindray', 'BeneVision N12', 'MD45001', @Ub_Lima_P4, 'Operativo', '2023-05-15', '2026-11-15', 'Alta', 1),
(@Eq5, 'MN-005', 'Monitor Signos Vitales', 'Monitoreo', 'Mindray', 'BeneVision N12', 'MD45002', @Ub_Lima_S2, 'De baja', '2019-02-20', '2024-02-20', 'Media', 0),
(@Eq6, 'DF-001', 'Desfibrilador', 'Reanimacion', 'Zoll', 'R Series', 'ZL112201', @Ub_Mira_P1, 'Operativo', '2021-08-05', '2026-12-01', 'Alta', 1),
(@Eq7, 'DF-002', 'Desfibrilador Externo', 'Reanimacion', 'Zoll', 'AED Plus', 'ZL112202', @Ub_SanI_P1, 'Operativo', '2021-08-05', '2026-12-01', 'Alta', 1),
(@Eq8, 'DF-003', 'Desfibrilador', 'Reanimacion', 'Mindray', 'BeneHeart D3', 'MD223301', @Ub_Mira_P2, 'Operativo', '2020-03-11', '2026-10-15', 'Alta', 1),
(@Eq9, 'DF-004', 'Desfibrilador', 'Reanimacion', 'Mindray', 'BeneHeart D3', 'MD223302', @Ub_SanI_P3, 'Operativo', '2020-03-11', '2026-10-15', 'Alta', 1),
(@Eq10, 'DF-005', 'Desfibrilador', 'Reanimacion', 'Mindray', 'BeneHeart D3', 'MD223303', @Ub_Lima_S2, 'Inoperativo', '2020-03-11', '2026-08-01', 'Alta', 1),
(@Eq11, 'BI-001', 'Bomba de Infusion', 'Soporte Vida', 'B. Braun', 'Infusomat Space', 'BB99001', @Ub_Mira_P2, 'Operativo', '2024-01-10', '2027-01-10', 'Media', 1),
(@Eq12, 'BI-002', 'Bomba de Infusion', 'Soporte Vida', 'B. Braun', 'Infusomat Space', 'BB99002', @Ub_SanI_P3, 'Operativo', '2024-01-10', '2027-01-10', 'Media', 1),
(@Eq13, 'BI-003', 'Bomba de Infusion Volumetrica', 'Soporte Vida', 'Baxter', 'Sigma Spectrum', 'BX556601', @Ub_Surco_P2, 'Operativo', '2023-06-01', '2026-11-01', 'Media', 1),
(@Eq14, 'BI-004', 'Bomba de Infusion', 'Soporte Vida', 'B. Braun', 'Infusomat Space', 'BB99004', @Ub_Mira_P1, 'En mantenimiento', '2024-01-10', '2026-09-05', 'Media', 1),
(@Eq15, 'BI-005', 'Bomba de Jeringa', 'Soporte Vida', 'Baxter', 'Sigma Spectrum', 'BX556602', @Ub_Lima_P4, 'Operativo', '2023-06-01', '2026-11-01', 'Media', 1),
(@Eq16, 'VM-001', 'Ventilador Mecanico Adulto', 'Soporte Vida', 'Drager', 'Evita V500', 'DR778801', @Ub_Mira_P2, 'Operativo', '2019-11-20', '2026-12-20', 'Alta', 1),
(@Eq17, 'VM-002', 'Ventilador Mecanico Pedi', 'Soporte Vida', 'Drager', 'Evita V500', 'DR778802', @Ub_Surco_P2, 'Operativo', '2019-11-20', '2026-12-20', 'Alta', 1),
(@Eq18, 'VM-003', 'Ventilador Mecanico', 'Soporte Vida', 'Puritan Bennett', '980', 'PB334401', @Ub_SanI_P3, 'Inoperativo', '2020-10-15', '2026-08-15', 'Alta', 1),
(@Eq19, 'RX-001', 'Maquina Rayos X Portatil', 'Imagenologia', 'Siemens', 'Mobilett Elara Max', 'SM001X', @Ub_Surco_S1, 'Operativo', '2021-02-14', '2026-11-10', 'Alta', 1),
(@Eq20, 'US-001', 'Ecografo 3D', 'Imagenologia', 'GE Healthcare', 'Voluson E8', 'GE888US', @Ub_Surco_S1, 'Operativo', '2022-09-09', '2027-02-28', 'Media', 1),
(@Eq21, 'AN-001', 'Maquina de Anestesia', 'Soporte Vida', 'Drager', 'Fabius Plus', 'DRAN01', @Ub_SanI_P3, 'Operativo', '2020-01-10', '2026-10-05', 'Alta', 1),
(@Eq22, 'AN-002', 'Maquina de Anestesia', 'Soporte Vida', 'Drager', 'Fabius Plus', 'DRAN02', @Ub_SanI_P3, 'Operativo', '2020-01-10', '2026-10-05', 'Alta', 1),
(@Eq23, 'EK-001', 'Electrocardiografo', 'Diagnostico', 'Schiller', 'Cardiovit AT-102', 'SC10201', @Ub_Lima_P4, 'Operativo', '2023-04-20', '2026-10-20', 'Baja', 1),
(@Eq24, 'IN-001', 'Incubadora Neonatal', 'Soporte Vida', 'Drager', 'Isolette 8000', 'DRIN01', @Ub_Surco_P2, 'Operativo', '2021-07-15', '2026-12-10', 'Alta', 1),
(@Eq25, 'LA-001', 'Analizador de Sangre', 'Laboratorio', 'Abbott', 'i-STAT 1', 'ABBLAB01', @Ub_SanI_P1, 'Operativo', '2023-11-11', '2026-11-11', 'Media', 1);

INSERT INTO inventario.Movimientos (Id, EquipoId, OrigenId, DestinoId, UsuarioId, Fecha, Motivo, Observaciones) VALUES
(NEWID(), @Eq10, @Ub_Mira_P1, @Ub_Lima_S2, @AdminId, '2026-08-10', 'Dado de baja temporal', 'Se envio al almacen central por fallos repetitivos.'),
(NEWID(), @Eq4, @Ub_Lima_S2, @Ub_Lima_P4, @AdminId, '2026-09-01', 'Reasignacion de area', 'Se necesita en cardiologia por aumento de pacientes.'),
(NEWID(), @Eq14, @Ub_SanI_P3, @Ub_Mira_P1, @BiomedicoId, '2026-09-05', 'Emergencia', 'Prestamo urgente para triaje.'),
(NEWID(), @Eq3, @Ub_Surco_S1, @Ub_Surco_P2, @BiomedicoId, '2026-09-10', 'Reubicacion', 'Mejor accesibilidad en pediatria.'),
(NEWID(), @Eq7, @Ub_Lima_S2, @Ub_SanI_P1, @AsistencialId, '2026-09-12', 'Sustitucion', 'Reemplazo de un equipo en laboratorio.');

INSERT INTO mantenimiento.Mantenimientos (Id, activo_id, biomedico_id, Tipo, Estado, proxima_fecha)
VALUES
(NEWID(), @Eq1, @BiomedicoId, 'Preventivo', 'Completado', '2026-10-01'),
(NEWID(), @Eq19, @BiomedicoId, 'Preventivo', 'Completado', '2026-11-10'),
(NEWID(), @Eq3, @BiomedicoId, 'Correctivo', 'En progreso', '2026-09-01'),
(NEWID(), @Eq14, @BiomedicoId, 'Correctivo', 'En progreso', '2026-09-05'),
(NEWID(), @Eq18, @BiomedicoId, 'Correctivo', 'Pendiente', '2026-08-15'),
(NEWID(), @Eq24, @BiomedicoId, 'Preventivo', 'Pendiente', '2026-12-10'),
(NEWID(), @Eq25, @BiomedicoId, 'Preventivo', 'Completado', '2026-11-11');

INSERT INTO alertas.Alertas (Id, activo_id, Tipo, Mensaje, Severidad, Estado)
VALUES
(NEWID(), @Eq18, 'Calibracion Vencida', 'El Ventilador Mecanico requiere calibracion urgente', 'Alta', 'Activa'),
(NEWID(), @Eq10, 'Mantenimiento Pendiente', 'Desfibrilador en Almacen Central tiene mantenimiento programado vencido', 'Media', 'Activa'),
(NEWID(), @Eq3, 'Fallo de Hardware', 'Monitor Fetal reporto error de sistema E-404', 'Alta', 'Activa'),
(NEWID(), @Eq14, 'Bateria Critica', 'Bomba de Infusion reporta bateria interna defectuosa', 'Alta', 'Activa'),
(NEWID(), @Eq5, 'Equipo Fuera de Servicio', 'Monitor de signos vitales dado de baja', 'Baja', 'Resuelta');

INSERT INTO analitica.Metricas (Id, Nombre, Valor)
VALUES
(NEWID(), 'Disponibilidad General', 92.5),
(NEWID(), 'MTBF Promedio (horas)', 4100),
(NEWID(), 'MTTR Promedio (horas)', 5.1),
(NEWID(), 'Cumplimiento Preventivo', 86.2),
(NEWID(), 'Equipos Operativos (%)', 88.0),
(NEWID(), 'Disponibilidad Monitores', 94.2),
(NEWID(), 'Disponibilidad Soporte Vida', 97.5),
(NEWID(), 'Tasa de Fallos Criticos', 2.1);
