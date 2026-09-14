import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import type {
  DB,
  Equipment,
  Location,
  MaintenanceRecord,
  Movement,
  User,
  UserPermissions,
  ModulePermissions,
  Role,
} from "./types";
import { fetchApi } from "./apiClient";
import { toast } from "sonner";

const TOKEN_KEY = "bioasset.token";

export const DEFAULT_PERMISSIONS: Record<Role, UserPermissions> = {
  admin: {
    inventario: { view: true, edit: true },
    movimientos: { view: true, edit: true },
    mantenimiento: { view: true, edit: true },
    ubicaciones: { view: true, edit: true },
    incidencias: { view: true, edit: true },
    alertas: { view: true, edit: true },
    reportes: { view: true, edit: true },
    usuarios: { view: true, edit: true },
    configuracion: { view: true, edit: true },
  },
  biomedico: {
    inventario: { view: true, edit: true },
    movimientos: { view: true, edit: true },
    mantenimiento: { view: true, edit: true },
    ubicaciones: { view: true, edit: true },
    incidencias: { view: true, edit: true },
    alertas: { view: true, edit: true },
    reportes: { view: true, edit: true },
    usuarios: { view: false, edit: false },
    configuracion: { view: false, edit: false },
  },
  asistencial: {
    inventario: { view: true, edit: false },
    movimientos: { view: false, edit: false },
    mantenimiento: { view: false, edit: false },
    ubicaciones: { view: false, edit: false },
    incidencias: { view: true, edit: true },
    alertas: { view: false, edit: false },
    reportes: { view: false, edit: false },
    usuarios: { view: false, edit: false },
    configuracion: { view: false, edit: false },
  },
  auditor: {
    inventario: { view: true, edit: false },
    movimientos: { view: true, edit: false },
    mantenimiento: { view: true, edit: false },
    ubicaciones: { view: true, edit: false },
    incidencias: { view: true, edit: false },
    alertas: { view: true, edit: false },
    reportes: { view: true, edit: false },
    usuarios: { view: true, edit: false },
    configuracion: { view: true, edit: false },
  },
  estudiante: {
    inventario: { view: true, edit: false },
    movimientos: { view: true, edit: false },
    mantenimiento: { view: true, edit: false },
    ubicaciones: { view: true, edit: false },
    incidencias: { view: true, edit: false },
    alertas: { view: false, edit: false },
    reportes: { view: false, edit: false },
    usuarios: { view: false, edit: false },
    configuracion: { view: false, edit: false },
  },
};

export function parseUserPermisos(u: any): UserPermissions {
  const normalizedRol = (u.rol || "asistencial").toLowerCase();
  let permisos = DEFAULT_PERMISSIONS[normalizedRol as Role] || DEFAULT_PERMISSIONS.asistencial;
  try {
    if (u.permisos && u.permisos !== "{}" && typeof u.permisos === "string") {
      permisos = JSON.parse(u.permisos);
    } else if (u.permisos && typeof u.permisos === "object") {
      permisos = u.permisos;
    }
  } catch (e) {
    // fallback
  }
  return permisos;
}

interface Ctx {
  ready: boolean;
  db: DB;
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  isAdmin: boolean;
  isBiomedico: boolean;
  isAsistencial: boolean;
  isAuditor: boolean;
  isEstudiante: boolean;
  canView: (mod: keyof UserPermissions) => boolean;
  canEdit: (mod: keyof UserPermissions) => boolean;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  addEquipment: (e: Omit<Equipment, "id" | "activo">) => Promise<any>;
  updateEquipment: (id: string, patch: Partial<Equipment>) => Promise<void>;
  addMovement: (m: Omit<Movement, "id" | "usuarioId">) => Promise<void>;
  addMaintenance: (m: Omit<MaintenanceRecord, "id">) => Promise<void>;
  updateMaintenance: (id: string, m: Partial<MaintenanceRecord>) => Promise<void>;
  saveLocation: (l: Omit<Location, "id"> & { id?: string | undefined }) => Promise<void>;
  toggleLocation: (id: string) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  toggleUser: (id: string) => Promise<void>;
  addUser: (u: any) => Promise<void>;
  updateUser: (id: string, u: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addIncident: (i: Partial<Incident>) => Promise<void>;
  updateIncident: (id: string, i: Partial<Incident>) => Promise<void>;
  locationName: (id: string) => string;
  userName: (id: string) => string;
  equipmentById: (id: string) => Equipment | undefined;
}

const BioContext = createContext<Ctx | null>(null);

export function BioAssetProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>({
    users: [],
    locations: [],
    equipment: [],
    movements: [],
    maintenance: [],
    incidents: [],
  });
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">(
    () =>
      (typeof window !== "undefined"
        ? (localStorage.getItem("bioasset.theme") as "light" | "dark")
        : "light") || "light",
  );

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
    localStorage.setItem("bioasset.theme", t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    setTheme(theme);
  }, []);

  useEffect(() => {
    const handleRoleChange = () => {
      if (user) {
        // En modo dev reasignar los permisos segÃºn el nuevo rol simulado
        const newPerms = parseUserPermisos({ rol: user.rol, permisos: "{}" });
        setUser({ ...user, permisos: newPerms });
      }
    };
    window.addEventListener("bioasset.rolechanged", handleRoleChange);
    return () => window.removeEventListener("bioasset.rolechanged", handleRoleChange);
  }, [user]);

  const fetchDb = useCallback(async () => {
    try {
      const [usersRes, locsRes, equiposRes, movsRes, mantsRes, marcasRes, incidenciasRes] =
        await Promise.all([
          fetchApi("/auth/usuarios"),
          fetchApi("/inventario/ubicaciones"),
          fetchApi("/inventario/activos"),
          fetchApi("/inventario/movimientos"),
          fetchApi("/mantenimiento/mantenimientos"),
          fetchApi("/inventario/marcas").catch(() => ({ marcas: [] })),
          fetchApi("/mantenimiento/incidencias").catch(() => ({ incidencias: [] })),
        ]);
      setDb({
        users: (usersRes.usuarios || []).map((u: any) => ({
          ...u,
          email: u.email,
          permisos: parseUserPermisos(u),
          sede: u.sede,
          accesoHasta: u.accesoHasta,
          sedeTemporal: u.sedeTemporal,
          sedeTemporalHasta: u.sedeTemporalHasta,
        })),
        locations: (locsRes.ubicaciones || []).map((l: any) => ({
          ...l,
          sede: l.sede || "Sede Principal",
          piso: l.piso || "Piso 1",
        })),
        marcas: marcasRes.marcas || [],
        equipment: (equiposRes.activos || []).map((e: any) => ({
          ...e,
          codigo: e.codigo_qr || e.codigo,
          ubicacionId: e.ubicacion_id || e.ubicacionId,
          fechaAdquisicion: e.fecha_adquisicion || e.fechaAdquisicion,
          proximoMantenimiento: e.proximo_mantenimiento || e.proximoMantenimiento,
        })),
        movements: (movsRes.movimientos || []).map((m: any) => ({
          ...m,
          equipoId: m.equipoId || m.equipo_id,
          origenId: m.origenId || m.origen_id,
          destinoId: m.destinoId || m.destino_id,
          usuarioId: m.usuarioId || m.usuario_id,
        })),
        maintenance: (mantsRes.mantenimientos || []).map((m: any) => ({
          ...m,
          fecha: m.fecha ? m.fecha.substring(0, 10) : new Date().toISOString().substring(0, 10),
          equipoId: m.activo_id || m.equipoId,
          proximaFecha: m.proxima_fecha ? m.proxima_fecha.substring(0, 10) : "",
          biomedicoId: m.biomedico_id || m.biomedicoId || m.tecnico_id || m.tecnicoId,
          resultado: m.estado || m.resultado,
          archivoBase64: m.archivoBase64,
          incidenciaId: m.incidencia_id || m.incidenciaId,
        })),
        incidents: (incidenciasRes.incidencias || []).map((i: any) => ({
          ...i,
          activoId: i.activo_id || i.activoId,
        })),
      });
    } catch (e) {
      console.error("Error loading DB", e);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetchApi("/auth/me")
        .then((res) => {
          setUser({ ...res.user, permisos: parseUserPermisos(res.user) });
          fetchDb();
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, [fetchDb]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetchApi("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem(TOKEN_KEY, res.token);
        setUser({ ...res.user, permisos: parseUserPermisos(res.user) });
        await fetchDb();
        return null;
      } catch (err: any) {
        return err.message;
      }
    },
    [fetchDb],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    setDb({
      users: [],
      locations: [],
      equipment: [],
      movements: [],
      maintenance: [],
      incidents: [],
      marcas: [],
    });
  }, []);

  const filteredDb = useMemo(() => {
    if (!user || user.rol === "admin") return db;

    // Si tiene 'Todas' permanentemente, no filtramos.
    if (user.sede === "Todas") return db;

    // Si tiene una sede temporal asignada y aún es válida
    let hasValidTemporary = false;
    if (user.sedeTemporal && user.sedeTemporal !== "Ninguna" && user.sedeTemporalHasta) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expirationDate = new Date(user.sedeTemporalHasta);
      if (expirationDate >= today) {
        hasValidTemporary = true;
      }
    }

    // Si su sede temporal válida es "Todas", le damos acceso completo
    if (hasValidTemporary && user.sedeTemporal === "Todas") return db;

    const locs = db.locations.filter((l) => {
      if (l.sede === user.sede) return true;
      if (hasValidTemporary && l.sede === user.sedeTemporal) return true;
      return false;
    });
    const locIds = new Set(locs.map((l) => l.id));

    const eqs = db.equipment.filter((e) => locIds.has(e.ubicacionId));
    const eqIds = new Set(eqs.map((e) => e.id));

    return {
      ...db,
      locations: locs,
      equipment: eqs,
      movements: db.movements.filter((m) => eqIds.has(m.equipoId)),
      maintenance: db.maintenance.filter((m) => eqIds.has(m.equipoId)),
      incidents: db.incidents.filter((i) => eqIds.has(i.activoId)),
    };
  }, [db, user]);

  const value: Ctx = {
    ready,
    db: filteredDb,
    user,
    theme,
    setTheme,
    login,
    logout,
    isAdmin: user?.rol === "admin",
    isBiomedico: user?.rol === "biomedico",
    isAsistencial: user?.rol === "asistencial",
    isAuditor: user?.rol === "auditor",
    isEstudiante: user?.rol === "estudiante",
    canView: (mod) => user?.permisos?.[mod]?.view ?? false,
    canEdit: (mod) => user?.permisos?.[mod]?.edit ?? false,
    addEquipment: async (e) => {
      const payload = {
        codigo: e.codigo,
        nombre: e.nombre,
        categoria: e.categoria,
        marca: e.marca,
        modelo: e.modelo,
        serie: e.serie,
        ubicacionId: e.ubicacionId,
        estado: e.estado,
        fechaAdquisicion: e.fechaAdquisicion,
        proximoMantenimiento: e.proximoMantenimiento,
        criticidad: (e as any).criticidad,
      };
      const res = await fetchApi("/inventario/activos", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await fetchApi("/inventario/movimientos", {
        method: "POST",
        body: JSON.stringify({
          equipo_id: res.activo.id,
          origen_id: null,
          destino_id: e.ubicacionId,
          fecha: new Date().toISOString(),
          usuario_id: user?.id,
          motivo: "Alta inicial",
          observaciones: "Registro automÃ¡tico al crear equipo",
        }),
      });
      await fetchDb();
      return res;
    },
    updateEquipment: async (id, patch) => {
      await fetchApi(`/inventario/activos/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await fetchDb();
    },
    addMovement: async (m) => {
      await fetchApi("/inventario/movimientos", {
        method: "POST",
        body: JSON.stringify({
          equipoId: m.equipoId,
          origenId: m.origenId,
          destinoId: m.destinoId,
          fecha: m.fecha,
          usuarioId: user?.id,
          motivo: m.motivo,
          observaciones: m.observaciones,
        }),
      });
      await fetchDb();
    },
    addMaintenance: async (m) => {
      await fetchApi("/mantenimiento/mantenimientos", {
        method: "POST",
        body: JSON.stringify({
          activo_id: m.equipoId,
          biomedico_id: user?.id,
          tipo: m.tipo,
          descripcion: m.descripcion,
          estado: m.resultado, // Hacky mapping, but UI uses 'resultado'
          fecha: m.fecha,
          proxima_fecha: m.proximaFecha,
          observaciones: m.observaciones,
          archivoBase64: m.archivoBase64,
          incidencia_id: m.incidenciaId,
        }),
      });
      await fetchDb();
    },
    updateMaintenance: async (id, m) => {
      await fetchApi(`/mantenimiento/mantenimientos/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          estado: m.resultado,
          descripcion: m.descripcion,
          fecha: m.fecha,
          proxima_fecha: m.proximaFecha,
          observaciones: m.observaciones,
          archivoBase64: m.archivoBase64,
        }),
      });
      await fetchDb();
    },
    saveLocation: async (l) => {
      if (l.id) {
        await fetchApi(`/inventario/ubicaciones/${l.id}`, {
          method: "PUT",
          body: JSON.stringify(l),
        });
      } else {
        await fetchApi("/inventario/ubicaciones", { method: "POST", body: JSON.stringify(l) });
      }
      await fetchDb();
    },
    toggleLocation: async (id) => {
      const loc = db.locations.find((x) => x.id === id);
      if (loc) {
        await fetchApi(`/inventario/ubicaciones/${id}`, {
          method: "PUT",
          body: JSON.stringify({ ...loc, activo: !loc.activo }),
        });
        await fetchDb();
      }
    },
    deleteLocation: async (id) => {
      await fetchApi(`/inventario/ubicaciones/${id}`, { method: "DELETE" });
      await fetchDb();
    },
    toggleUser: async (id) => {
      await fetchApi(`/auth/usuarios/${id}/toggle`, { method: "PUT" });
      await fetchDb();
    },
    addUser: async (u) => {
      // Stringify permisos array to JSON
      if (u.permisos) {
        u.permisos = JSON.stringify(u.permisos);
      }
      await fetchApi("/auth/usuarios", { method: "POST", body: JSON.stringify(u) });
      await fetchDb();
    },
    updateUser: async (id, u) => {
      if (u.permisos) {
        u.permisos = JSON.stringify(u.permisos);
      }
      await fetchApi(`/auth/usuarios/${id}`, { method: "PUT", body: JSON.stringify(u) });
      await fetchDb();
    },
    deleteUser: async (id) => {
      await fetchApi(`/auth/usuarios/${id}`, { method: "DELETE" });
      await fetchDb();
    },
    addIncident: async (i) => {
      await fetchApi("/mantenimiento/incidencias", { method: "POST", body: JSON.stringify(i) });
      await fetchDb();
    },
    updateIncident: async (id, i) => {
      await fetchApi(`/mantenimiento/incidencias/${id}`, { method: "PUT", body: JSON.stringify(i) });
      await fetchDb();
    },
    locationName: (id) => db.locations.find((l) => l.id === id)?.nombre ?? "N/A",
    userName: (id) => db.users.find((u) => u.id === id)?.nombre ?? "â€”",
    equipmentById: (id) => {
      const e = db.equipment.find((x) => x.id === id);
      if (!e) return undefined;
      // Map DB snake_case to UI camelCase
      return {
        ...e,
        codigo: (e as any).codigo_qr,
        ubicacionId: (e as any).ubicacion_id,
        fechaAdquisicion: (e as any).fecha_adquisicion,
        proximoMantenimiento: (e as any).proximo_mantenimiento,
      };
    },
  };

  return <BioContext.Provider value={value}>{children}</BioContext.Provider>;
}

export function useBio() {
  const ctx = useContext(BioContext);
  if (!ctx) throw new Error("useBio debe usarse dentro de BioAssetProvider");
  return ctx;
}

export function daysUntil(dateStr: string) {
  if (!dateStr) return 0;
  const target = new Date(`${dateStr}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

export function formatDate(value: string) {
  if (!value) return "N/A";
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string) {
  if (!value) return "N/A";
  const d = new Date(value);
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
