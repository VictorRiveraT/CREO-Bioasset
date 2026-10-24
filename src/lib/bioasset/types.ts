export type Role = "admin" | "biomedico" | "asistencial" | "auditor" | "estudiante";

export type EquipmentStatus = "Operativo" | "En mantenimiento" | "Fuera de servicio" | "De baja";

export const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "Operativo",
  "En mantenimiento",
  "Fuera de servicio",
  "De baja",
];

export const CATEGORIES = [
  "Diagnóstico por imagen",
  "Monitoreo",
  "Soporte vital",
  "Terapia",
  "Laboratorio",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ModulePermissions = {
  view: boolean;
  edit: boolean;
};

export type UserPermissions = {
  inventario: ModulePermissions;
  movimientos: ModulePermissions;
  mantenimiento: ModulePermissions;
  ubicaciones: ModulePermissions;
  incidencias: ModulePermissions;
  alertas: ModulePermissions;
  reportes: ModulePermissions;
  usuarios: ModulePermissions;
  configuracion: ModulePermissions;
};

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  activo: boolean;
  permisos: UserPermissions;
  sede?: string;
  sedeTemporal?: string;
  accesoHasta?: string;
  sedeTemporalHasta?: string;
  password?: string;
}

export interface Location {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  sede?: string;
  piso?: string;
}

export interface Equipment {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  marca: string;
  modelo: string;
  serie: string;
  ubicacionId: string;
  estado: EquipmentStatus;
  fechaAdquisicion: string;
  proximoMantenimiento: string;
  activo: boolean;
  claseActivo?: "Biomedico" | "Tecnologico";
}

export interface Movement {
  id: string;
  equipoId: string;
  origenId: string | null;
  destinoId: string;
  fecha: string;
  usuarioId: string;
  motivo: string;
  observaciones: string;
}

export type MaintenanceType = "Preventivo" | "Correctivo";

export interface MaintenanceRecord {
  id: string;
  equipoId: string;
  tipo: MaintenanceType;
  fecha: string;
  biomedicoId: string;
  descripcion: string;
  resultado: string;
  observaciones: string;
  proximaFecha: string;
  archivoBase64?: string;
  tecnicoId?: string;
  costo?: number;
  proveedor?: string;
  incidenciaId?: string;
  cotizacion?: {
    repuestos?: { descripcion: string; cantidad: number; precioUnitario: number; total: number; proveedor?: string }[];
    manoDeObra?: number;
    contratista?: string;
    totalGeneral?: number;
    estadoCotizacion?: "Pendiente" | "Aprobada" | "Rechazada";
    archivoCotizacionUrl?: string;
  };
}

export interface Incident {
  id: string;
  activoId: string;
  activo_id?: string;
  titulo: string;
  estado: string;
  fecha?: string;
  fechaCreacion?: string;
}

export interface DB {
  users: User[];
  locations: Location[];
  equipment: Equipment[];
  movements: Movement[];
  maintenance: MaintenanceRecord[];
  incidents: Incident[];
  alertas: Alerta[];
  marcas?: any[];
  opcionesCatalogo: OpcionCatalogo[];
}

export interface Alerta {
  id: string;
  activoId: string;
  tipo: string;
  mensaje: string;
  severidad: string;
  estado: string;
  fecha?: string;
  fechaCreacion?: string;
}

export interface OpcionCatalogo {
  id: string;
  tipo: "categoria_equipo" | "estado_equipo" | "motivo_traslado" | "tipo_mantenimiento" | "resultado_mantenimiento" | "falla_frecuente" | string;
  valor: string;
  descripcion?: string;
  activo: boolean;
  orden: number;
  sede?: string;
  fechaCreacion?: string;
}
