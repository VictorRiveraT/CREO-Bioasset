import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, Wrench, Plus, X, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
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
import { useBio, formatDateTime } from "@/lib/bioasset/store";
import { cn } from "@/lib/utils";
import { MaintenanceDialog, IncidentDialog } from "@/components/bioasset/dialogs";
import { encryptUrlParam } from "@/lib/bioasset/security";

export const Route = createFileRoute("/incidencias")({
  head: () => ({
    meta: [
      { title: "Incidencias | BIOASSET" },
      { name: "description", content: "Reporte y seguimiento de fallas de equipos biomédicos" },
    ],
  }),
  component: IncidenciasPage,
});

const PAGE_SIZE = 10;

function IncidenciasPage() {
  const { db, canEdit, locationName } = useBio();
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);

  // Helper para orden prioritario: Abiertas (0) primero, En revisión (1) segundo, Cerradas (2) al final
  const getPriority = (estado?: string): number => {
    if (!estado) return 0;
    const s = estado.toLowerCase().trim();
    if (s === "abierta") return 0;
    if (s.includes("revision") || s.includes("proceso")) return 1;
    return 2; // Cerrada o resuelta
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...(db.incidents || [])]
      .filter((i) => {
        const e = db.equipment.find((x) => x.id === (i.activoId || (i as any).activo_id));
        const code = e?.codigo || "Sin código";
        const name = e?.nombre || "Equipo no encontrado";
        const matchTerm = !term || `${code} ${name} ${i.titulo || ""}`.toLowerCase().includes(term);
        const matchEstado =
          estadoFilter === "todos" || i.estado?.toLowerCase() === estadoFilter.toLowerCase();
        return matchTerm && matchEstado;
      })
      .sort((a, b) => {
        const pA = getPriority(a.estado);
        const pB = getPriority(b.estado);

        // Prioridad: Abiertas primero, Cerradas abajo al final
        if (pA !== pB) {
          return pA - pB;
        }

        // Dentro del mismo grupo, más reciente primero
        const dateA = a.fecha || a.fechaCreacion || "";
        const dateB = b.fecha || b.fechaCreacion || "";
        return dateB.localeCompare(dateA);
      });
  }, [db.incidents, db.equipment, q, estadoFilter]);

  // Resetear a página 1 al cambiar filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [q, estadoFilter]);

  // Paginación: Cálculos
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPageClamped = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (currentPageClamped - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, rows.length);
  const pagedRows = rows.slice(startIndex, endIndex);

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

  const hasActiveFilters = Boolean(q || estadoFilter !== "todos");

  return (
    <AppShell
      title="Incidencias"
      description={`${rows.length} incidencias registradas`}
      actions={
        canEdit("incidencias") && (
          <IncidentDialog
            trigger={
              <Button
                size="sm"
                className="bg-[#F2B705] text-black hover:bg-[#DCA004] font-semibold gap-1.5"
              >
                <Plus className="size-4" /> Reportar incidencia
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
              placeholder="Buscar por código, equipo o descripción de falla..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado de incidencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="Abierta">Abierta</SelectItem>
                <SelectItem value="En revision">En revisión</SelectItem>
                <SelectItem value="Cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQ("");
                  setEstadoFilter("todos");
                  setCurrentPage(1);
                }}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="mr-1 size-3.5" /> Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)] mt-4">
        <CardContent className="p-0">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Equipo</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Problema Reportado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="size-8 text-muted-foreground/50" />
                      <p className="font-medium">No se encontraron incidencias.</p>
                      {hasActiveFilters && (
                        <p className="text-xs">Prueba ajustando los filtros de búsqueda.</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pagedRows.map((i) => {
                  const e = db.equipment.find((x) => x.id === i.activoId);
                  const isCerrada = i.estado?.toLowerCase().startsWith("cerrad") || i.estado === "Resuelta";
                  const isAbierta = i.estado?.toLowerCase() === "abierta";
                  const isRevision = i.estado?.toLowerCase().includes("revision");

                  let rowBgClass = "hover:bg-muted/50 transition-colors";
                  if (isCerrada) {
                    rowBgClass = "bg-muted/10 opacity-75 hover:opacity-100 hover:bg-muted/30 transition-all";
                  } else if (isAbierta) {
                    rowBgClass = "bg-rose-500/[0.03] hover:bg-rose-500/[0.06] transition-colors";
                  } else if (isRevision) {
                    rowBgClass = "bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors";
                  }

                  return (
                    <TableRow key={i.id} className={rowBgClass}>
                      <TableCell
                        className={cn(
                          "pl-3 transition-colors",
                          isAbierta
                            ? "border-l-4 border-l-rose-500"
                            : isRevision
                            ? "border-l-4 border-l-primary"
                            : "border-l-4 border-l-transparent"
                        )}
                      >
                        <div className="flex flex-col">
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
                              {e?.codigo || i.activoId?.substring(0, 8) || "N/A"}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{e?.nombre || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {e ? locationName(e.ubicacionId) : "N/A"}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="text-sm font-medium">{i.titulo}</span>
                        {i.fechaOcurrencia && (
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            Ocurrió el: {formatDateTime(i.fechaOcurrencia)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant="outline"
                            className={
                              i.estado === "Abierta"
                                ? "bg-destructive/15 text-destructive border-destructive/30 font-semibold"
                                : i.estado === "En revision"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                            }
                          >
                            {i.estado}
                          </Badge>
                          {(db.maintenance || []).some((m) => m.incidenciaId === i.id) && (
                            <Link to="/mantenimiento">
                              <Badge variant="secondary" className="text-[10px] hover:underline">
                                Mantenimiento vinculado
                              </Badge>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit("mantenimiento") && i.estado !== "Cerrada" && e && (
                          <MaintenanceDialog
                            equipoId={e.id}
                            incidenciaId={i.id}
                            trigger={
                              <Button size="sm" variant="outline" className="gap-1.5 h-8">
                                <Wrench className="size-3.5 text-primary" />
                                Atender / Reparar
                              </Button>
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Barra de Paginación (Máximo 10 registros por página) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t bg-card/60">
            <div className="text-xs text-muted-foreground">
              {rows.length === 0 ? (
                "0 incidencias"
              ) : (
                <>
                  Mostrando <strong className="text-foreground font-semibold">{startIndex + 1}</strong> -{" "}
                  <strong className="text-foreground font-semibold">{endIndex}</strong> de{" "}
                  <strong className="text-foreground font-semibold">{rows.length}</strong> incidencias
                  {rows.length !== (db.incidents?.length || 0) && (
                    <span className="ml-1 text-muted-foreground">({db.incidents?.length || 0} totales)</span>
                  )}
                </>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPageClamped <= 1}
                  className="h-8 px-2 text-xs font-medium"
                >
                  <ChevronLeft className="size-3.5 mr-1" /> Anterior
                </Button>

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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPageClamped >= totalPages}
                  className="h-8 px-2 text-xs font-medium"
                >
                  Siguiente <ChevronRight className="size-3.5 ml-1" />
                </Button>

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
    </AppShell>
  );
}
