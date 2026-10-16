import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  Route as RouteIcon,
  Wrench,
  AlertTriangle,
  Download,
  Printer,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { EquipmentDialog, MaintenanceDialog, MovementDialog } from "@/components/bioasset/dialogs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DueBadge, StatusBadge } from "@/components/bioasset/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { daysUntil, formatDate, formatDateTime, useBio } from "@/lib/bioasset/store";
import { fetchApi } from "@/lib/bioasset/apiClient";
import { toast } from "sonner";
import type { Equipment } from "@/lib/bioasset/types";
import { decryptUrlParam } from "@/lib/bioasset/security";

export const Route = createFileRoute("/equipos/$id")({
  head: () => ({
    meta: [
      { title: "Ficha del equipo | BIOASSET" },
      {
        name: "description",
        content:
          "Ficha del equipo biomédico: estado, ubicación actual, historial de movimientos y mantenimientos.",
      },
      { property: "og:title", content: "Ficha del equipo | BIOASSET" },
      { property: "og:description", content: "Detalle e historial del equipo biomédico." },
    ],
  }),
  component: DetalleEquipo,
});

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

function DetalleEquipo() {
  const { id: rawId } = Route.useParams();
  const id = decryptUrlParam(rawId);

  const {
    db,
    locationName,
    userName,
    addIncident,
    canEdit,
  } = useBio();

  const [equipo, setEquipo] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState("");

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle || !equipo) return;
    try {
      await addIncident({ activo_id: equipo.id, titulo: incidentTitle, estado: "Abierta" });
      await fetchApi(`/inventario/activos/${equipo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "Fuera de servicio" }),
      });
      setEquipo((prev) => (prev ? { ...prev, estado: "Fuera de servicio" } : null));
      setIncidentOpen(false);
      setIncidentTitle("");
      toast.success("Falla reportada correctamente.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al reportar la falla.");
    }
  };

  useEffect(() => {
    fetchApi(`/inventario/activos/${id}`)
      .then((res) => {
        if (res.activo) {
          const raw = res.activo;
          setEquipo({
            ...raw,
            codigo: raw.codigo_qr || raw.codigo,
            ubicacionId: raw.ubicacion_id || raw.ubicacionId,
            fechaAdquisicion: raw.fecha_adquisicion || raw.fechaAdquisicion,
            proximoMantenimiento: raw.proximo_mantenimiento || raw.proximoMantenimiento,
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Cargando...">
        <p className="text-muted-foreground py-8 text-center">Cargando datos del equipo...</p>
      </AppShell>
    );
  }

  if (!equipo) {
    return (
      <AppShell title="Equipo no encontrado">
        <p className="text-muted-foreground mb-4">El equipo solicitado no existe o no tiene permisos para verlo.</p>
        <Button asChild variant="outline">
          <Link to="/equipos">Volver a equipos</Link>
        </Button>
      </AppShell>
    );
  }

  const movimientos = db.movements
    .filter((m) => m.equipoId === equipo.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const mantenimientos = db.maintenance
    .filter((m) => m.equipoId === equipo.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const qrUrl = typeof window !== "undefined" ? `${window.location.origin}/qr/${equipo.id}` : "";

  const downloadQR = () => {
    const svgElement = document.getElementById("equipment-qr-code");
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR_${equipo.codigo}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printLabel = () => {
    const printWin = window.open("", "_blank", "width=600,height=500");
    if (!printWin) return;
    const svgElement = document.getElementById("equipment-qr-code");
    const svgHtml = svgElement ? svgElement.outerHTML : "";
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta Patrimonial - ${equipo.codigo}</title>
          <style>
            @page { size: 60mm 45mm; margin: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
            .label-card { border: 2px dashed #333; border-radius: 8px; padding: 10px; width: 220px; text-align: center; background: #fff; }
            .header { font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; }
            .qr-wrap { display: flex; justify-content: center; margin: 6px 0; }
            .code { font-size: 15px; font-weight: 900; color: #b45309; letter-spacing: 0.5px; }
            .name { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 2px; }
            .meta { font-size: 9px; color: #64748b; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header">CREO+ BIOASSET · ACTIVO</div>
            <div class="qr-wrap">${svgHtml}</div>
            <div class="code">${equipo.codigo}</div>
            <div class="name">${equipo.nombre}</div>
            <div class="meta">Serie: ${equipo.serie || "N/A"} · Marca: ${equipo.marca || "N/A"}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <AppShell
      title={
        <>
          <span className="text-amber-600 dark:text-amber-400 font-bold">{equipo.codigo}</span> — {equipo.nombre}
        </>
      }
      description="Ficha completa del equipo biomédico"
      actions={
        <div className="flex flex-wrap gap-2">
          {canEdit("movimientos") && (
            <MovementDialog
              equipoId={equipo.id}
              trigger={
                <Button size="sm" variant="outline">
                  <RouteIcon className="size-4" /> Trasladar
                </Button>
              }
            />
          )}
          {canEdit("mantenimiento") && (
            <MaintenanceDialog
              equipoId={equipo.id}
              trigger={
                <Button size="sm" variant="outline">
                  <Wrench className="size-4" /> Mantenimiento
                </Button>
              }
            />
          )}
          {canEdit("incidencias") && (
            <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <AlertTriangle className="size-4" /> Reportar falla
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleReportIncident}>
                  <DialogHeader>
                    <DialogTitle>Reportar falla</DialogTitle>
                    <DialogDescription>
                      Describa el problema que presenta el equipo. El estado cambiará automáticamente a Fuera de servicio.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Descripción de la avería</Label>
                      <Textarea
                        value={incidentTitle}
                        onChange={(e) => setIncidentTitle(e.target.value)}
                        placeholder="Detalle la falla presentada..."
                        required
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIncidentOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="destructive">
                      Reportar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {canEdit("inventario") && (
            <EquipmentDialog
              equipment={equipo}
              trigger={
                <Button size="sm">
                  <Pencil className="size-4" /> Editar
                </Button>
              }
            />
          )}
        </div>
      }
    >
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit mb-4">
        <Link to="/equipos">
          <ArrowLeft className="size-4 mr-1" /> Volver al inventario
        </Link>
      </Button>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Info general */}
        <Card className="shadow-[var(--shadow-card)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Información general</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-3">
            <Field
              label="Código patrimonial"
              value={<span className="text-amber-600 dark:text-amber-400 font-semibold">{equipo.codigo}</span>}
            />
            <Field label="Nombre" value={equipo.nombre} />
            <Field label="Categoría" value={equipo.categoria} />
            <Field label="Marca" value={equipo.marca} />
            <Field label="Modelo" value={equipo.modelo} />
            <Field label="Número de serie" value={equipo.serie} />
            <Field label="Ubicación actual" value={locationName(equipo.ubicacionId)} />
            <Field label="Estado" value={<StatusBadge status={equipo.estado} />} />
            <Field label="Fecha de adquisición" value={formatDate(equipo.fechaAdquisicion)} />
            <Field
              label="Próximo mantenimiento"
              value={
                <span className="flex items-center gap-2">
                  {formatDate(equipo.proximoMantenimiento)}
                  <DueBadge days={daysUntil(equipo.proximoMantenimiento)} />
                </span>
              }
            />
          </CardContent>
        </Card>

        {/* Identificación QR y Acciones de Etiqueta */}
        <Card className="shadow-[var(--shadow-card)] flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Identificación QR</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-lg border bg-card p-3 shadow-sm">
              <QRCodeSVG id="equipment-qr-code" value={qrUrl || equipo.codigo} size={140} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{equipo.codigo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escanee el código para abrir la ficha pública o consultar historial.
              </p>
            </div>

            {/* Quick Action Buttons for QR */}
            <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={downloadQR}
              >
                <Download className="size-3.5" />
                Descargar PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={printLabel}
              >
                <Printer className="size-3.5" />
                Imprimir Etiqueta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de movimientos */}
      <Card className="shadow-[var(--shadow-card)] mt-4">
        <CardHeader>
          <CardTitle className="text-base">Historial de movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-6 border-l pl-6">
            {movimientos.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[31px] top-1 size-3 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {m.origenId ? locationName(m.origenId) : "Ingreso"}
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                  {locationName(m.destinoId)}
                  <Badge variant="secondary">{m.motivo}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(m.fecha)} · Responsable: {userName(m.usuarioId)}
                </p>
                {m.observaciones && (
                  <p className="mt-1 text-sm text-muted-foreground">{m.observaciones}</p>
                )}
              </li>
            ))}
            {movimientos.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
            )}
          </ol>
        </CardContent>
      </Card>

      {/* Historial de mantenimientos */}
      <Card className="shadow-[var(--shadow-card)] mt-4">
        <CardHeader>
          <CardTitle className="text-base">Historial de mantenimientos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mantenimientos.map((m, i) => (
            <div key={m.id}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={m.tipo === "Correctivo" ? "destructive" : "secondary"}>
                    {m.tipo}
                  </Badge>
                  <span className="text-sm font-medium">{formatDateTime(m.fecha)}</span>
                  <span className="text-xs text-muted-foreground">
                    Biomédico: {userName(m.biomedicoId)} · Resultado: {m.resultado}
                  </span>
                </div>

                {m.archivoBase64 && (
                  <a
                    href={m.archivoBase64}
                    download={`Protocolo_${equipo.codigo}_${(m.fecha || "").substring(0, 10)}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-md"
                  >
                    <FileText className="size-3.5" />
                    📎 Ver Formato Adjunto
                  </a>
                )}
              </div>

              <p className="mt-1 text-sm">{m.descripcion}</p>
              {m.observaciones && (
                <p className="text-sm text-muted-foreground">{m.observaciones}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Próximo mantenimiento programado: {formatDate(m.proximaFecha)}
              </p>
            </div>
          ))}
          {mantenimientos.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin mantenimientos registrados.</p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
