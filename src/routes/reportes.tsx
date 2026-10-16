import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Activity,
  AlertTriangle,
  Printer,
  Calendar,
  Building2,
  X,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBio, formatDate } from "@/lib/bioasset/store";
import { toast } from "sonner";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes y Analítica | BIOASSET" },
      { name: "description", content: "Analítica, reportes e indicadores de gestión biomédica" },
    ],
  }),
  component: ReportesPage,
});

function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    toast.info("No hay registros que coincidan con los filtros seleccionados.");
    return;
  }
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
        .join(","),
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
  toast.success(`Archivo ${filename} descargado exitosamente`);
}

function printReport(title: string, headers: string[], rows: any[][], filterSummary: string) {
  if (!rows || rows.length === 0) {
    toast.info("No hay registros que coincidan con los filtros seleccionados.");
    return;
  }
  const printWin = window.open("", "_blank", "width=900,height=700");
  if (!printWin) {
    toast.error("Por favor habilita las ventanas emergentes en tu navegador para imprimir.");
    return;
  }

  const rowsHtml = rows
    .map(
      (r) =>
        `<tr>${r.map((cell) => `<td>${cell !== null && cell !== undefined ? cell : "-"}</td>`).join("")}</tr>`,
    )
    .join("");

  const headersHtml = headers.map((h) => `<th>${h}</th>`).join("");

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${title} - BIOASSET</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #F2B705; padding-bottom: 12px; margin-bottom: 16px; }
          .brand { font-size: 20px; font-weight: 800; color: #0b1528; }
          .brand span { color: #F2B705; }
          .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
          .filters { font-size: 11px; color: #475569; margin-bottom: 14px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
          th { background-color: #0b1528; color: #ffffff; text-align: left; padding: 7px 8px; font-weight: 600; text-transform: uppercase; font-size: 9.5px; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Creo<span>+</span> BioAsset</div>
            <div class="sub">Gestión Integral de Equipamiento Biomédico Hospitalario</div>
          </div>
          <div style="text-align: right;">
            <div class="title">${title}</div>
            <div class="sub">Generado el: ${new Date().toLocaleString("es-PE")}</div>
          </div>
        </div>
        <div class="filters"><strong>Parámetros aplicados:</strong> ${filterSummary} · <strong>Total de registros:</strong> ${rows.length}</div>
        <table>
          <thead><tr>${headersHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="footer">CREO+ BIOASSET · Documento de Control Oficial de Ingeniería Clínica</div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}

function ReportesPage() {
  const { db, locationName, userName, equipmentById } = useBio();

  // Filter States
  const [sedeFilter, setSedeFilter] = useState("todas");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

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

  const filterSummary = useMemo(() => {
    const parts = [];
    parts.push(`Sede: ${sedeFilter === "todas" ? "Todas las sedes" : sedeFilter}`);
    if (fechaDesde) parts.push(`Desde: ${fechaDesde}`);
    if (fechaHasta) parts.push(`Hasta: ${fechaHasta}`);
    return parts.join(" · ");
  }, [sedeFilter, fechaDesde, fechaHasta]);

  const hasActiveFilters = Boolean(sedeFilter !== "todas" || fechaDesde || fechaHasta);

  // 1. Filtered Equipment
  const filteredEquipment = useMemo(() => {
    return db.equipment.filter((e) => {
      if (sedeLocations && !sedeLocations.has(e.ubicacionId)) return false;
      if (fechaDesde && e.fechaAdquisicion && e.fechaAdquisicion < fechaDesde) return false;
      if (fechaHasta && e.fechaAdquisicion && e.fechaAdquisicion > fechaHasta) return false;
      return true;
    });
  }, [db.equipment, sedeLocations, fechaDesde, fechaHasta]);

  // 2. Filtered Maintenance
  const filteredMaintenance = useMemo(() => {
    return db.maintenance.filter((m) => {
      const e = equipmentById(m.equipoId);
      if (sedeLocations && e && !sedeLocations.has(e.ubicacionId)) return false;
      const mDate = (m.fecha || "").substring(0, 10);
      if (fechaDesde && mDate && mDate < fechaDesde) return false;
      if (fechaHasta && mDate && mDate > fechaHasta) return false;
      return true;
    });
  }, [db.maintenance, equipmentById, sedeLocations, fechaDesde, fechaHasta]);

  // 3. Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return db.incidents.filter((i) => {
      const e = equipmentById(i.activoId);
      if (sedeLocations && e && !sedeLocations.has(e.ubicacionId)) return false;
      return true;
    });
  }, [db.incidents, equipmentById, sedeLocations]);

  // Inventory Exports
  const exportInventoryCSV = () => {
    const data = filteredEquipment.map((e) => ({
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

  const printInventoryPDF = () => {
    const headers = [
      "Código",
      "Nombre",
      "Categoría",
      "Marca",
      "Modelo",
      "Serie",
      "Ubicación",
      "Estado",
      "Próximo Mant.",
    ];
    const rows = filteredEquipment.map((e) => [
      e.codigo,
      e.nombre,
      e.categoria,
      e.marca,
      e.modelo,
      e.serie,
      locationName(e.ubicacionId),
      e.estado,
      formatDate(e.proximoMantenimiento),
    ]);
    printReport("Reporte de Inventario General", headers, rows, filterSummary);
  };

  // Maintenance Exports
  const exportMaintenanceCSV = () => {
    const data = filteredMaintenance.map((m) => {
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

  const printMaintenancePDF = () => {
    const headers = [
      "Fecha",
      "Código",
      "Equipo",
      "Tipo",
      "Biomédico",
      "Resultado",
      "Observaciones",
    ];
    const rows = filteredMaintenance.map((m) => {
      const e = equipmentById(m.equipoId);
      return [
        formatDate(m.fecha),
        e?.codigo ?? "N/A",
        e?.nombre ?? "N/A",
        m.tipo,
        userName(m.biomedicoId),
        m.resultado,
        m.observaciones || "Sin observaciones",
      ];
    });
    printReport("Reporte de Historial de Mantenimientos", headers, rows, filterSummary);
  };

  // Incident Exports
  const exportIncidentsCSV = () => {
    const data = filteredIncidents.map((i) => {
      const e = equipmentById(i.activoId);
      return {
        "Código Equipo": e?.codigo ?? "N/A",
        "Nombre Equipo": e?.nombre ?? "N/A",
        "Ubicación": e ? locationName(e.ubicacionId) : "N/A",
        "Problema Reportado": i.titulo,
        "Estado": i.estado,
      };
    });
    downloadCSV(data, `reporte_incidencias_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const printIncidentsPDF = () => {
    const headers = ["Código", "Equipo", "Ubicación", "Problema Reportado", "Estado"];
    const rows = filteredIncidents.map((i) => {
      const e = equipmentById(i.activoId);
      return [
        e?.codigo ?? "N/A",
        e?.nombre ?? "N/A",
        e ? locationName(e.ubicacionId) : "N/A",
        i.titulo,
        i.estado,
      ];
    });
    printReport("Reporte de Incidencias y Averías", headers, rows, filterSummary);
  };

  return (
    <AppShell
      title="Reportes y Exportaciones"
      description="Generación y descarga de informes técnicos en formatos CSV y PDF"
    >
      {/* Filters Toolbar */}
      <Card className="shadow-[var(--shadow-card)] mb-6">
        <CardContent className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Building2 className="size-3.5 text-muted-foreground" />
              Sede hospitalaria
            </Label>
            <Select value={sedeFilter} onValueChange={setSedeFilter}>
              <SelectTrigger>
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              Fecha desde
            </Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              Fecha hasta
            </Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSedeFilter("todas");
                  setFechaDesde("");
                  setFechaHasta("");
                }}
                className="w-full h-10 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* INVENTORY REPORT */}
        <Card className="shadow-[var(--shadow-card)] flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <FileSpreadsheet className="size-5 text-yellow-600" />
              </div>
              <CardTitle className="text-lg">Inventario General</CardTitle>
            </div>
            <CardDescription className="pt-1">
              Catálogo completo de equipos biomédicos, ubicaciones actuales y estado operativo.
            </CardDescription>
            <div className="text-xs font-medium text-muted-foreground pt-2">
              Registros filtrados: <span className="font-bold text-foreground">{filteredEquipment.length}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full gap-1.5 text-xs h-9" onClick={exportInventoryCSV}>
                <Download className="size-3.5" />
                CSV (Excel)
              </Button>
              <Button
                variant="outline"
                className="w-full gap-1.5 text-xs h-9"
                onClick={printInventoryPDF}
              >
                <Printer className="size-3.5" />
                PDF / Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* MAINTENANCE REPORT */}
        <Card className="shadow-[var(--shadow-card)] flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="size-5 text-green-600" />
              </div>
              <CardTitle className="text-lg">Historial de Mantenimientos</CardTitle>
            </div>
            <CardDescription className="pt-1">
              Registro cronológico de servicios preventivos, correctivos y biomédicos ejecutados.
            </CardDescription>
            <div className="text-xs font-medium text-muted-foreground pt-2">
              Registros filtrados: <span className="font-bold text-foreground">{filteredMaintenance.length}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="w-full gap-1.5 text-xs h-9"
                onClick={exportMaintenanceCSV}
              >
                <Download className="size-3.5" />
                CSV (Excel)
              </Button>
              <Button
                variant="outline"
                className="w-full gap-1.5 text-xs h-9"
                onClick={printMaintenancePDF}
              >
                <Printer className="size-3.5" />
                PDF / Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* INCIDENTS REPORT */}
        <Card className="shadow-[var(--shadow-card)] flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <CardTitle className="text-lg">Incidencias y Averías</CardTitle>
            </div>
            <CardDescription className="pt-1">
              Registro de fallas técnicas reportadas, averías y trazabilidad de resolución.
            </CardDescription>
            <div className="text-xs font-medium text-muted-foreground pt-2">
              Registros filtrados: <span className="font-bold text-foreground">{filteredIncidents.length}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="destructive"
                className="w-full gap-1.5 text-xs h-9"
                onClick={exportIncidentsCSV}
              >
                <Download className="size-3.5" />
                CSV (Excel)
              </Button>
              <Button
                variant="outline"
                className="w-full gap-1.5 text-xs h-9"
                onClick={printIncidentsPDF}
              >
                <Printer className="size-3.5" />
                PDF / Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
