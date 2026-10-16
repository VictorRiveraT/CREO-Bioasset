import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Wrench, Plus, X, AlertCircle } from "lucide-react";
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
import { useBio } from "@/lib/bioasset/store";
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

function IncidenciasPage() {
  const { db, canEdit, locationName } = useBio();
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...(db.incidents || [])].filter((i) => {
      const e = db.equipment.find((x) => x.id === i.activoId);
      if (!e) return false;
      const matchTerm = !term || `${e.codigo} ${e.nombre} ${i.titulo}`.toLowerCase().includes(term);
      const matchEstado =
        estadoFilter === "todos" || i.estado.toLowerCase() === estadoFilter.toLowerCase();
      return matchTerm && matchEstado;
    });
  }, [db.incidents, db.equipment, q, estadoFilter]);

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
                rows.map((i) => {
                  const e = db.equipment.find((x) => x.id === i.activoId);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            to="/equipos/$id"
                            params={{ id: e ? encryptUrlParam(e.id) : "" }}
                            className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            {e?.codigo}
                          </Link>
                          <span className="text-xs text-muted-foreground">{e?.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {e ? locationName(e.ubicacionId) : "N/A"}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="text-sm">{i.titulo}</span>
                      </TableCell>
                      <TableCell>
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
        </CardContent>
      </Card>
    </AppShell>
  );
}
