import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  AlertTriangle,
  Wrench,
  AlertCircle,
  Check,
  ExternalLink,
  Clock,
  CheckCheck,
} from "lucide-react";
import { useBio, daysUntil } from "@/lib/bioasset/store";
import { encryptUrlParam } from "@/lib/bioasset/security";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface NotificationItem {
  id: string;
  equipoId?: string;
  equipoCodigo?: string;
  equipoNombre?: string;
  titulo: string;
  mensaje: string;
  tipo: "vencido" | "proximo" | "incidencia" | "alerta";
  severidad: "alta" | "media" | "baja";
  fechaTexto: string;
  leido: boolean;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { db, user } = useBio();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  // Helper para verificar si un equipo pertenece a la sede autorizada del usuario
  const isEquipmentInUserSede = (eq: any) => {
    if (!user) return true;
    const userSede = user.sede || "";
    if (!userSede || userSede.toLowerCase().includes("todas")) return true;

    const loc = db.locations.find((l) => l.id === eq.ubicacionId);
    const eqSede = loc?.sede || "Sede Principal";

    const matchSede = userSede.toLowerCase().includes(eqSede.toLowerCase());
    const matchSedeTemp = user.sedeTemporal && user.sedeTemporal.toLowerCase().includes(eqSede.toLowerCase());

    return matchSede || matchSedeTemp;
  };

  // Construir lista dinámica filtrada estrictamente por la SEDE del usuario
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Mantenimientos Vencidos o Próximos
    db.equipment.forEach((e) => {
      if (!e.activo) return;
      if (!isEquipmentInUserSede(e)) return;

      const days = daysUntil(e.proximoMantenimiento);

      if (days < 0) {
        list.push({
          id: `maint-overdue-${e.id}`,
          equipoId: e.id,
          equipoCodigo: e.codigo,
          equipoNombre: e.nombre,
          titulo: "Mantenimiento Vencido",
          mensaje: `${e.codigo} — ${e.nombre}`,
          tipo: "vencido",
          severidad: "alta",
          fechaTexto: `Vencido hace ${Math.abs(days)} día(s)`,
          leido: readIds.has(`maint-overdue-${e.id}`),
        });
      } else if (days <= 30) {
        list.push({
          id: `maint-due-${e.id}`,
          equipoId: e.id,
          equipoCodigo: e.codigo,
          equipoNombre: e.nombre,
          titulo: "Mantenimiento Próximo",
          mensaje: `${e.codigo} — ${e.nombre}`,
          tipo: "proximo",
          severidad: days <= 7 ? "alta" : "media",
          fechaTexto: `Vence en ${days} día(s)`,
          leido: readIds.has(`maint-due-${e.id}`),
        });
      }
    });

    // 2. Incidencias Abiertas o En Revisión
    db.incidents.forEach((inc) => {
      if (inc.estado === "Cerrada") return;
      const eq = db.equipment.find((x) => x.id === inc.activoId);
      if (eq && !isEquipmentInUserSede(eq)) return;

      list.push({
        id: `inc-${inc.id}`,
        equipoId: inc.activoId,
        equipoCodigo: eq?.codigo || "N/A",
        equipoNombre: eq?.nombre || "Equipo biomédico",
        titulo: `Incidencia ${inc.estado}`,
        mensaje: inc.titulo,
        tipo: "incidencia",
        severidad: "alta",
        fechaTexto: eq ? `${eq.codigo} — ${eq.nombre}` : "Reporte de falla",
        leido: readIds.has(`inc-${inc.id}`),
      });
    });

    // 3. Alertas registradas en BD
    (db.alertas || []).forEach((alt) => {
      if (alt.estado === "Atendida" || alt.estado === "Resuelta") return;
      const eq = db.equipment.find((x) => x.id === alt.activoId);
      if (eq && !isEquipmentInUserSede(eq)) return;

      list.push({
        id: `alt-${alt.id}`,
        equipoId: alt.activoId,
        equipoCodigo: eq?.codigo,
        equipoNombre: eq?.nombre,
        titulo: alt.tipo || "Alerta de Equipo",
        mensaje: alt.mensaje,
        tipo: "alerta",
        severidad: (alt.severidad?.toLowerCase() as any) === "alta" ? "alta" : "media",
        fechaTexto: eq ? `${eq.codigo}` : "Alerta de sistema",
        leido: readIds.has(`alt-${alt.id}`),
      });
    });

    return list.sort((a, b) => {
      if (a.leido !== b.leido) return a.leido ? 1 : -1;
      if (a.severidad === "alta" && b.severidad !== "alta") return -1;
      if (a.severidad !== "alta" && b.severidad === "alta") return 1;
      return 0;
    });
  }, [db, readIds, user]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.leido).length;
  }, [notifications]);

  const hasHighSeverity = useMemo(() => {
    return notifications.some((n) => !n.leido && n.severidad === "alta");
  }, [notifications]);

  // Toast al iniciar sesión (1 sola vez por sesión activa de usuario)
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const sessionKey = `bioasset_toast_shown_${user.id}`;
    const alreadyShownInSession = sessionStorage.getItem(sessionKey);

    if (!alreadyShownInSession) {
      const highCount = notifications.filter((n) => n.severidad === "alta" && !n.leido).length;
      if (highCount > 0) {
        toast.warning(`Atención ${user.nombre}: Tienes ${highCount} alerta(s) crítica(s) en tu sede`, {
          description: "Revisa la campanita para atender los mantenimientos o incidencias pendientes.",
          action: {
            label: "Ver Alertas",
            onClick: () => {
              navigate({ to: "/alertas" });
            },
          },
        });
      } else if (unreadCount > 0) {
        toast.info(`Bienvenido ${user.nombre}: Tienes ${unreadCount} notificación(es) en tu sede`, {
          description: "Haz clic en la campanita para ver el resumen de equipos.",
          action: {
            label: "Ver Alertas",
            onClick: () => {
              navigate({ to: "/alertas" });
            },
          },
        });
      } else {
        toast.success(`Bienvenido ${user.nombre}`, {
          description: "Todos los equipos de tu sede operan dentro de los parámetros esperados.",
        });
      }
      sessionStorage.setItem(sessionKey, "true");
    }
  }, [unreadCount, notifications, user, navigate]);

  const handleNotificationClick = (item: NotificationItem) => {
    setReadIds((prev) => new Set([...prev, item.id]));
    setOpen(false);

    if (item.equipoId) {
      const encryptedId = encryptUrlParam(item.equipoId);
      navigate({ to: "/equipos/$id", params: { id: encryptedId } });
    } else {
      navigate({ to: "/alertas" });
    }
  };

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(new Set(allIds));
    toast.success("Notificaciones marcadas como leídas");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-foreground hover:bg-accent focus-visible:ring-1 shrink-0"
          aria-label="Ver notificaciones de mi sede"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm whitespace-nowrap ${
                hasHighSeverity ? "animate-pulse" : ""
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-[400px] p-0 shadow-xl rounded-xl border border-border bg-card text-card-foreground overflow-hidden"
      >
        {/* Header pulido y ordenado */}
        <div className="border-b bg-muted/40 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="size-4 text-primary shrink-0" />
              <h4 className="text-sm font-bold text-foreground truncate">Notificaciones de mi Sede</h4>
            </div>
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="shrink-0 whitespace-nowrap px-2.5 py-0.5 text-[11px] font-bold rounded-full shadow-xs"
              >
                {unreadCount} nuevas
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer"
              >
                <CheckCheck className="size-3 text-emerald-600" />
                Marcar todas como leídas
              </button>
            </div>
          )}
        </div>

        {/* Lista de Alertas */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Check className="size-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">¡Sin alertas pendientes!</p>
              <p className="text-xs">Todos los equipos de tu sede están al día.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-accent/60 ${
                  !item.leido ? "bg-muted/30 font-medium" : "opacity-75"
                }`}
              >
                {/* Icono por tipo */}
                <div className="mt-0.5 shrink-0">
                  {item.tipo === "vencido" && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60 text-red-600">
                      <AlertTriangle className="size-4" />
                    </div>
                  )}
                  {item.tipo === "proximo" && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                      <Clock className="size-4" />
                    </div>
                  )}
                  {item.tipo === "incidencia" && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600">
                      <Wrench className="size-4" />
                    </div>
                  )}
                  {item.tipo === "alerta" && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600">
                      <AlertCircle className="size-4" />
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground truncate">{item.titulo}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {item.fechaTexto}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 mt-0.5 truncate">{item.mensaje}</p>
                  {item.equipoCodigo && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary font-medium group-hover:underline">
                      Ir al equipo <ExternalLink className="size-3" />
                    </span>
                  )}
                </div>

                {/* Indicador no leído */}
                {!item.leido && (
                  <span className="size-2 rounded-full bg-red-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-2.5 bg-muted/20 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary font-semibold hover:bg-primary/10"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/alertas" });
            }}
          >
            Ver todas las alertas y mantenimientos
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
