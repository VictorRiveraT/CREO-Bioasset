import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Search,
  AlertTriangle,
  QrCode,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { EquipmentDialog, IncidentDialog } from "@/components/bioasset/dialogs";
import { DueBadge, StatusBadge } from "@/components/bioasset/StatusBadge";
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
import { daysUntil, formatDate, useBio } from "@/lib/bioasset/store";
import { CATEGORIES, EQUIPMENT_STATUSES } from "@/lib/bioasset/types";
import { encryptUrlParam } from "@/lib/bioasset/security";

export const Route = createFileRoute("/equipos/")({
  validateSearch: (search: Record<string, unknown>) => ({
    estado: typeof search.estado === "string" ? search.estado : undefined,
    mantenimiento: typeof search.mantenimiento === "string" ? search.mantenimiento : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Equipos biomédicos | BIOASSET" },
      {
        name: "description",
        content:
          "Inventario de equipos biomédicos con búsqueda y filtros por categoría, estado y ubicación.",
      },
      { property: "og:title", content: "Equipos biomédicos | BIOASSET" },
      { property: "og:description", content: "Inventario de equipos biomédicos." },
    ],
  }),
  component: EquiposPage,
});

const PAGE_SIZE = 10;

function EquiposPage() {
  const { db, canEdit, locationName, locationFullName, categorias, estadosEquipo } = useBio();
  const searchParams = Route.useSearch();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todas");
  const [est, setEst] = useState(searchParams.estado || "todos");
  const [mantFiltro, setMantFiltro] = useState(searchParams.mantenimiento || "todos");
  const [ubi, setUbi] = useState("todas");
  const [clase, setClase] = useState("todas");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);

  // Sync with search params whenever they change (e.g. navigation from Dashboard drill-down)
  useEffect(() => {
    if (searchParams.estado) {
      setEst(searchParams.estado);
    }
    if (searchParams.mantenimiento) {
      setMantFiltro(searchParams.mantenimiento);
    }
  }, [searchParams.estado, searchParams.mantenimiento]);

  const hasFilters = Boolean(
    q || cat !== "todas" || est !== "todos" || ubi !== "todas" || clase !== "todas" || mantFiltro !== "todos"
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const seen = new Set<string>();
    return db.equipment
      .filter((e) => {
        if (!e.id) return false;
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      })
      .filter((e) => {
      const matchTerm =
        !term ||
        [e.codigo, e.nombre, e.marca, e.serie].some((v) => (v || "").toLowerCase().includes(term));
      const matchCat = cat === "todas" || e.categoria === cat;

      // Status filtering:
      // "Fuera de servicio" and "Inoperativo" represent clinical / technical stoppage.
      // "De baja" is permanently decommissioned/archived.
      let matchEst = true;
      if (est !== "todos") {
        const target = est.toLowerCase();
        const current = (e.estado || "").toLowerCase();
        if (target === "fuera de servicio" || target === "inoperativo") {
          matchEst = current === "fuera de servicio" || current === "inoperativo";
        } else {
          matchEst = current === target;
        }
      }

      const matchUbi = ubi === "todas" || e.ubicacionId === ubi;
      const isTec = (e.codigo?.startsWith("TI-") ?? false) || e.claseActivo === "Tecnologico";
      const matchClase = clase === "todas" || (clase === "tecnologico" ? isTec : !isTec);

      // QA-050: Regla canónica para sincronizar historial con inventario
      const mants = (db.maintenance || []).filter(
        (m) => m.equipoId === e.id && m.resultado === "Completado" && m.proximaFecha,
      );
      const latestCompleted = mants.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))[0];
      const canonicalDate = latestCompleted?.proximaFecha || e.proximoMantenimiento;

      let matchMant = true;
      if (mantFiltro === "vencido") {
        matchMant = e.estado !== "De baja" && daysUntil(canonicalDate) < 0;
      } else if (mantFiltro === "proximo") {
        const d = daysUntil(canonicalDate);
        matchMant = e.estado !== "De baja" && d >= 0 && d <= 30;
      } else if (mantFiltro === "al_dia") {
        matchMant = e.estado !== "De baja" && daysUntil(canonicalDate) > 30;
      }

      return matchTerm && matchCat && matchEst && matchUbi && matchClase && matchMant;
    });
  }, [db.equipment, db.maintenance, q, cat, est, ubi, clase, mantFiltro]);

  // Resetear a página 1 al cambiar cualquier filtro o término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [q, cat, est, ubi, clase, mantFiltro]);

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

  return (
    <AppShell
      title="Equipos biomédicos"
      description={`${rows.length} equipos encontrados`}
      actions={
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/qr">
              <QrCode className="size-4" /> Escanear QR
            </Link>
          </Button>
          {canEdit("inventario") && (
            <EquipmentDialog
              trigger={
                <Button size="sm">
                  <Plus className="size-4" /> Registrar equipo
                </Button>
              }
            />
          )}
        </div>
      }
    >
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Select value={clase} onValueChange={setClase}>
            <SelectTrigger>
              <SelectValue placeholder="Clase de activo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las clases</SelectItem>
              <SelectItem value="biomedico">Solo Biomédicos (BM)</SelectItem>
              <SelectItem value="tecnologico">Solo Tecnológicos (TI)</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar código, nombre..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {Array.from(new Set([...categorias, ...CATEGORIES])).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={est} onValueChange={setEst}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {Array.from(new Set([...estadosEquipo, ...EQUIPMENT_STATUSES])).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={mantFiltro} onValueChange={setMantFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Mantenimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo mantenimiento</SelectItem>
              <SelectItem value="al_dia">Al día / Vigente</SelectItem>
              <SelectItem value="proximo">Próximo (≤ 30 d)</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ubi} onValueChange={setUbi}>
            <SelectTrigger>
              <SelectValue placeholder="Ubicación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las ubicaciones</SelectItem>
              {db.locations
                .filter((l) => l.nombre !== "___EMPTY___")
                .map((l) => {
                  const locSede = (l.sede || "").trim().toLowerCase() === "surco" ? "Santiago de Surco" : l.sede;
                  return (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nombre} {locSede ? `(${locSede} · ${l.piso || "Piso 1"})` : ""}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </CardContent>

        {hasFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 pb-3 pt-2 text-xs text-muted-foreground border-t">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-foreground">Filtro activo:</span>
              {est !== "todos" && (
                <Badge variant="secondary" className="text-[11px] font-semibold border-primary/20 bg-primary/10 text-primary">
                  Estado: {est}
                </Badge>
              )}
              {mantFiltro !== "todos" && (
                <Badge variant="secondary" className={`text-[11px] font-semibold ${mantFiltro === "vencido" ? "border-destructive/30 bg-destructive/10 text-destructive" : ""}`}>
                  Mantenimiento: {mantFiltro === "vencido" ? "Vencido" : mantFiltro === "proximo" ? "Próximo (≤30d)" : "Al día"}
                </Badge>
              )}
              {cat !== "todas" && (
                <Badge variant="secondary" className="text-[11px]">
                  Cat: {cat}
                </Badge>
              )}
              {ubi !== "todas" && (
                <Badge variant="secondary" className="text-[11px]">
                  Ubicación: {locationFullName(ubi)}
                </Badge>
              )}
              {clase !== "todas" && (
                <Badge variant="secondary" className="text-[11px]">
                  Clase: {clase === "biomedico" ? "Biomédicos" : "Tecnológicos"}
                </Badge>
              )}
              {q && (
                <Badge variant="secondary" className="text-[11px]">
                  Búsqueda: "{q}"
                </Badge>
              )}
              <span className="text-muted-foreground">({rows.length} equipo(s) coincidente(s))</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setCat("todas");
                setEst("todos");
                setMantFiltro("todos");
                setUbi("todas");
                setClase("todas");
                setCurrentPage(1);
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="mr-1 size-3.5" /> Limpiar filtros
            </Button>
          </div>
        )}
      </Card>

      <Card className="shadow-[var(--shadow-card)] mt-4 overflow-hidden">
        <CardContent className="p-0">
          {/* Vista Móvil: Tarjetas responsivas (pantallas < md) */}
          <div className="md:hidden divide-y divide-border">
            {pagedRows.map((e) => {
              const isTec = (e.codigo?.startsWith("TI-") ?? false) || e.claseActivo === "Tecnologico";
              const loc = db.locations.find((l) => l.id === e.ubicacionId);
              const locSede = (loc?.sede || "").trim().toLowerCase() === "surco" ? "Santiago de Surco" : loc?.sede;
              const mants = (db.maintenance || []).filter(
                (m) => m.equipoId === e.id && m.resultado === "Completado" && m.proximaFecha,
              );
              const latestCompleted = mants.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))[0];
              const canonicalDate = latestCompleted?.proximaFecha || e.proximoMantenimiento;

              return (
                <div key={e.id} className="p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base text-amber-600 dark:text-amber-400">{e.codigo}</span>
                      {isTec ? (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-blue-600 dark:text-blue-400 border-blue-400/30 bg-blue-500/10 font-mono">
                          TI
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-emerald-600 dark:text-emerald-400 border-emerald-400/30 bg-emerald-500/10 font-mono">
                          BM
                        </Badge>
                      )}
                    </div>
                    <StatusBadge status={e.estado} />
                  </div>

                  <div>
                    <div className="font-semibold text-sm text-foreground leading-snug">{e.nombre}</div>
                    {(e.marca || e.modelo || e.serie) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[e.marca, e.modelo].filter(Boolean).join(" · ")}
                        {e.serie && <span className="ml-1 text-[11px] font-mono">({e.serie})</span>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Ubicación</span>
                      <span className="font-medium text-foreground truncate block">{locationName(e.ubicacionId)}</span>
                      {loc && loc.sede && loc.sede !== "___EMPTY___" && (
                        <span className="text-[10px] text-muted-foreground truncate block">{locSede} · {loc.piso || "Piso 1"}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Próx. mantenimiento</span>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        <span className="font-medium">{formatDate(canonicalDate)}</span>
                        <DueBadge days={daysUntil(canonicalDate)} status={e.estado} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    <IncidentDialog
                      equipoId={e.id}
                      trigger={
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs"
                        >
                          <AlertTriangle className="size-3.5 mr-1 text-destructive" /> Avería
                        </Button>
                      }
                    />
                    {e && e.id && (
                      <Button asChild variant="default" size="sm" className="h-8 px-3 text-xs font-medium">
                        <Link to="/equipos/$id" params={{ id: encryptUrlParam(e.id) }}>
                          Ver ficha completa
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="py-10 px-4 text-center text-muted-foreground space-y-2">
                <div>No se encontraron equipos con los filtros aplicados.</div>
                {q.trim() && cat !== "todas" && (
                  <div className="text-xs">
                    ¿Buscabas en otra categoría?{" "}
                    <button
                      type="button"
                      onClick={() => setCat("todas")}
                      className="text-primary underline font-medium hover:text-primary/80 cursor-pointer"
                    >
                      Buscar "{q.trim()}" en todas las categorías
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Vista Desktop / Tablet: Tabla Completa (md:block) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Próx. mantenimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{e.codigo}</span>
                        {(e.codigo?.startsWith("TI-") ?? false) || e.claseActivo === "Tecnologico" ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-blue-600 dark:text-blue-400 border-blue-400/30 bg-blue-500/10 font-mono">
                            TI
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-emerald-600 dark:text-emerald-400 border-emerald-400/30 bg-emerald-500/10 font-mono">
                            BM
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{e.nombre}</div>
                      {(e.marca || e.modelo) && (
                        <div className="text-xs text-muted-foreground">
                          {[e.marca, e.modelo].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{locationName(e.ubicacionId)}</div>
                      {(() => {
                        const loc = db.locations.find((l) => l.id === e.ubicacionId);
                        if (loc && loc.sede && loc.sede !== "___EMPTY___") {
                          const locSede =
                            (loc.sede || "").trim().toLowerCase() === "surco"
                              ? "Santiago de Surco"
                              : loc.sede;
                          return (
                            <div className="text-xs text-muted-foreground">
                              {locSede} · {loc.piso || "Piso 1"}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={e.estado} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        const mants = (db.maintenance || []).filter(
                          (m) => m.equipoId === e.id && m.resultado === "Completado" && m.proximaFecha,
                        );
                        const latestCompleted = mants.sort(
                          (a, b) => (b.fecha || "").localeCompare(a.fecha || ""),
                        )[0];
                        const canonicalDate = latestCompleted?.proximaFecha || e.proximoMantenimiento;
                        return (
                          <>
                            {formatDate(canonicalDate)}{" "}
                            <DueBadge days={daysUntil(canonicalDate)} status={e.estado} />
                          </>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <IncidentDialog
                          equipoId={e.id}
                          trigger={
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Reportar avería"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <AlertTriangle className="size-4" />
                            </Button>
                          }
                        />
                        {e && e.id && (
                          <Button asChild variant="outline" size="sm">
                            <Link to="/equipos/$id" params={{ id: encryptUrlParam(e.id) }}>
                              Ver detalle
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground space-y-2">
                      <div>No se encontraron equipos con los filtros aplicados.</div>
                      {q.trim() && cat !== "todas" && (
                        <div className="text-xs">
                          ¿Buscabas en otra categoría?{" "}
                          <button
                            type="button"
                            onClick={() => setCat("todas")}
                            className="text-primary underline font-medium hover:text-primary/80 cursor-pointer"
                          >
                            Buscar "{q.trim()}" en todas las categorías
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Barra de Paginación (Máximo 10 registros por página) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t bg-card/60">
            <div className="text-xs text-muted-foreground">
              {rows.length === 0 ? (
                "0 equipos"
              ) : (
                <>
                  Mostrando <strong className="text-foreground font-semibold">{startIndex + 1}</strong> -{" "}
                  <strong className="text-foreground font-semibold">{endIndex}</strong> de{" "}
                  <strong className="text-foreground font-semibold">{rows.length}</strong> equipos
                  {rows.length !== (db.equipment?.length || 0) && (
                    <span className="ml-1 text-muted-foreground">({db.equipment?.length || 0} totales)</span>
                  )}
                </>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1 sm:gap-1.5 w-full sm:w-auto">
                {/* Botón Primera Página */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPageClamped <= 1}
                  className="hidden sm:inline-flex h-8 w-8 p-0"
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
                  <ChevronLeft className="size-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Anterior</span>
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
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="size-3.5 sm:ml-1" />
                </Button>

                {/* Botón Última Página */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPageClamped >= totalPages}
                  className="hidden sm:inline-flex h-8 w-8 p-0"
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
