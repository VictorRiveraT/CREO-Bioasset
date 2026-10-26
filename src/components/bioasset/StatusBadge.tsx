import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EquipmentStatus } from "@/lib/bioasset/types";

const MAP: Record<string, string> = {
  Operativo: "bg-success/15 text-success border-success/30",
  "En mantenimiento": "bg-yellow-500/20 text-yellow-800 dark:bg-yellow-500 dark:text-white dark:border-yellow-400 font-semibold shadow-xs",
  "Fuera de servicio": "bg-destructive/15 text-destructive border-destructive/30",
  Inoperativo: "bg-destructive/15 text-destructive border-destructive/30",
  "De baja": "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: EquipmentStatus | string }) {
  const cls = MAP[status] || "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("font-medium whitespace-nowrap shrink-0", cls)}>
      {status}
    </Badge>
  );
}

export function DueBadge({ days, status }: { days: number; status?: string }) {
  if (status === "De baja") {
    return (
      <Badge
        variant="outline"
        className="border-muted bg-muted/40 text-muted-foreground whitespace-nowrap shrink-0"
      >
        No aplica (Equipo de baja)
      </Badge>
    );
  }
  if (status === "En mantenimiento") {
    return (
      <Badge
        variant="outline"
        className="border-yellow-500/50 bg-yellow-500/20 text-yellow-800 dark:bg-yellow-500 dark:text-white dark:border-yellow-400 whitespace-nowrap shrink-0 font-semibold shadow-xs"
      >
        En atención {days < 0 ? `(Venció hace ${Math.abs(days)} d)` : ""}
      </Badge>
    );
  }
  if (days < 0)
    return (
      <Badge
        variant="outline"
        className="border-destructive/30 bg-destructive/15 text-destructive whitespace-nowrap shrink-0 font-semibold"
      >
        Vencido ({Math.abs(days)} d)
      </Badge>
    );
  if (days <= 30)
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-200 whitespace-nowrap shrink-0 font-semibold"
      >
        En {days} d
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="border-success/30 bg-success/15 text-success whitespace-nowrap shrink-0 font-medium"
    >
      En {days} d
    </Badge>
  );
}
