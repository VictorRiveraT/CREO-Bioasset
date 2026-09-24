import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { MaintenanceDialog } from "@/components/bioasset/dialogs";
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
  const { db, userName, canEdit } = useBio();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("todos");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...db.maintenance]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .filter((m) => {
        const e = db.equipment.find((x) => x.id === m.equipoId);
        if (!e) return false;
        const match = !term || `${e.codigo} ${e.nombre}`.toLowerCase().includes(term);
        const inTipo = tipo === "todos" || m.tipo === tipo;
        return match && inTipo;
      });
  }, [db.maintenance, db.equipment, q, tipo]);

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
              <SelectItem value="Preventivo">Preventivo</SelectItem>
              <SelectItem value="Correctivo">Correctivo</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="overflow-x-auto py-4">
          <Table>
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
                const e = db.equipment.find((x) => x.id === m.equipoId)!;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(m.fecha)}
                    </TableCell>
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
                    <TableCell>
                      <Badge variant={m.tipo === "Correctivo" ? "destructive" : "secondary"}>
                        {m.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{userName(m.biomedicoId)}</TableCell>
                    <TableCell className="max-w-sm text-muted-foreground flex flex-col gap-1">
                      <span>{m.descripcion}</span>
                      {m.archivoBase64 && (
                        <a href={m.archivoBase64} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                          📎 Ver Formato
                        </a>
                      )}
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
                            <Button size="sm" variant={m.resultado === "En progreso" ? "default" : "outline"}>
                              {m.resultado === "En progreso" ? "Completar" : "Editar"}
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
