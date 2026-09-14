import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, Wrench, XCircle } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { DueBadge, StatusBadge } from "@/components/bioasset/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysUntil, formatDate, useBio } from "@/lib/bioasset/store";
import type { Equipment } from "@/lib/bioasset/types";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas de mantenimiento | BIOASSET" },
      {
        name: "description",
        content: "Mantenimientos vencidos y próximos, equipos en mantenimiento y fuera de servicio.",
      },
      { property: "og:title", content: "Alertas de mantenimiento | BIOASSET" },
      { property: "og:description", content: "Alertas por reglas simples de fecha de mantenimiento." },
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
  const { locationName } = useBio();
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className={`flex size-9 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-4" />
        </div>
        <CardTitle className="text-base">
          {title} <span className="text-muted-foreground">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
          >
            <div>
              <Link
                to="/equipos/$id"
                params={{ id: e.id }}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {e.codigo} — {e.nombre}
              </Link>
              <p className="text-xs text-muted-foreground">{message(e)}</p>
              <p className="text-xs text-muted-foreground">
                Ubicación: {locationName(e.ubicacionId)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={e.estado} />
              <DueBadge days={daysUntil(e.proximoMantenimiento)} />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin alertas en esta categoría.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AlertasPage() {
  const { db } = useBio();
  const eq = db.equipment.filter((e) => e.estado !== "De baja");
  const vencidos = eq.filter((e) => daysUntil(e.proximoMantenimiento) < 0);
  const proximos = eq.filter((e) => {
    const d = daysUntil(e.proximoMantenimiento);
    return d >= 0 && d <= 30;
  });
  const enMantenimiento = eq.filter((e) => e.estado === "En mantenimiento");
  const fueraServicio = eq.filter((e) => e.estado === "Fuera de servicio");

  return (
    <AppShell
      title="Alertas"
      description="Reglas simples basadas en la fecha del próximo mantenimiento"
    >
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
          message={(e) => `El equipo ${e.codigo} se encuentra actualmente en mantenimiento.`}
        />
        <AlertGroup
          title="Equipos fuera de servicio"
          icon={XCircle}
          tone="bg-destructive/15 text-destructive"
          items={fueraServicio}
          message={(e) => `El equipo ${e.codigo} está fuera de servicio.`}
        />
      </div>
    </AppShell>
  );
}
