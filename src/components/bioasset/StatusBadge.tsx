import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EquipmentStatus } from "@/lib/bioasset/types";

const MAP: Record<EquipmentStatus, string> = {
  Operativo: "bg-success/15 text-success border-success/30",
  "En mantenimiento": "bg-warning/20 text-warning-foreground border-warning/40",
  "Fuera de servicio": "bg-destructive/15 text-destructive border-destructive/30",
  "De baja": "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", MAP[status])}>
      {status}
    </Badge>
  );
}

export function DueBadge({ days }: { days: number }) {
  if (days < 0)
    return (
      <Badge variant="outline" className="border-destructive/30 bg-destructive/15 text-destructive">
        Vencido ({Math.abs(days)} d)
      </Badge>
    );
  if (days <= 30)
    return (
      <Badge variant="outline" className="border-warning/40 bg-warning/20 text-warning-foreground">
        En {days} d
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-success/30 bg-success/15 text-success">
      En {days} d
    </Badge>
  );
}
