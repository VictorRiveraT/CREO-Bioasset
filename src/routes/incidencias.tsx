import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Wrench } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBio } from "@/lib/bioasset/store";
import { MaintenanceDialog } from "@/components/bioasset/dialogs";

export const Route = createFileRoute("/incidencias")({
  head: () => ({
    meta: [
      { title: "Incidencias | BIOASSET" },
      { name: "description", content: "Reporte y seguimiento de fallas de equipos" },
    ],
  }),
  component: IncidenciasPage,
});

function IncidenciasPage() {
  const { db, canEdit } = useBio();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...(db.incidents || [])].filter((i) => {
      const e = db.equipment.find((x) => x.id === i.activoId);
      if (!e) return false;
      return !term || `${e.codigo} ${e.nombre} ${i.titulo}`.toLowerCase().includes(term);
    });
  }, [db.incidents, db.equipment, q]);

  return (
    <AppShell title="Incidencias" description="Reporte y seguimiento de fallas de equipos">
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="grid gap-3 py-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por equipo o falla..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)] mt-4">
        <CardContent className="overflow-x-auto py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipo</TableHead>
                <TableHead>Problema Reportado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No hay incidencias registradas.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((i) => {
                  const e = db.equipment.find((x) => x.id === i.activoId)!;
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Link
                          to="/equipos/$id"
                          params={{ id: e.id }}
                          className="font-medium text-yellow-500 hover:underline"
                        >
                          {e.codigo}
                        </Link>{" "}
                        <span className="text-muted-foreground">{e.nombre}</span>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{i.titulo}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            i.estado === "Abierta"
                              ? "destructive"
                              : i.estado === "En revision"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {i.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit("mantenimiento") && i.estado !== "Cerrada" && (
                          <MaintenanceDialog
                            equipoId={e.id}
                            incidenciaId={i.id}
                            trigger={
                              <Button size="sm" variant="outline" className="gap-2">
                                <Wrench className="size-4" />
                                Reparar
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
