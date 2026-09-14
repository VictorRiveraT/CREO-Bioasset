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
  incidenciaId?: string;
}

export interface Incident {
  id: string;
  activoId: string;
  titulo: string;
  estado: string;
}

export interface DB {
  users: User[];
  locations: Location[];
  equipment: Equipment[];
  movements: Movement[];
  maintenance: MaintenanceRecord[];
  incidents: Incident[];
}
