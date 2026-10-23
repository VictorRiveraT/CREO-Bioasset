import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, X, Camera, FileText } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { MaintenanceDialog } from "@/components/bioasset/dialogs";
import { ImagePreviewDialog } from "@/components/bioasset/image-preview-dialog";
import { encryptUrlParam } from "@/lib/bioasset/security";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, useBio } from "@/lib/bioasset/store";

export const Route = createFileRoute("/mantenimiento")({
  head: () => ({
    meta: [
      { title: "Mantenimiento de equipos | BIOASSET" },
      {
        name: "description",
        content:
          "Registro y consulta de mantenimientos preventivos y correctivos de equipos biomédicos.",
      },
      { property: "og:title", content: "Mantenimiento de equipos | BIOASSET" },
      { property: "og:description", content: "Mantenimientos preventivos y correctivos." },
    ],
  }),
  component: MantenimientoPage,
});

function MantenimientoPage() {
  const { db, userName, canEdit, tiposMantenimiento } = useBio();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...(db.maintenance || [])]
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
      .filter((m) => {
        const e = db.equipment.find((x) => x.id === m.equipoId);
        if (!e) return false;
        const match = !term || `${e.codigo || ""} ${e.nombre || ""}`.toLowerCase().includes(term);
        const inTipo = tipo === "todos" || m.tipo === tipo;
        return match && inTipo;
      });
  }, [db.maintenance, db.equipment, q, tipo]);

  const hasFilters = Boolean(q || tipo !== "todos");

  return (
    <AppShell
      title="Mantenimiento"
      description={`${rows.length} registros de mantenimiento`}
      actions={
        canEdit("mantenimiento") && (
          <MaintenanceDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Registrar mantenimiento
              </Button>
            }
          />
        )
      }
    >
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="grid gap-3 py-4 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por código o nombre del equipo"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {Array.from(new Set([...tiposMantenimiento, "Preventivo", "Correctivo"])).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>

        {hasFilters && (
          <div className="flex items-center justify-between px-6 pb-3 pt-0 text-xs text-muted-foreground border-t">
            <span>Filtros activos: {rows.length} registro(s)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setTipo("todos");
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 size-3.5" /> Limpiar filtros
            </Button>
          </div>
        )}
      </Card>

      <Card className="shadow-[var(--shadow-card)] mt-4">
        <CardContent className="p-0">
          <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Próximo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => {
                const e = db.equipment.find((x) => x.id === m.equipoId);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(m.fecha)}
                    </TableCell>
                    <TableCell>
                      {e && e.id ? (
                        <Link
                          to="/equipos/$id"
                          params={{ id: encryptUrlParam(e.id) }}
                          className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          {e.codigo}
                        </Link>
                      ) : (
                        <span className="font-semibold text-muted-foreground">
                          {e?.codigo || m.equipoId?.substring(0, 8) || "N/A"}
                        </span>
                      )}{" "}
                      <span className="text-muted-foreground">{e?.nombre || ""}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={m.tipo === "Correctivo" ? "destructive" : "secondary"}>
                          {m.tipo}
                        </Badge>
                        {m.incidenciaId && (
                          <Link to="/incidencias">
                            <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 hover:underline">
                              Incidencia vinculada
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{userName(m.biomedicoId)}</TableCell>
                    <TableCell className="max-w-sm text-muted-foreground">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-foreground">{m.descripcion}</span>
                        {(() => {
                          let fotos: string[] = [];
                          try {
                            const parsed = JSON.parse(m.observaciones || "");
                            if (parsed && Array.isArray(parsed.fotos)) {
                              fotos = parsed.fotos.filter((f: any) => typeof f === "string" && f.length > 0);
                            }
                          } catch {}

                          if (
                            fotos.length === 0 &&
                            m.archivoBase64 &&
                            !m.archivoBase64.endsWith(".pdf") &&
                            !m.archivoBase64.includes("application/pdf")
                          ) {
                            fotos = [m.archivoBase64];
                          }

                          const hasPdf =
                            m.archivoBase64 &&
                            (m.archivoBase64.endsWith(".pdf") || m.archivoBase64.includes("application/pdf"));

                          return (
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {fotos.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="flex -space-x-1.5 overflow-hidden">
                                    {fotos.slice(0, 3).map((f, i) => (
                                      <button
                                        type="button"
                                        key={i}
                                        onClick={() => setPreviewFoto(f)}
                                        title={`Ver foto de evidencia #${i + 1}`}
                                        className="inline-block size-6 rounded-full ring-2 ring-background overflow-hidden hover:scale-110 transition-transform shadow-xs cursor-pointer"
                                      >
                                        <img src={f} alt="Evidencia" className="size-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFoto(fotos[0])}
                                    className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Camera className="size-3" />
                                    {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}
                                  </button>
                                </div>
                              )}
                              {hasPdf && (
                                <a
                                  href={m.archivoBase64}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded"
                                >
                                  <FileText className="size-3" /> Ver Formato PDF
                                </a>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>{m.resultado}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(m.proximaFecha)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit("mantenimiento") && (
                        <MaintenanceDialog
                          maintenance={m}
                          trigger={
                            <Button
                              size="sm"
                              variant={m.resultado === "En progreso" ? "default" : "outline"}
                            >
                              {m.resultado === "En progreso" ? "Completar" : "Editar"}
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No se encontraron mantenimientos con los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ImagePreviewDialog src={previewFoto} onClose={() => setPreviewFoto(null)} />
    </AppShell>
  );
}
