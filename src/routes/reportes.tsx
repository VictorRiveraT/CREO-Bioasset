import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/bioasset/AppShell";

export const Route = createFileRoute("/reportes")({
  component: ReportesPage,
});

function ReportesPage() {
  return (
    <AppShell title="Reportes" description="Analítica e indicadores de gestión">
      <div className="p-4 bg-card text-card-foreground rounded-lg shadow-sm border">
        <p className="text-muted-foreground">El módulo de reportes se encuentra en desarrollo.</p>
      </div>
    </AppShell>
  );
}
