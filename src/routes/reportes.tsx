import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, Activity, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBio, formatDate } from "@/lib/bioasset/store";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes | BIOASSET" },
      { name: "description", content: "Analítica e indicadores de gestión" },
    ],
  }),
  component: ReportesPage,
});

function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
          return `"${val}"`;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function ReportesPage() {
  const { db, locationName, userName, equipmentById } = useBio();

  const exportInventory = () => {
    const data = db.equipment.map((e) => ({
      "Código Patrimonial": e.codigo,
      "Nombre del Equipo": e.nombre,
      "Categoría": e.categoria,
      "Marca": e.marca,
      "Modelo": e.modelo,
      "Número de Serie": e.serie,
      "Ubicación Actual": locationName(e.ubicacionId),
      "Estado": e.estado,
      "Fecha Adquisición": formatDate(e.fechaAdquisicion),
      "Próximo Mantenimiento": formatDate(e.proximoMantenimiento),
    }));
    downloadCSV(data, `reporte_inventario_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportMaintenance = () => {
    const data = db.maintenance.map((m) => {
      const e = equipmentById(m.equipoId);
      return {
        "Fecha": formatDate(m.fecha),
        "Código Equipo": e?.codigo ?? "N/A",
        "Nombre Equipo": e?.nombre ?? "N/A",
        "Tipo": m.tipo,
        "Biomédico Responsable": userName(m.biomedicoId),
        "Resultado": m.resultado,
        "Observaciones": m.observaciones || "Sin observaciones",
      };
    });
    downloadCSV(data, `reporte_mantenimientos_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportIncidents = () => {
    const data = db.incidents.map((i) => {
      const e = equipmentById(i.activoId);
      return {
        "Código Equipo": e?.codigo ?? "N/A",
        "Nombre Equipo": e?.nombre ?? "N/A",
        "Problema Reportado": i.titulo,
        "Estado": i.estado,
      };
    });
    downloadCSV(data, `reporte_incidencias_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <AppShell title="Reportes" description="Analítica e indicadores de gestión">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* INVENTORY REPORT */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <FileSpreadsheet className="size-5 text-yellow-600" />
              </div>
              <CardTitle className="text-lg">Inventario General</CardTitle>
            </div>
            <CardDescription>
              Catálogo completo de equipos biomédicos, ubicaciones y estados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2" onClick={exportInventory}>
              <Download className="size-4" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        {/* MAINTENANCE REPORT */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="size-5 text-green-600" />
              </div>
              <CardTitle className="text-lg">Historial de Mantenimientos</CardTitle>
            </div>
            <CardDescription>
              Registro de mantenimientos preventivos y correctivos ejecutados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2" variant="secondary" onClick={exportMaintenance}>
              <Download className="size-4" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        {/* INCIDENTS REPORT */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <CardTitle className="text-lg">Incidencias y Fallas</CardTitle>
            </div>
            <CardDescription>
              Listado de averías reportadas y su estado actual de resolución.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2" variant="outline" onClick={exportIncidents}>
              <Download className="size-4" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
