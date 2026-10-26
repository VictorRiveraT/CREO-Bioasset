import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Search,
  X,
  Camera,
  FileText,
  User,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { MaintenanceDialog } from "@/components/bioasset/dialogs";
import { ImagePreviewDialog } from "@/components/bioasset/image-preview-dialog";
import { DueBadge } from "@/components/bioasset/StatusBadge";
import { encryptUrlParam } from "@/lib/bioasset/security";
import { cn } from "@/lib/utils";
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
import { daysUntil, formatDate, formatDateTime, useBio } from "@/lib/bioasset/store";

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

// Helper: Determina si un resultado corresponde a un mantenimiento ya completado/finalizado
function isCompletado(resultado?: string): boolean {
  if (!resultado) return false;
  const r = resultado.toLowerCase().trim();
  return (
    r === "completado" ||
    r.startsWith("completad") ||
    r === "conforme" ||
    r === "reparado" ||
    r === "operativo"
  );
}

// Helper: Determina si un resultado está en curso o pendiente
function isEnProgreso(resultado?: string): boolean {
  if (!resultado) return true;
  const r = resultado.toLowerCase().trim();
  return (
    r === "en progreso" ||
    r.includes("progreso") ||
    r.includes("pendiente") ||
    r.includes("evaluaci")
  );
}

// Helper: Calcula días restantes de manera segura (null si no tiene fecha)
function getDaysUntilNext(dateStr?: string | null): number | null {
  if (!dateStr || !dateStr.trim()) return null;
  return daysUntil(dateStr);
}

const PAGE_SIZE = 10;

function MantenimientoPage() {
  const { db, userName, canEdit, tiposMantenimiento, resultadosMantenimiento } = useBio();

  // Estados de filtros
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [resultadoFilter, setResultadoFilter] = useState("todos");
  const [proximidadFilter, setProximidadFilter] = useState("todos");
  const [orden, setOrden] = useState("prioridad"); // 'prioridad' | 'proximo_asc' | 'fecha_desc' | 'fecha_asc'

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);

  // Modal de evidencia fotográfica
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  // Lista dinámica de resultados disponibles para el selector
  const availableResultados = useMemo(() => {
    const set = new Set<string>();
    (db.maintenance || []).forEach((m) => {
      if (m.resultado && m.resultado.trim()) set.add(m.resultado.trim());
    });
    (resultadosMantenimiento || []).forEach((r) => {
      if (r && r.trim()) set.add(r.trim());
    });
    set.add("En progreso");
    set.add("Completado");
    set.add("De baja");
    return Array.from(set);
  }, [db.maintenance, resultadosMantenimiento]);

  // Filtrado y Ordenamiento inteligente
  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();

    return [...(db.maintenance || [])]
      .filter((m) => {
        const e = db.equipment.find((x) => x.id === m.equipoId);
        const equipLabel = e ? `${e.codigo || ""} ${e.nombre || ""}` : (m.equipoId || "");
        const matchTerm = !term || equipLabel.toLowerCase().includes(term);

        const inTipo = tipo === "todos" || m.tipo === tipo;

        // Filtro por resultado
        let inResultado = true;
        if (resultadoFilter !== "todos") {
          if (resultadoFilter === "Completado") {
            inResultado = isCompletado(m.resultado);
          } else if (resultadoFilter === "En progreso") {
            inResultado = isEnProgreso(m.resultado);
          } else {
            inResultado = (m.resultado || "").toLowerCase() === resultadoFilter.toLowerCase();
          }
        }

        // Filtro por proximidad
        let inProximidad = true;
        if (proximidadFilter !== "todos") {
          const days = getDaysUntilNext(m.proximaFecha);
          if (proximidadFilter === "urgentes") {
            inProximidad = days !== null && days <= 30;
          } else if (proximidadFilter === "vencidos") {
            inProximidad = days !== null && days < 0;
          } else if (proximidadFilter === "proximos_7") {
            inProximidad = days !== null && days >= 0 && days <= 7;
          } else if (proximidadFilter === "proximos_30") {
            inProximidad = days !== null && days >= 0 && days <= 30;
          } else if (proximidadFilter === "futuros") {
            inProximidad = days !== null && days > 30;
          } else if (proximidadFilter === "sin_fecha") {
            inProximidad = days === null;
          }
        }

        return matchTerm && inTipo && inResultado && inProximidad;
      })
      .sort((a, b) => {
        // 1. Orden por defecto: PRIORIDAD (Incompletos/Activos arriba, Completados abajo)
        if (orden === "prioridad") {
          const aComp = isCompletado(a.resultado);
          const bComp = isCompletado(b.resultado);

          // Si uno está completado y el otro no, el activo va primero
          if (aComp !== bComp) {
            return aComp ? 1 : -1;
          }

          // Si ambos son activos (en progreso/pendientes), ordenar por proximidad más cercana
          if (!aComp) {
            const aDays = getDaysUntilNext(a.proximaFecha);
            const bDays = getDaysUntilNext(b.proximaFecha);
            if (aDays !== null && bDays !== null) return aDays - bDays;
            if (aDays !== null) return -1;
            if (bDays !== null) return 1;
            return (b.fecha || "").localeCompare(a.fecha || "");
          }

          // Si ambos ya están completados, ordenar por fecha más reciente primero
          return (b.fecha || "").localeCompare(a.fecha || "");
        }

        // 2. Orden por Próximo Mantenimiento más cercano
        if (orden === "proximo_asc") {
          const aDays = getDaysUntilNext(a.proximaFecha);
          const bDays = getDaysUntilNext(b.proximaFecha);
          if (aDays !== null && bDays !== null) return aDays - bDays;
          if (aDays !== null) return -1;
          if (bDays !== null) return 1;
          return (b.fecha || "").localeCompare(a.fecha || "");
        }

        // 3. Orden por Fecha de Registro más reciente
        if (orden === "fecha_desc") {
          return (b.fecha || "").localeCompare(a.fecha || "");
        }

        // 4. Orden por Fecha de Registro más antigua
        if (orden === "fecha_asc") {
          return (a.fecha || "").localeCompare(b.fecha || "");
        }

        return 0;
      });
  }, [db.maintenance, db.equipment, q, tipo, resultadoFilter, proximidadFilter, orden]);

  // Resetear a la página 1 cuando cambia cualquier filtro u ordenamiento
  useEffect(() => {
    setCurrentPage(1);
  }, [q, tipo, resultadoFilter, proximidadFilter, orden]);

  // Paginación: Cálculos
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPageClamped = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (currentPageClamped - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredRows.length);
  const pagedRows = filteredRows.slice(startIndex, endIndex);

  // Generador de números de página para la barra de navegación
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPageClamped <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }
    if (currentPageClamped >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPageClamped - 1, currentPageClamped, currentPageClamped + 1, "...", totalPages];
  }, [totalPages, currentPageClamped]);

  const hasFilters = Boolean(
    q ||
    tipo !== "todos" ||
    resultadoFilter !== "todos" ||
    proximidadFilter !== "todos" ||
    orden !== "prioridad"
  );

  const resetFilters = () => {
    setQ("");
    setTipo("todos");
    setResultadoFilter("todos");
    setProximidadFilter("todos");
    setOrden("prioridad");
    setCurrentPage(1);
  };

  return (
    <AppShell
      title="Mantenimiento"
      description={`${filteredRows.length} registros de mantenimiento`}
      actions={
        canEdit("mantenimiento") && (
          <MaintenanceDialog
            trigger={
              <Button size="sm" className="shadow-sm">
                <Plus className="size-4 mr-1.5" /> Registrar mantenimiento
              </Button>
            }
          />
        )
      }
    >
      {/* Panel de Filtros y Ordenamiento */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
            {/* Buscador */}
            <div className="relative sm:col-span-2 lg:col-span-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="Buscar por código o nombre del equipo"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Filtro Tipo */}
            <div className="sm:col-span-1 lg:col-span-2">
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tipo" />
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
            </div>

            {/* Filtro Resultado / Estado */}
            <div className="sm:col-span-1 lg:col-span-2">
              <Select value={resultadoFilter} onValueChange={setResultadoFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Resultado / Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="En progreso">En progreso / Pendiente</SelectItem>
                  <SelectItem value="Completado">Completado</SelectItem>
                  {availableResultados
                    .filter((r) => r !== "En progreso" && r !== "Completado")
                    .map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Proximidad */}
            <div className="sm:col-span-1 lg:col-span-2">
              <Select value={proximidadFilter} onValueChange={setProximidadFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Vencimiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Cualquier vencimiento</SelectItem>
                  <SelectItem value="urgentes">Urgentes o próximos (≤ 30 días)</SelectItem>
                  <SelectItem value="vencidos">Mantenimientos vencidos</SelectItem>
                  <SelectItem value="proximos_7">Próximos a vencer (≤ 7 días)</SelectItem>
                  <SelectItem value="proximos_30">Próximos a vencer (≤ 30 días)</SelectItem>
                  <SelectItem value="futuros">Programados a futuro (&gt; 30 d)</SelectItem>
                  <SelectItem value="sin_fecha">Sin fecha programada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Ordenamiento */}
            <div className="sm:col-span-1 lg:col-span-2">
              <Select value={orden} onValueChange={setOrden}>
                <SelectTrigger className="h-9 bg-muted/20 font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    <ArrowUpDown className="size-3.5 text-primary shrink-0" />
                    <SelectValue placeholder="Ordenar por" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prioridad">Prioridad (Activos primero)</SelectItem>
                  <SelectItem value="proximo_asc">Más próximo a vencer</SelectItem>
                  <SelectItem value="fecha_desc">Fecha de registro (Reciente)</SelectItem>
                  <SelectItem value="fecha_asc">Fecha de registro (Antiguo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Barra de Filtros Activos y Limpieza */}
          {hasFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-primary" />
                <span>
                  Filtros aplicados:{" "}
                  <strong className="text-foreground">{filteredRows.length}</strong> registro(s) encontrados
                </span>
                {orden === "prioridad" && (
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                    Activos primero, completados abajo
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 size-3.5" /> Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Mantenimientos */}
      <Card className="shadow-[var(--shadow-card)] mt-4 overflow-hidden">
        <CardContent className="p-0">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[140px]">Fecha registro</TableHead>
                <TableHead className="w-[220px]">Equipo</TableHead>
                <TableHead className="w-[110px]">Tipo</TableHead>
                <TableHead className="w-[140px]">Técnico</TableHead>
                <TableHead>Descripción y Evidencia</TableHead>
                <TableHead className="w-[140px]">Resultado</TableHead>
                <TableHead className="w-[160px]">Próximo Vencimiento</TableHead>
                <TableHead className="text-right w-[110px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((m) => {
                const e = db.equipment.find((x) => x.id === m.equipoId);
                const completado = isCompletado(m.resultado);
                const enProgreso = isEnProgreso(m.resultado);
                const days = getDaysUntilNext(m.proximaFecha);
                const isOverdue = days !== null && days < 0 && !completado;

                // Estilos visuales inteligentes: los activos resaltan, los completados van atenuados
                let rowBgClass = "hover:bg-muted/50 transition-colors";
                if (completado) {
                  rowBgClass = "bg-muted/10 opacity-80 hover:opacity-100 hover:bg-muted/30 transition-all";
                } else if (enProgreso) {
                  rowBgClass = "bg-primary/[0.04] hover:bg-primary/[0.08] transition-colors";
                } else if (isOverdue) {
                  rowBgClass = "bg-rose-500/[0.04] hover:bg-rose-500/[0.08] transition-colors";
                }

                return (
                  <TableRow key={m.id} className={rowBgClass}>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap text-muted-foreground text-xs font-medium pl-3 transition-colors",
                        isOverdue
                          ? "border-l-4 border-l-rose-500"
                          : enProgreso
                          ? "border-l-4 border-l-primary"
                          : "border-l-4 border-l-transparent"
                      )}
                    >
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
                      <span className="text-xs text-muted-foreground line-clamp-1">{e?.nombre || ""}</span>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={m.tipo === "Correctivo" ? "destructive" : "secondary"} className="text-xs">
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

                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <User className="size-3 text-primary shrink-0" />
                        <span className="truncate max-w-[120px]">{userName(m.biomedicoId)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-xs text-muted-foreground">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                          {m.descripcion}
                        </span>
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
                                    onClick={() => setPreviewFoto(fotos[0] || null)}
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

                    <TableCell>
                      {completado ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1 text-xs whitespace-nowrap"
                        >
                          <CheckCircle2 className="size-3 shrink-0" />
                          {m.resultado || "Completado"}
                        </Badge>
                      ) : enProgreso ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold gap-1 text-xs whitespace-nowrap animate-pulse"
                        >
                          <Clock className="size-3 shrink-0" />
                          {m.resultado || "En progreso"}
                        </Badge>
                      ) : m.resultado === "De baja" ? (
                        <Badge
                          variant="outline"
                          className="bg-destructive/15 text-destructive border-destructive/30 font-semibold gap-1 text-xs whitespace-nowrap"
                        >
                          <AlertTriangle className="size-3 shrink-0" />
                          De baja
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-semibold text-xs whitespace-nowrap">
                          {m.resultado}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {m.proximaFecha ? (
                        <div className="flex flex-col gap-1 items-start">
                          <div className="inline-flex items-center gap-1 text-xs bg-muted/40 border border-border px-2 py-0.5 rounded font-medium text-foreground">
                            <Calendar className="size-3 text-muted-foreground shrink-0" />
                            <span>{formatDate(m.proximaFecha)}</span>
                          </div>
                          <DueBadge
                            days={daysUntil(m.proximaFecha)}
                            status={m.resultado === "De baja" ? "De baja" : (m.resultado === "En progreso" ? "En mantenimiento" : undefined)}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No programado</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {canEdit("mantenimiento") && (
                        <MaintenanceDialog
                          maintenance={m}
                          trigger={
                            <Button
                              size="sm"
                              variant={enProgreso ? "default" : "outline"}
                              className="text-xs font-semibold shadow-xs"
                            >
                              {enProgreso ? "Completar" : "Editar"}
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Activity className="size-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No se encontraron mantenimientos con los filtros aplicados.</p>
                      {hasFilters && (
                        <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                          <X className="mr-1.5 size-3.5" /> Limpiar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Barra de Paginación (Máximo 10 registros por página) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t bg-card/60">
            <div className="text-xs text-muted-foreground">
              {filteredRows.length === 0 ? (
                "0 registros"
              ) : (
                <>
                  Mostrando <strong className="text-foreground font-semibold">{startIndex + 1}</strong> -{" "}
                  <strong className="text-foreground font-semibold">{endIndex}</strong> de{" "}
                  <strong className="text-foreground font-semibold">{filteredRows.length}</strong> mantenimientos
                  {filteredRows.length !== (db.maintenance?.length || 0) && (
                    <span className="ml-1 text-muted-foreground">({db.maintenance?.length || 0} totales)</span>
                  )}
                </>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                {/* Botón Primera Página */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPageClamped <= 1}
                  className="h-8 w-8 p-0"
                  title="Primera página"
                >
                  <ChevronsLeft className="size-4" />
                </Button>

                {/* Botón Página Anterior */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPageClamped <= 1}
                  className="h-8 px-2 text-xs font-medium"
                >
                  <ChevronLeft className="size-3.5 mr-1" /> Anterior
                </Button>

                {/* Botones de Páginas Numéricas */}
                <div className="flex items-center gap-1">
                  {pageNumbers.map((p, idx) =>
                    typeof p === "number" ? (
                      <Button
                        key={p}
                        variant={p === currentPageClamped ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 w-8 p-0 text-xs font-semibold ${
                          p === currentPageClamped ? "shadow-xs" : ""
                        }`}
                      >
                        {p}
                      </Button>
                    ) : (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">
                        ...
                      </span>
                    )
                  )}
                </div>

                {/* Botón Página Siguiente */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPageClamped >= totalPages}
                  className="h-8 px-2 text-xs font-medium"
                >
                  Siguiente <ChevronRight className="size-3.5 ml-1" />
                </Button>

                {/* Botón Última Página */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPageClamped >= totalPages}
                  className="h-8 w-8 p-0"
                  title="Última página"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ImagePreviewDialog src={previewFoto} onClose={() => setPreviewFoto(null)} />
    </AppShell>
  );
}
