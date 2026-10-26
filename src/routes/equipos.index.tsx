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
  const { db, canEdit, locationName, categorias, estadosEquipo } = useBio();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todas");
  const [est, setEst] = useState("todos");
  const [ubi, setUbi] = useState("todas");
  const [clase, setClase] = useState("todas");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);

  // Read URL query params on mount (e.g. from Dashboard drill-down ?estado=Operativo)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const estadoParam = params.get("estado");
      if (estadoParam && (EQUIPMENT_STATUSES.includes(estadoParam as any) || estadosEquipo.includes(estadoParam))) {
        setEst(estadoParam);
      }
    }
  }, []);

  const hasFilters = Boolean(q || cat !== "todas" || est !== "todos" || ubi !== "todas" || clase !== "todas");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.equipment.filter((e) => {
      const matchTerm =
        !term ||
        [e.codigo, e.nombre, e.marca, e.serie].some((v) => (v || "").toLowerCase().includes(term));
      const matchCat = cat === "todas" || e.categoria === cat;
      const matchEst = est === "todos" || e.estado.toLowerCase() === est.toLowerCase();
      const matchUbi = ubi === "todas" || e.ubicacionId === ubi;
      const isTec = (e.codigo?.startsWith("TI-") ?? false) || e.claseActivo === "Tecnologico";
      const matchClase = clase === "todas" || (clase === "tecnologico" ? isTec : !isTec);

      return matchTerm && matchCat && matchEst && matchUbi && matchClase;
    });
  }, [db.equipment, q, cat, est, ubi, clase]);

  // Resetear a página 1 al cambiar cualquier filtro o término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [q, cat, est, ubi, clase]);

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
        <CardContent className="grid gap-3 py-4 md:grid-cols-5">
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
              placeholder="Buscar por código, nombre, marca o serie"
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

          <Select value={ubi} onValueChange={setUbi}>
            <SelectTrigger>
              <SelectValue placeholder="Ubicación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las ubicaciones</SelectItem>
              {db.locations
                .filter((l) => l.nombre !== "___EMPTY___")
                .map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nombre}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>

        {hasFilters && (
          <div className="flex items-center justify-between px-6 pb-3 pt-0 text-xs text-muted-foreground border-t">
            <span>Filtros activos: {rows.length} equipo(s) coincidente(s)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setCat("todas");
                setEst("todos");
                setUbi("todas");
                setClase("todas");
                setCurrentPage(1);
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 size-3.5" /> Limpiar filtros
            </Button>
          </div>
        )}
      </Card>

      <Card className="shadow-[var(--shadow-card)] mt-4 overflow-hidden">
        <CardContent className="p-0">
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
                  <TableCell>{locationName(e.ubicacionId)}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.estado} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(e.proximoMantenimiento)}{" "}
                    <DueBadge days={daysUntil(e.proximoMantenimiento)} status={e.estado} />
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
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No se encontraron equipos con los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

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
    </AppShell>
  );
}
