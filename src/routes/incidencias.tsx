import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/bioasset/AppShell";
import { useBio } from "@/lib/bioasset/store";

export const Route = createFileRoute("/incidencias")({
  component: IncidenciasPage,
});

function IncidenciasPage() {
  const { db } = useBio();
  
  return (
    <AppShell title="Incidencias" description="Reporte y seguimiento de fallas de equipos">
      <div className="p-4 bg-card text-card-foreground rounded-lg shadow-sm border">
        <p className="text-muted-foreground">El módulo de incidencias se encuentra en desarrollo.</p>
        <p className="mt-2 text-sm">Para reportar una falla, vaya a la ficha del equipo en Inventario y presione 'Reportar falla'.</p>
      </div>
    </AppShell>
  );
}
