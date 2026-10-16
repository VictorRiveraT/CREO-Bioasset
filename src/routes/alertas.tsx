import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Wrench, XCircle, Building2, X } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { DueBadge, StatusBadge } from "@/components/bioasset/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { daysUntil, formatDate, useBio } from "@/lib/bioasset/store";
import { MaintenanceDialog } from "@/components/bioasset/dialogs";
import type { Equipment } from "@/lib/bioasset/types";
import { encryptUrlParam } from "@/lib/bioasset/security";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas de mantenimiento | BIOASSET" },
      {
        name: "description",
        content:
          "Mantenimientos vencidos y próximos, equipos en mantenimiento y fuera de servicio.",
      },
      { property: "og:title", content: "Alertas de mantenimiento | BIOASSET" },
      {
        property: "og:description",
        content: "Alertas por reglas simples de fecha de mantenimiento.",
      },
    ],
  }),
  component: AlertasPage,
});

function AlertGroup({
  title,
  icon: Icon,
  tone,
  items,
  message,
}: {
  title: string;
  icon: typeof Clock;
  tone: string;
  items: Equipment[];
  message: (e: Equipment) => string;
}) {
  const { locationName, canEdit } = useBio();

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
        <div className={`flex size-9 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-4" />
        </div>
        <CardTitle className="text-base flex items-center justify-between w-full">
          <span>{title}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((e) => (
          <div
            key={e.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
          >
            <div className="space-y-0.5">
              <Link
                to="/equipos/$id"
                params={{ id: encryptUrlParam(e.id) }}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {e.codigo} — {e.nombre}
              </Link>
              <p className="text-xs text-muted-foreground">{message(e)}</p>
              <p className="text-xs text-muted-foreground">
                Ubicación: <span className="font-medium text-foreground">{locationName(e.ubicacionId)}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <StatusBadge status={e.estado} />
              <DueBadge days={daysUntil(e.proximoMantenimiento)} />
              {canEdit("mantenimiento") && e.id !== "ALERTA" && (
                <MaintenanceDialog
                  equipoId={e.id}
                  trigger={
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                      <Wrench className="size-3 text-primary" />
                      Atender
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin alertas en esta categoría.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AlertasPage() {
  const { db } = useBio();
  const [sedeFilter, setSedeFilter] = useState("todas");

  const sedes = useMemo(() => {
    const s = new Set<string>();
    db.locations.forEach((l) => {
      if (l.sede && l.sede !== "___EMPTY___") s.add(l.sede);
    });
    return Array.from(s).sort();
  }, [db.locations]);

  const sedeLocations = useMemo(() => {
    if (sedeFilter === "todas") return null;
    return new Set(db.locations.filter((l) => l.sede === sedeFilter).map((l) => l.id));
  }, [db.locations, sedeFilter]);

  const eq = useMemo(() => {
    return db.equipment
      .filter((e) => e.estado !== "De baja")
      .filter((e) => !sedeLocations || sedeLocations.has(e.ubicacionId));
  }, [db.equipment, sedeLocations]);

  const vencidos = useMemo(() => eq.filter((e) => daysUntil(e.proximoMantenimiento) < 0), [eq]);
  const proximos = useMemo(
    () =>
      eq.filter((e) => {
        const d = daysUntil(e.proximoMantenimiento);
        return d >= 0 && d <= 30;
      }),
    [eq],
  );
  const enMantenimiento = useMemo(() => eq.filter((e) => e.estado === "En mantenimiento"), [eq]);
  const fueraServicio = useMemo(() => eq.filter((e) => e.estado === "Fuera de servicio"), [eq]);

  const totalAlertas = vencidos.length + proximos.length + fueraServicio.length;

  return (
    <AppShell
      title="Centro de Alertas"
      description={`${totalAlertas} alertas de mantenimiento y operatividad activas`}
    >
      {/* Sede Filter Bar */}
      <Card className="shadow-[var(--shadow-card)] mb-6">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="size-4 text-muted-foreground" />
            <span>Filtrar alertas por sede:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={sedeFilter} onValueChange={setSedeFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las sedes</SelectItem>
                {sedes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {sedeFilter !== "todas" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSedeFilter("todas")}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="mr-1 size-3.5" /> Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <AlertGroup
          title="Mantenimientos vencidos"
          icon={AlertTriangle}
          tone="bg-destructive/15 text-destructive"
          items={vencidos}
          message={(e) =>
            `El equipo ${e.codigo} tiene mantenimiento vencido desde el ${formatDate(e.proximoMantenimiento)}.`
          }
        />

        <AlertGroup
          title="Mantenimientos próximos (30 días)"
          icon={Clock}
          tone="bg-warning/20 text-warning-foreground"
          items={proximos}
          message={(e) =>
            `El equipo ${e.codigo} tiene mantenimiento programado para dentro de ${daysUntil(e.proximoMantenimiento)} días.`
          }
        />

        <AlertGroup
          title="Equipos en mantenimiento"
          icon={Wrench}
          tone="bg-info/15 text-info"
          items={enMantenimiento}
          message={(e) => `El equipo ${e.codigo} se encuentra actualmente en proceso de mantenimiento.`}
        />

        <AlertGroup
          title="Equipos fuera de servicio"
          icon={XCircle}
          tone="bg-destructive/15 text-destructive"
          items={fueraServicio}
          message={(e) => `El equipo ${e.codigo} presenta falla técnica y está inoperativo.`}
        />

        <AlertGroup
          title="Notificaciones Críticas del Sistema"
          icon={AlertTriangle}
          tone="bg-purple-500/20 text-purple-600 dark:text-purple-400"
          items={
            db.alertas.map((a: any) => {
              const eqFound = db.equipment.find((x) => x.id === a.activoId);
              return {
                id: eqFound ? eqFound.id : (a.activoId || a.id),
                codigo: eqFound ? eqFound.codigo : "ALERTA",
                nombre: eqFound ? `${eqFound.nombre} — ${a.mensaje || a.tipo}` : (a.mensaje || a.tipo),
                estado: eqFound ? eqFound.estado : (a.estado || "Activa"),
                ubicacionId: eqFound ? eqFound.ubicacionId : "",
                proximoMantenimiento: eqFound ? eqFound.proximoMantenimiento : new Date().toISOString().split("T")[0],
              };
            }) as any
          }
          message={() => `Evento crítico del bus de mensajería (RabbitMQ).`}
        />
      </div>
    </AppShell>
  );
}
