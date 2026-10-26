import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { MovementDialog } from "@/components/bioasset/dialogs";
import { encryptUrlParam } from "@/lib/bioasset/security";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, useBio } from "@/lib/bioasset/store";

export const Route = createFileRoute("/trazabilidad")({
  head: () => ({
    meta: [
      { title: "Trazabilidad de equipos | BIOASSET" },
      {
        name: "description",
        content:
          "Historial de movimientos y traslados de los equipos biomédicos entre ubicaciones.",
      },
      { property: "og:title", content: "Trazabilidad de equipos | BIOASSET" },
      { property: "og:description", content: "Movimientos y traslados de equipos biomédicos." },
    ],
  }),
  component: TrazabilidadPage,
});

const PAGE_SIZE = 10;

function TrazabilidadPage() {
  const { db, locationName, userName, canEdit } = useBio();
  const [q, setQ] = useState("");
  const [ubi, setUbi] = useState("todas");
  const [ubiMode, setUbiMode] = useState<"destino" | "origen" | "ambas">("destino");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);

  const rows = useMemo(() => {
    return [...(db.movements || [])]
      .sort((a, b) => new Date(b?.fecha || 0).getTime() - new Date(a?.fecha || 0).getTime())
      .filter((m) => {
        const e = db.equipment.find((x) => x.id === m.equipoId);
        if (!e) return false;

        const match =
          (e.codigo || "").toLowerCase().includes(q.toLowerCase()) ||
          (e.nombre || "").toLowerCase().includes(q.toLowerCase());

        const inUbi =
          ubi === "todas"
            ? true
            : ubiMode === "destino"
              ? m.destinoId === ubi
              : ubiMode === "origen"
                ? m.origenId === ubi
                : m.origenId === ubi || m.destinoId === ubi;

        return match && inUbi;
      });
  }, [db.movements, db.equipment, q, ubi, ubiMode]);

  // Resetear a página 1 al cambiar filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [q, ubi, ubiMode]);

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

  const hasFilters = Boolean(q || ubi !== "todas" || ubiMode !== "destino");

  return (
    <AppShell
      title="Trazabilidad"
      description={`${rows.length} movimientos registrados`}
      actions={
        canEdit("movimientos") && (
          <MovementDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Registrar movimiento
              </Button>
            }
          />
        )
      }
    >
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="grid gap-3 py-4 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por código o nombre del equipo"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={ubi} onValueChange={setUbi}>
            <SelectTrigger>
              <SelectValue placeholder="Ubicación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las ubicaciones</SelectItem>
              {Object.entries(
                db.locations
                  .filter((l) => l.nombre !== "___EMPTY___")
                  .reduce(
                    (acc, loc) => {
                      const s = loc.sede || "Sede Principal";
                      const p = loc.piso || "Piso 1";
                      const key = `${s} - ${p}`;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(loc);
                      return acc;
                    },
                    {} as Record<string, typeof db.locations>,
                  ),
              ).map(([groupName, locs]) => (
                <SelectGroup key={groupName}>
                  <SelectLabel>{groupName}</SelectLabel>
                  {locs.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nombre}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={ubiMode}
            onValueChange={(v) => setUbiMode(v as any)}
            disabled={ubi === "todas"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Criterio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="destino">Destino (Llegada)</SelectItem>
              <SelectItem value="origen">Origen (Salida)</SelectItem>
              <SelectItem value="ambas">Origen o Destino</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>

        {hasFilters && (
          <div className="flex items-center justify-between px-6 pb-3 pt-0 text-xs text-muted-foreground border-t">
            <span>Filtros activos: {rows.length} movimiento(s)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setUbi("todas");
                setUbiMode("destino");
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
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Traslado</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((m) => {
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
                    <TableCell className="whitespace-nowrap">
                      {m.origenId === m.destinoId ? (
                        <span className="text-xs font-medium text-foreground">
                          {locationName(m.destinoId)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span className="text-muted-foreground font-normal">
                            {m.origenId ? locationName(m.origenId) : "Alta inicial"}
                          </span>
                          <ArrowRight className="size-3 text-primary shrink-0" />
                          <span className="text-primary font-semibold">{locationName(m.destinoId)}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{m.motivo}</TableCell>
                    <TableCell>{userName(m.usuarioId)}</TableCell>
                    <TableCell className="max-w-xs text-muted-foreground">
                      {m.observaciones || "Sin observaciones"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No se encontraron movimientos registrados con los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Barra de Paginación (Máximo 10 registros por página) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t bg-card/60">
            <div className="text-xs text-muted-foreground">
              {rows.length === 0 ? (
                "0 movimientos"
              ) : (
                <>
                  Mostrando <strong className="text-foreground font-semibold">{startIndex + 1}</strong> -{" "}
                  <strong className="text-foreground font-semibold">{endIndex}</strong> de{" "}
                  <strong className="text-foreground font-semibold">{rows.length}</strong> movimientos
                  {rows.length !== (db.movements?.length || 0) && (
                    <span className="ml-1 text-muted-foreground">({db.movements?.length || 0} totales)</span>
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
