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
  Camera,
  Eye,
  X,
  User,
  CheckCircle2,
  Clock,
  Calendar,
  Receipt,
  Laptop,
  HeartPulse,
} from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { EquipmentDialog, MaintenanceDialog, MovementDialog } from "@/components/bioasset/dialogs";
import { ImagePreviewDialog } from "@/components/bioasset/image-preview-dialog";
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

  const { db, locationName, userName, addIncident, addMovement, updateAlerta, user, canEdit } = useBio();

  const [equipo, setEquipo] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState("");
  const getInitialDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };
  const [fechaOcurrencia, setFechaOcurrencia] = useState(getInitialDateTime);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle || !equipo) return;
    try {
      await addIncident({
        activoId: equipo.id,
        activo_id: equipo.id,
        titulo: incidentTitle,
        estado: "Abierta",
        fechaOcurrencia,
        fecha: fechaOcurrencia,
      });
      await fetchApi(`/inventario/activos/${equipo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "Fuera de servicio" }),
      });

      // QA-048 y QA-059: Registrar movimiento de trazabilidad con responsable, fecha y motivo
      await addMovement({
        equipoId: equipo.id,
        origenId: equipo.ubicacionId,
        destinoId: equipo.ubicacionId,
        motivo: `Cambio a 'Fuera de servicio' por reporte de avería (${fechaOcurrencia}): ${incidentTitle}`,
        usuarioId: user?.id || "",
        fecha: new Date().toISOString(),
      }).catch((e) => console.warn("Traceability movement error:", e));

      setEquipo((prev) => (prev ? { ...prev, estado: "Fuera de servicio" } : null));
      setIncidentOpen(false);
      setIncidentTitle("");
      setFechaOcurrencia(getInitialDateTime());
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
        <p className="text-muted-foreground mb-4">
          El equipo solicitado no existe o no tiene permisos para verlo.
        </p>
        <Button asChild variant="outline">
          <Link to="/equipos">Volver a equipos</Link>
        </Button>
      </AppShell>
    );
  }

  const movimientos = (db.movements || [])
    .filter((m) => m && m.equipoId === equipo.id)
    .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

  const mantenimientos = (db.maintenance || [])
    .filter((m) => m && m.equipoId === equipo.id)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  const completedMaint = mantenimientos
    .filter((m) => m.resultado === "Completado" && m.proximaFecha)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))[0];

  const canonicalNextDate = completedMaint?.proximaFecha || equipo.proximoMantenimiento;

  const orderInProgress = mantenimientos.find((m) => m.resultado === "En progreso");

  const equipmentAlerts = useMemo(() => {
    return (db.alertas || []).filter(
      (a) => a && (a.activoId === equipo.id || (a as any).activo_id === equipo.id)
    );
  }, [db.alertas, equipo.id]);

  const activeAlert = equipmentAlerts.find(
    (a) => a.estado !== "Atendida" && a.estado !== "Resuelta",
  );

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
      title={`${equipo.codigo} — ${equipo.nombre}`}
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
                      Describa el problema que presenta el equipo. El estado cambiará
                      automáticamente a Fuera de servicio.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="eq-falla-fecha">Fecha y hora de ocurrencia (QA-059)</Label>
                      <Input
                        id="eq-falla-fecha"
                        type="datetime-local"
                        value={fechaOcurrencia}
                        onChange={(e) => setFechaOcurrencia(e.target.value)}
                        required
                      />
                    </div>
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

      {equipmentAlerts.length > 0 && (
        <Card className="mb-4 border-purple-500/40 bg-purple-500/5 shadow-xs">
          <CardHeader className="py-2.5 px-4 border-b border-purple-500/20 bg-purple-500/10 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-sm font-bold text-purple-900 dark:text-purple-200">
                Eventos Críticos de Telemetría (Bus RabbitMQ - QA-068)
              </CardTitle>
            </div>
            <Badge variant="outline" className="border-purple-500/40 text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">
              {equipmentAlerts.length} evento(s)
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {equipmentAlerts.map((alt) => (
              <div
                key={alt.id}
                className="rounded-lg border bg-card p-3 shadow-2xs space-y-2 hover:border-purple-500/40 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      ID #{alt.id?.substring(0, 8)}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {alt.codigoError ? `${alt.codigoError} · ` : ""}{alt.tipo || "Alerta de Telemetría"}
                    </span>
                  </div>
                  <Badge
                    variant={alt.estado === "Atendida" || alt.estado === "Resuelta" ? "secondary" : "destructive"}
                    className="text-[10px] uppercase font-semibold"
                  >
                    {alt.estado || "Activa"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{alt.mensaje}</p>
                <div className="flex flex-wrap items-center justify-between pt-2 border-t text-[11px] text-muted-foreground gap-2">
                  <span>
                    Cola: <strong className="font-mono text-foreground">{alt.cola || "cola.alertas.criticas"}</strong> · Servicio: <strong className="text-foreground">{alt.servicio || "telemetria-biomedica"}</strong>
                  </span>
                  <span>
                    Fecha: {formatDateTime(alt.fechaCreacion || alt.fecha || new Date().toISOString())}
                  </span>
                  {alt.estado !== "Atendida" && alt.estado !== "Resuelta" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                      onClick={async () => {
                        await updateAlerta(alt.id, { estado: "Atendida" });
                        toast.success("Evento de telemetría marcado como atendido.");
                      }}
                    >
                      Marcar atendida
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Info general */}
        <Card className="shadow-[var(--shadow-card)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Información general</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-3">
            <Field
              label="Código patrimonial"
              value={
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {equipo.codigo}
                </span>
              }
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
                <div className="flex flex-col gap-1 items-start">
                  <span className="flex items-center gap-2">
                    {formatDate(canonicalNextDate)}
                    <DueBadge days={daysUntil(canonicalNextDate)} status={equipo.estado} />
                  </span>
                  {completedMaint ? (
                    <span className="text-[11px] text-muted-foreground">
                      Fecha oficial según orden #{completedMaint.id?.substring(0, 8)} concluida el {formatDate(completedMaint.fecha)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      Fecha inicial configurada en inventario
                    </span>
                  )}
                  {orderInProgress && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <Clock className="size-3 shrink-0" /> Orden en progreso (la fecha oficial se consolidará al completar la orden)
                    </span>
                  )}
                </div>
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
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {equipo.codigo}
              </p>
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
            {movimientos.map((m) => {
              const isAuditOrEdit =
                (m.motivo || "").toLowerCase().includes("edición") ||
                (m.motivo || "").toLowerCase().includes("actualización");

              return (
                <li key={m.id} className="relative">
                  <span
                    className={`absolute -left-[31px] top-1 size-3 rounded-full ring-4 ring-background ${
                      isAuditOrEdit ? "bg-amber-500" : "bg-primary"
                    }`}
                  />
                  {isAuditOrEdit ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                      >
                        <FileText className="size-3 mr-1" /> {m.motivo}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-normal">Ubicación:</span>
                      <span className="font-semibold">{locationName(m.destinoId)}</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className="text-xs text-muted-foreground font-normal">Origen:</span>
                      <span className="font-semibold">{m.origenId ? locationName(m.origenId) : "Alta inicial"}</span>
                      <ArrowRight className="size-3.5 text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground font-normal">Destino:</span>
                      <span className="font-semibold text-primary">{locationName(m.destinoId)}</span>
                      <Badge variant="secondary">{m.motivo}</Badge>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(m.fecha)} · Responsable: {userName(m.usuarioId)}
                  </p>
                  {m.observaciones && (
                    isAuditOrEdit ? (
                      <div className="mt-1.5 rounded-md bg-muted/60 p-2.5 text-xs text-foreground/90 border font-mono whitespace-pre-wrap">
                        {m.observaciones}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{m.observaciones}</p>
                    )
                  )}
                </li>
              );
            })}
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
                  <Badge
                    variant={m.tipo === "Correctivo" ? "destructive" : "secondary"}
                    className="font-semibold text-xs px-2.5 py-0.5"
                  >
                    {m.tipo}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {formatDateTime(m.fecha)}
                  </span>

                  {/* Biomédico resaltado */}
                  <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-secondary/80 border border-border/70 text-secondary-foreground shadow-2xs">
                    <User className="size-3 text-primary shrink-0" />
                    <span className="text-muted-foreground text-[11px]">Biomédico:</span>
                    <strong className="font-semibold text-foreground">{userName(m.biomedicoId)}</strong>
                  </div>

                  {/* Costo / Cotización si aplica */}
                  {(() => {
                    let cot: any = null;
                    try {
                      const p = JSON.parse(m.observaciones || "");
                      if (p && p.cotizacion) cot = p.cotizacion;
                    } catch {}
                    const costVal = cot?.totalGeneral || m.costo;
                    if (costVal === undefined || costVal === null || isNaN(Number(costVal))) return null;
                    const num = Number(costVal);
                    if (num <= 0) return null;
                    return (
                      <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold shadow-2xs">
                        <Receipt className="size-3 text-amber-600 shrink-0" />
                        <span>S/. {num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        {cot?.estadoCotizacion && (
                          <span className="text-[10px] text-muted-foreground">({cot.estadoCotizacion})</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Resultado resaltado con Badge visual */}
                  {m.resultado === "Completado" ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1 text-xs">
                      <CheckCircle2 className="size-3 shrink-0" />
                      Completado
                    </Badge>
                  ) : m.resultado === "En progreso" ? (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold gap-1 text-xs">
                      <Clock className="size-3 shrink-0" />
                      En progreso
                    </Badge>
                  ) : m.resultado === "De baja" ? (
                    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 font-semibold gap-1 text-xs">
                      <AlertTriangle className="size-3 shrink-0" />
                      De baja
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-semibold text-xs">
                      {m.resultado}
                    </Badge>
                  )}

                  {m.id === completedMaint?.id && (
                    <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                      Vigente en inventario
                    </Badge>
                  )}

                  {m.incidenciaId && (
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      Atiende incidencia #{m.incidenciaId.slice(0, 8)}
                    </Badge>
                  )}
                </div>

                {m.archivoBase64 && (
                  (() => {
                    let ext = "pdf";
                    const lower = (m.archivoBase64 || "").toLowerCase();
                    if (lower.startsWith("data:image/png") || lower.includes(".png")) ext = "png";
                    else if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg") || lower.includes(".jpg") || lower.includes(".jpeg")) ext = "jpg";
                    else if (lower.startsWith("data:application/vnd.openxmlformats") || lower.includes(".docx")) ext = "docx";
                    else if (lower.startsWith("data:application/zip") || lower.includes(".zip")) ext = "zip";
                    else if (lower.startsWith("data:application/pdf") || lower.includes(".pdf")) ext = "pdf";
                    else if (lower.startsWith("data:application/octet-stream") || lower.includes(".bin")) ext = "bin";

                    return (
                      <a
                        href={m.archivoBase64}
                        download={`Protocolo_${equipo.codigo}_${(m.fecha || "").substring(0, 10)}.${ext}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-md"
                      >
                        <FileText className="size-3.5" />
                        📎 Ver Formato Adjunto ({ext.toUpperCase()})
                      </a>
                    );
                  })()
                )}
              </div>

              {(() => {
                let parsed: any = null;
                let fotos: string[] = [];
                try {
                  parsed = JSON.parse(m.observaciones || "");
                  if (parsed && Array.isArray(parsed.fotos)) {
                    fotos = parsed.fotos.filter((f: any) => typeof f === "string" && f.length > 0);
                  }
                } catch {
                  parsed = null;
                }

                const isImageEvidence = (str?: string): boolean => {
                  if (!str) return false;
                  return str.startsWith("data:image/") || /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(str);
                };

                if (fotos.length === 0 && isImageEvidence(m.archivoBase64)) {
                  fotos = [m.archivoBase64];
                }

                fotos = fotos.filter(isImageEvidence);

                const hasObservations =
                  parsed &&
                  typeof parsed === "object" &&
                  Boolean(
                    (parsed.perturbacion && parsed.perturbacion.trim()) ||
                    (parsed.causas && parsed.causas.trim()) ||
                    (parsed.acciones && parsed.acciones.trim()) ||
                    (parsed.recomendaciones && parsed.recomendaciones.trim())
                  );

                const hasPlainObservaciones = !parsed && Boolean(m.observaciones && m.observaciones.trim());

                if (!hasObservations && !hasPlainObservaciones && fotos.length === 0) {
                  return null;
                }

                return (
                  <div className="mt-2 space-y-2">
                    {hasObservations ? (
                      <div className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-xs border">
                        {parsed.perturbacion && parsed.perturbacion.trim() && (
                          <div>
                            <span className="font-semibold text-foreground">Falla / Perturbación: </span>
                            <span className="text-muted-foreground">{parsed.perturbacion}</span>
                          </div>
                        )}
                        {parsed.causas && parsed.causas.trim() && (
                          <div>
                            <span className="font-semibold text-foreground">Causas: </span>
                            <span className="text-muted-foreground">{parsed.causas}</span>
                          </div>
                        )}
                        {parsed.acciones && parsed.acciones.trim() && (
                          <div>
                            <span className="font-semibold text-foreground">Acciones tomadas: </span>
                            <span className="text-muted-foreground">{parsed.acciones}</span>
                          </div>
                        )}
                        {parsed.recomendaciones && parsed.recomendaciones.trim() && (
                          <div>
                            <span className="font-semibold text-foreground">Recomendaciones: </span>
                            <span className="text-muted-foreground">{parsed.recomendaciones}</span>
                          </div>
                        )}
                      </div>
                    ) : hasPlainObservaciones ? (
                      <p className="text-sm text-muted-foreground">{m.observaciones}</p>
                    ) : null}

                    {/* Galería de fotos como evidencia */}
                    {fotos.length > 0 && (
                      <div className="pt-1">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                          <Camera className="size-3.5 text-primary" />
                          Evidencias fotográficas ({fotos.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {fotos.map((f, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setPreviewFoto(f)}
                              title={`Ver evidencia #${idx + 1}`}
                              className="group relative rounded-lg border overflow-hidden size-16 bg-muted/40 hover:scale-105 transition-transform shadow-xs cursor-pointer"
                            >
                              <img src={f} alt={`Evidencia ${idx + 1}`} className="size-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="size-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/20 text-foreground font-medium shadow-2xs">
                  <Calendar className="size-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">Próximo mantenimiento programado:</span>
                  <strong className="font-bold text-foreground text-xs">{formatDate(m.proximaFecha)}</strong>
                </span>
              </div>
            </div>
          ))}
          {mantenimientos.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin mantenimientos registrados.</p>
          )}
        </CardContent>
      </Card>

      <ImagePreviewDialog src={previewFoto} onClose={() => setPreviewFoto(null)} />
    </AppShell>
  );
}
