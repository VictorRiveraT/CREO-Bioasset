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
  Incident,
  User,
  UserPermissions,
  ModulePermissions,
  Role,
  OpcionCatalogo,
} from "./types";
import { CATEGORIES, EQUIPMENT_STATUSES } from "./types";

import { fetchApi } from "./apiClient";

import { toast } from "sonner";

const TOKEN_KEY = "bioasset.token";

const DEFAULT_CATEGORIAS = [
  "Diagnóstico por imagen",
  "Monitoreo",
  "Soporte vital",
  "Terapia",
  "Laboratorio",
  "Odontología",
  "Rehabilitación",
  "Tecnológico / TI",
];

const DEFAULT_ESTADOS_EQUIPO = [
  "Operativo",
  "En mantenimiento",
  "Fuera de servicio",
  "De baja",
];

const DEFAULT_MOTIVOS_TRASLADO = [
  "Mantenimiento preventivo",
  "Mantenimiento correctivo",
  "Calibración",
  "Préstamo inter-áreas",
  "Reubicación permanente",
  "Baja temporal",
  "Actualización tecnológica",
  "Evaluación técnica",
];

const DEFAULT_TIPOS_MANTENIMIENTO = [
  "Preventivo",
  "Correctivo",
  "Calibración",
  "Predictivo",
  "Instalación / Puesta en marcha",
];

const DEFAULT_RESULTADOS_MANTENIMIENTO = [
  "Completado / Operativo",
  "Pendiente de repuestos",
  "Requiere evaluación adicional",
  "No superó pruebas / Fuera de servicio",
];

export const DEFAULT_FALLAS_FRECUENTES = [
  { valor: "Falla de encendido / No inicia", categoria: "Todas", marca: "Todas", modelo: "Todos", descripcion: "Alimentación eléctrica / Batería" },
  { valor: "Falla en sensor SpO2 / Cables ECG", categoria: "Monitoreo", marca: "Todas", modelo: "Todos", descripcion: "Monitoreo" },
  { valor: "Fuga de aire / presión en manguera NIBP", categoria: "Monitoreo", marca: "Todas", modelo: "Todos", descripcion: "Monitoreo / Neumática" },
  { valor: "Descalibración o lectura errónea", categoria: "Laboratorio", marca: "Todas", modelo: "Todos", descripcion: "Sensores / Calibración" },
  { valor: "Batería degradada / no retiene carga", categoria: "Soporte vital", marca: "Todas", modelo: "Todos", descripcion: "Batería / Fuente" },
  { valor: "Pantalla táctil o perilla no responde", categoria: "Monitoreo", marca: "Philips", modelo: "IntelliVue MX400", descripcion: "Interfaz / Pantalla" },
  { valor: "Alarma persistente sin causa aparente", categoria: "Todas", marca: "Todas", modelo: "Todos", descripcion: "Sistema / Software" },
  { valor: "Falla en mecanismo de infusión / motor", categoria: "Soporte vital", marca: "B. Braun", modelo: "Infusomat Space", descripcion: "Soporte vital" },
  { valor: "Fallo de palas / descarga de desfibrilador", categoria: "Reanimación", marca: "Mindray", modelo: "BeneHeart D3", descripcion: "Reanimación" },
  { valor: "Problema de conexión / red / impresión", categoria: "Tecnológico / TI", marca: "Todas", modelo: "Todos", descripcion: "Tecnológico / TI" },
];

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

    ubicaciones: { view: true, edit: false },

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
  const normalizedRol = (u?.rol || "asistencial").toLowerCase();

  const defaultForRole = DEFAULT_PERMISSIONS[normalizedRol as Role] || DEFAULT_PERMISSIONS.asistencial;

  if (normalizedRol === "admin" || normalizedRol === "administrador") {
    return DEFAULT_PERMISSIONS.admin;
  }

  let raw = u?.permisos;
  if (typeof raw === "string" && raw !== "{}") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  if (!raw || typeof raw !== "object") {
    return defaultForRole;
  }

  const merged: UserPermissions = { ...defaultForRole };
  for (const mod of Object.keys(defaultForRole) as Array<keyof UserPermissions>) {
    if (raw[mod] !== undefined) {
      if (typeof raw[mod] === "boolean") {
        merged[mod] = { view: raw[mod], edit: raw[mod] };
      } else if (typeof raw[mod] === "object" && raw[mod] !== null) {
        merged[mod] = {
          view: raw[mod].view ?? defaultForRole[mod].view,
          edit: raw[mod].edit ?? defaultForRole[mod].edit,
        };
      }
    }
  }

  return merged;
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

  updateAlerta: (id: string, a: Partial<Alerta>) => Promise<void>;

  locationName: (id: string) => string;

  locationFullName: (id: string) => string;

  userName: (id: string) => string;

  equipmentById: (id: string) => Equipment | undefined;

  saveMarca: (marca: { id?: string; nombre: string; modelosJson: string }) => Promise<void>;

  deleteMarca: (id: string) => Promise<void>;

  addOpcionCatalogo: (op: Partial<OpcionCatalogo>) => Promise<any>;

  updateOpcionCatalogo: (id: string, op: Partial<OpcionCatalogo>) => Promise<any>;

  deleteOpcionCatalogo: (id: string) => Promise<any>;

  categorias: string[];

  estadosEquipo: string[];

  motivosTraslado: string[];

  tiposMantenimiento: string[];

  resultadosMantenimiento: string[];

  fallasFrecuentes: { id?: string; valor: string; categoria?: string; marca?: string; modelo?: string; descripcion?: string; detalle?: string }[];
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
    alertas: [],
    opcionesCatalogo: [],
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
        // En modo dev reasignar los permisos según el nuevo rol simulado
        const newPerms = parseUserPermisos({ rol: user.rol, permisos: "{}" });
        setUser({ ...user, permisos: newPerms });
      }
    };
    window.addEventListener("bioasset.rolechanged", handleRoleChange);
    return () => window.removeEventListener("bioasset.rolechanged", handleRoleChange);
  }, [user]);

  const fetchDb = useCallback(async () => {
    try {
      const [
        usersRes,
        locsRes,
        equiposRes,
        movsRes,
        mantsRes,
        marcasRes,
        incidenciasRes,
        alertasRes,
        opcionesRes,
      ] = await Promise.all([
        fetchApi("/auth/usuarios").catch((err) => {
          console.error("[fetchDb] Error en /auth/usuarios:", err);
          return { usuarios: [] };
        }),
        fetchApi("/inventario/ubicaciones").catch((err) => {
          console.error("[fetchDb] Error en /inventario/ubicaciones:", err);
          return { ubicaciones: [] };
        }),
        fetchApi("/inventario/activos").catch((err) => {
          console.error("[fetchDb] Error en /inventario/activos:", err);
          return { activos: [] };
        }),
        fetchApi("/inventario/movimientos").catch((err) => {
          console.error("[fetchDb] Error en /inventario/movimientos:", err);
          return { movimientos: [] };
        }),
        fetchApi("/mantenimiento/mantenimientos").catch((err) => {
          console.error("[fetchDb] Error en /mantenimiento/mantenimientos:", err);
          return { mantenimientos: [] };
        }),
        fetchApi("/inventario/marcas").catch((err) => {
          console.error("[fetchDb] Error en /inventario/marcas:", err);
          return { marcas: [] };
        }),
        fetchApi("/mantenimiento/incidencias").catch((err) => {
          console.error("[fetchDb] Error en /mantenimiento/incidencias:", err);
          return { incidencias: [] };
        }),
        fetchApi("/alertas/alertas").catch((err) => {
          console.error("[fetchDb] Error en /alertas/alertas:", err);
          return { alertas: [] };
        }),
        fetchApi("/inventario/opciones").catch((err) => {
          console.error("[fetchDb] Error en /inventario/opciones:", err);
          return { opciones: [] };
        }),
      ]);

      const rawOpciones = Array.isArray((opcionesRes as any)?.opciones) ? (opcionesRes as any).opciones : [];

      const rawActivos = Array.isArray(equiposRes?.activos)
        ? equiposRes.activos
        : Array.isArray(equiposRes)
          ? equiposRes
          : [];
      const rawLocs = Array.isArray(locsRes?.ubicaciones)
        ? locsRes.ubicaciones
        : Array.isArray(locsRes)
          ? locsRes
          : [];
      const rawUsers = Array.isArray(usersRes?.usuarios)
        ? usersRes.usuarios
        : Array.isArray(usersRes)
          ? usersRes
          : [];
      const rawMovs = Array.isArray(movsRes?.movimientos)
        ? movsRes.movimientos
        : Array.isArray(movsRes)
          ? movsRes
          : [];
      const rawMants = Array.isArray(mantsRes?.mantenimientos)
        ? mantsRes.mantenimientos
        : Array.isArray(mantsRes)
          ? mantsRes
          : [];
      const rawMarcas = Array.isArray(marcasRes?.marcas)
        ? marcasRes.marcas
        : Array.isArray(marcasRes)
          ? marcasRes
          : [];
      const rawIncidencias = Array.isArray(incidenciasRes?.incidencias)
        ? incidenciasRes.incidencias
        : Array.isArray(incidenciasRes)
          ? incidenciasRes
          : [];
      const rawAlertas = Array.isArray(alertasRes?.alertas)
        ? alertasRes.alertas
        : Array.isArray(alertasRes)
          ? alertasRes
          : [];

      console.log(
        `[fetchDb] Datos cargados exitosamente: ${rawActivos.length} activos, ${rawLocs.length} ubicaciones, ${rawUsers.length} usuarios.`,
      );

      setDb({
        users: rawUsers.map((u: any) => ({
          ...u,
          email: u.email,
          permisos: parseUserPermisos(u),
          sede: u.sede,
          accesoHasta: u.accesoHasta,
          sedeTemporal: u.sedeTemporal,
          sedeTemporalHasta: u.sedeTemporalHasta,
        })),
        locations: rawLocs.map((l: any) => {
          let sedeVal = (l.sede || "Sede Principal").trim();
          if (sedeVal.toLowerCase() === "surco") {
            sedeVal = "Santiago de Surco";
          }
          return {
            ...l,
            sede: sedeVal,
            piso: l.piso || "Piso 1",
          };
        }),
        marcas: rawMarcas,
        equipment: rawActivos.map((e: any) => ({
          ...e,
          codigo: e.codigo_qr || e.codigo,
          ubicacionId: e.ubicacion_id || e.ubicacionId,
          fechaAdquisicion: e.fecha_adquisicion || e.fechaAdquisicion,
          proximoMantenimiento: e.proximo_mantenimiento || e.proximoMantenimiento,
          activo: e.activo !== false && e.activo !== 0,
        })),
        movements: rawMovs.map((m: any) => ({
          ...m,
          equipoId: m.equipoId || m.equipo_id,
          origenId: m.origenId || m.origen_id,
          destinoId: m.destinoId || m.destino_id,
          usuarioId: m.usuarioId || m.usuario_id,
        })),
        maintenance: rawMants.map((m: any) => ({
          ...m,
          fecha: m.fecha ? m.fecha.substring(0, 10) : new Date().toISOString().substring(0, 10),
          equipoId: m.activo_id || m.equipoId,
          proximaFecha: m.proxima_fecha ? m.proxima_fecha.substring(0, 10) : "",
          biomedicoId: m.biomedico_id || m.biomedicoId || m.tecnico_id || m.tecnicoId,
          resultado: m.estado || m.resultado,
          archivoBase64: m.archivoBase64,
          incidenciaId: m.incidencia_id || m.incidenciaId,
        })),
        incidents: rawIncidencias.map((i: any) => ({
          ...i,
          activoId: i.activo_id || i.activoId,
          fechaOcurrencia: i.fecha_ocurrencia || i.fechaOcurrencia,
          fechaCreacion: i.fecha_creacion || i.fechaCreacion,
          fecha: i.fecha_ocurrencia || i.fecha_creacion || i.fecha,
          usuarioId: i.usuario_id || i.usuarioId,
        })),
        alertas: rawAlertas.map((a: any) => ({
          ...a,
          activoId: a.activo_id || a.activoId,
        })),
        opcionesCatalogo: rawOpciones,
      });
    } catch (e) {
      console.error("[fetchDb] Error loading DB:", e);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetchApi("/auth/me")
        .then((res) => {
          if (
            res.user.permisos &&
            typeof res.user.permisos === "string" &&
            res.user.permisos.includes('"forzarReset":true')
          ) {
            throw new Error("force_reset");
          }
          const finalUser = { ...res.user, permisos: parseUserPermisos(res.user) };
          localStorage.setItem("bioasset_user_id_temp", finalUser.id);
          setUser(finalUser);
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
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(`bioasset_toast_shown_${res.user.id}`);
        }
        setUser({ ...res.user, permisos: parseUserPermisos(res.user) });
        await fetchDb();
        toast.success(`¡Sesión iniciada como ${res.user.nombre}!`);
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
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      window.location.replace("/");
    }
    setDb({
      users: [],
      locations: [],
      equipment: [],
      movements: [],
      maintenance: [],
      incidents: [],
      marcas: [],
      alertas: [],
      opcionesCatalogo: [],
    });
  }, []);

  const filteredDb = useMemo(() => {
    if (!user) return db;

    const userSedeRaw = (user.sede || "").trim();
    if (!userSedeRaw || userSedeRaw.toLowerCase().includes("todas") || user.rol === "admin") {
      return db;
    }

    // Si tiene una sede temporal asignada y aún es válida

    let hasValidTemporary = false;

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (user.sedeTemporal && user.sedeTemporal !== "Ninguna" && user.sedeTemporalHasta) {
      const expirationDate = new Date(user.sedeTemporalHasta);

      if (expirationDate >= today) {
        hasValidTemporary = true;
      }
    }

    // Parse multiple sedes

    let accesosExtra: { sede: string; hasta: string }[] = [];

    try {
      if (user.sedeTemporal && user.sedeTemporal.startsWith("[")) {
        accesosExtra = JSON.parse(user.sedeTemporal).filter((x: any) => new Date(x.hasta) >= today);
      } else if (user.sedeTemporal && user.sedeTemporal !== "Ninguna" && hasValidTemporary) {
        accesosExtra = [{ sede: user.sedeTemporal, hasta: user.sedeTemporalHasta || "" }];
      }
    } catch {
      // Ignorar fallo de parseo JSON si el valor no es un arreglo
    }

    // Si su sede temporal válida es "Todas", le damos acceso completo

    if (accesosExtra.some((x) => x.sede === "Todas")) return db;

    const userSedeLower = userSedeRaw.toLowerCase();
    const locs = db.locations.filter((l) => {
      const lSedeLower = (l.sede || "Sede Principal").toLowerCase();
      if (
        lSedeLower === userSedeLower ||
        lSedeLower.includes(userSedeLower) ||
        userSedeLower.includes(lSedeLower)
      )
        return true;
      if (
        accesosExtra.some(
          (x) =>
            x.sede.toLowerCase().includes(lSedeLower) || lSedeLower.includes(x.sede.toLowerCase()),
        )
      )
        return true;
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
      alertas: db.alertas.filter((a) => eqIds.has(a.activoId)),
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

    isAdmin: (user?.rol || "").toLowerCase() === "admin" || (user?.rol || "").toLowerCase() === "administrador",

    isBiomedico: (user?.rol || "").toLowerCase() === "biomedico",

    isAsistencial: (user?.rol || "").toLowerCase() === "asistencial",

    isAuditor: (user?.rol || "").toLowerCase() === "auditor",

    isEstudiante: (user?.rol || "").toLowerCase() === "estudiante",

    canView: (mod) => {
      if ((user?.rol || "").toLowerCase() === "admin" || (user?.rol || "").toLowerCase() === "administrador") return true;
      return user?.permisos?.[mod]?.view ?? false;
    },

    canEdit: (mod) => {
      if ((user?.rol || "").toLowerCase() === "admin" || (user?.rol || "").toLowerCase() === "administrador") return true;
      return user?.permisos?.[mod]?.edit ?? false;
    },

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

          observaciones: "Registro automático al crear equipo",
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

      if (m.equipoId) {
        const patchPayload: Record<string, any> = {};
        if (m.resultado === "En progreso" || m.resultado === "En proceso") {
          patchPayload['estado'] = 'En mantenimiento';
        } else if (m.resultado === "Completado") {
          patchPayload['estado'] = 'Operativo';
          if (m.proximaFecha) {
            patchPayload['proximoMantenimiento'] = m.proximaFecha;
          }
        }
        if (Object.keys(patchPayload).length > 0) {
          await fetchApi(`/inventario/activos/${m.equipoId}`, {
            method: "PATCH",
            body: JSON.stringify(patchPayload),
          }).catch((e) => console.warn("Failed to sync equipment status:", e));
        }
      }

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

      const targetEquipoId = m.equipoId || db.maintenance.find((x) => x.id === id)?.equipoId;
      if (targetEquipoId) {
        const patchPayload: Record<string, any> = {};
        if (m.resultado === "En progreso" || m.resultado === "En proceso") {
          patchPayload['estado'] = 'En mantenimiento';
        } else if (m.resultado === "Completado") {
          patchPayload['estado'] = 'Operativo';
          if (m.proximaFecha) {
            patchPayload['proximoMantenimiento'] = m.proximaFecha;
          }
        }
        if (Object.keys(patchPayload).length > 0) {
          await fetchApi(`/inventario/activos/${targetEquipoId}`, {
            method: "PATCH",
            body: JSON.stringify(patchPayload),
          }).catch((e) => console.warn("Failed to sync equipment status:", e));
        }
      }

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
      const payload = {
        ...u,
        permisos: typeof u.permisos === "object" ? JSON.stringify(u.permisos) : u.permisos,
      };
      await fetchApi("/auth/usuarios", { method: "POST", body: JSON.stringify(payload) });
      await fetchDb();
    },

    updateUser: async (id, u) => {
      const payload = {
        ...u,
        permisos: typeof u.permisos === "object" ? JSON.stringify(u.permisos) : u.permisos,
      };
      await fetchApi(`/auth/usuarios/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      if (user?.id === id) {
        setUser((prev) => (prev ? { ...prev, ...u, permisos: parseUserPermisos({ ...prev, ...u }) } : null));
      }
      await fetchDb();
    },

    deleteUser: async (id) => {
      await fetchApi(`/auth/usuarios/${id}`, { method: "DELETE" });

      await fetchDb();
    },

    addIncident: async (i) => {
      await fetchApi("/mantenimiento/incidencias", {
        method: "POST",
        body: JSON.stringify({
          ...i,
          activo_id: i.activoId,
          fecha_ocurrencia: i.fechaOcurrencia || i.fecha,
          fecha_creacion: i.fechaCreacion || new Date().toISOString(),
          usuario_id: i.usuarioId || user?.id,
        }),
      });

      await fetchDb();
    },

    updateIncident: async (id, i) => {
      await fetchApi(`/mantenimiento/incidencias/${id}`, {
        method: "PUT",
        body: JSON.stringify(i),
      });

      await fetchDb();
    },

    updateAlerta: async (id, a) => {
      await fetchApi(`/alertas/alertas/${id}`, {
        method: "PATCH",
        body: JSON.stringify(a),
      }).catch((e) => console.warn("updateAlerta API fallback:", e));

      setDb((prev) => ({
        ...prev,
        alertas: prev.alertas.map((alt) => (alt.id === id ? { ...alt, ...a } : alt)),
      }));

      await fetchDb().catch(() => {});
    },

    locationName: (id) => {
      const found = db.locations.find((l) => l.id === id);
      if (!found || !found.nombre || found.nombre === "___EMPTY___" || found.nombre === "N/A") {
        return "Sin asignar";
      }
      return found.nombre;
    },

    locationFullName: (id) => {
      const found = db.locations.find((l) => l.id === id);
      if (!found || !found.nombre || found.nombre === "___EMPTY___" || found.nombre === "N/A") {
        return "Sin asignar";
      }
      const parts = [found.sede, found.piso, found.nombre].filter(Boolean);
      return parts.length > 1 ? parts.join(" · ") : found.nombre;
    },

    userName: (id) => {
      if (!id) return "Sin asignar";
      const found = db.users.find((u) => u.id === id);
      if (found && found.nombre) return found.nombre;
      if (typeof id === "string" && !id.includes("-") && id.trim().length > 1) {
        return id;
      }
      const anyBiomedico = db.users.find((u) => u.rol === "biomedico");
      if (anyBiomedico && anyBiomedico.nombre) return anyBiomedico.nombre;
      return "Técnico Biomédico";
    },

    saveMarca: async (marca) => {
      if (marca.id) {
        await fetchApi(`/inventario/marcas/${marca.id}`, {
          method: "PUT",
          body: JSON.stringify(marca),
        });
      } else {
        await fetchApi("/inventario/marcas", { method: "POST", body: JSON.stringify(marca) });
      }

      await fetchDb();
    },

    deleteMarca: async (id) => {
      await fetchApi(`/inventario/marcas/${id}`, { method: "DELETE" });

      await fetchDb();
    },

    addOpcionCatalogo: async (op) => {
      const res = await fetchApi("/inventario/opciones", {
        method: "POST",
        body: JSON.stringify(op),
      });
      await fetchDb();
      return res;
    },

    updateOpcionCatalogo: async (id, op) => {
      const res = await fetchApi(`/inventario/opciones/${id}`, {
        method: "PUT",
        body: JSON.stringify(op),
      });
      await fetchDb();
      return res;
    },

    deleteOpcionCatalogo: async (id) => {
      const res = await fetchApi(`/inventario/opciones/${id}`, {
        method: "DELETE",
      });
      await fetchDb();
      return res;
    },

    categorias: (() => {
      const list = (db.opcionesCatalogo || [])
        .filter((o) => o.tipo?.toLowerCase() === "categoria_equipo" && o.activo)
        .filter((o) => !o.sede || o.sede === "Todas" || !user?.sede || o.sede.toLowerCase() === user.sede.toLowerCase())
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.valor.localeCompare(b.valor))
        .map((o) => o.valor);
      return list.length > 0 ? list : DEFAULT_CATEGORIAS;
    })(),

    estadosEquipo: (() => {
      const list = (db.opcionesCatalogo || [])
        .filter((o) => o.tipo?.toLowerCase() === "estado_equipo" && o.activo)
        .filter((o) => !o.sede || o.sede === "Todas" || !user?.sede || o.sede.toLowerCase() === user.sede.toLowerCase())
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.valor.localeCompare(b.valor))
        .map((o) => o.valor);
      return list.length > 0 ? list : DEFAULT_ESTADOS_EQUIPO;
    })(),

    motivosTraslado: (() => {
      const list = (db.opcionesCatalogo || [])
        .filter((o) => o.tipo?.toLowerCase() === "motivo_traslado" && o.activo)
        .filter((o) => !o.sede || o.sede === "Todas" || !user?.sede || o.sede.toLowerCase() === user.sede.toLowerCase())
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.valor.localeCompare(b.valor))
        .map((o) => o.valor);
      return list.length > 0 ? list : DEFAULT_MOTIVOS_TRASLADO;
    })(),

    tiposMantenimiento: (() => {
      const list = (db.opcionesCatalogo || [])
        .filter((o) => o.tipo?.toLowerCase() === "tipo_mantenimiento" && o.activo)
        .filter((o) => !o.sede || o.sede === "Todas" || !user?.sede || o.sede.toLowerCase() === user.sede.toLowerCase())
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.valor.localeCompare(b.valor))
        .map((o) => o.valor);
      return list.length > 0 ? list : DEFAULT_TIPOS_MANTENIMIENTO;
    })(),

    resultadosMantenimiento: (() => {
      const list = (db.opcionesCatalogo || [])
        .filter((o) => o.tipo?.toLowerCase() === "resultado_mantenimiento" && o.activo)
        .filter((o) => !o.sede || o.sede === "Todas" || !user?.sede || o.sede.toLowerCase() === user.sede.toLowerCase())
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.valor.localeCompare(b.valor))
        .map((o) => o.valor);
      return list.length > 0 ? list : DEFAULT_RESULTADOS_MANTENIMIENTO;
    })(),

    fallasFrecuentes: (() => {
      const list = (db.opcionesCatalogo || [])
        .filter((o) => o.tipo?.toLowerCase() === "falla_frecuente" && o.activo)
        .filter((o) => !o.sede || o.sede === "Todas" || !user?.sede || o.sede.toLowerCase() === user.sede.toLowerCase())
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.valor || "").localeCompare(b.valor || ""))
        .map((o) => {
          let cat = "Todas";
          let mar = "Todas";
          let mod = "Todos";
          let det = o.descripcion || "";
          try {
            const p = JSON.parse(o.descripcion || "");
            if (p && typeof p === "object") {
              cat = p.categoria || "Todas";
              mar = p.marca || "Todas";
              mod = p.modelo || "Todos";
              det = p.detalle || "";
            }
          } catch {}
          return { id: o.id, valor: o.valor || "", categoria: cat, marca: mar, modelo: mod, descripcion: det, detalle: det };
        });
      return list.length > 0 ? list : (DEFAULT_FALLAS_FRECUENTES || []);
    })(),

    equipmentById: (id) => {
      const e = db.equipment.find((x) => x.id === id);
      if (!e) return undefined;
      return {
        ...e,
        codigo: (e as any).codigo_qr || e.codigo,
        ubicacionId: (e as any).ubicacion_id || e.ubicacionId,
        fechaAdquisicion: (e as any).fecha_adquisicion || e.fechaAdquisicion,
        proximoMantenimiento: (e as any).proximo_mantenimiento || e.proximoMantenimiento,
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

export function daysUntil(dateStr: any) {
  if (!dateStr) return 0;
  const str = String(dateStr).trim();
  if (!str) return 0;
  const clean = str.substring(0, 10);
  const parts = clean.split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const target = new Date(y, m, d).getTime();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.round((target - today.getTime()) / 86400000);
    }
  }
  const target = new Date(str).getTime();
  if (isNaN(target)) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

export function formatDate(value: any) {
  if (!value) return "N/A";
  const str = String(value).trim();
  if (!str) return "N/A";
  const clean = str.substring(0, 10);
  const parts = clean.split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dt = new Date(y, m, d);
      return dt.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: any) {
  if (!value) return "N/A";
  const str = String(value).trim();
  if (!str) return "N/A";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return formatDate(str);
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
