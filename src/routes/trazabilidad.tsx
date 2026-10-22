import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Plus, Search, X } from "lucide-react";
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

function TrazabilidadPage() {
  const { db, locationName, userName, canEdit } = useBio();
  const [q, setQ] = useState("");
  const [ubi, setUbi] = useState("todas");

  const rows = useMemo(() => {
    return [...db.movements]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .filter((m) => {
        const e = db.equipment.find((x) => x.id === m.equipoId);
        if (!e) return false;

        const match =
          e.codigo.toLowerCase().includes(q.toLowerCase()) ||
          e.nombre.toLowerCase().includes(q.toLowerCase());

        const inUbi = ubi === "todas" || m.origenId === ubi || m.destinoId === ubi;

        return match && inUbi;
      });
  }, [db.movements, db.equipment, q, ubi]);

  const hasFilters = Boolean(q || ubi !== "todas");

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
              {rows.map((m) => {
                const e = db.equipment.find((x) => x.id === m.equipoId);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(m.fecha)}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/equipos/$id"
                        params={{ id: e ? encryptUrlParam(e.id) : "" }}
                        className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        {e?.codigo}
                      </Link>{" "}
                      <span className="text-muted-foreground">{e?.nombre}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className="text-muted-foreground font-normal">
                          {m.origenId ? locationName(m.origenId) : "Alta inicial"}
                        </span>
                        <ArrowRight className="size-3 text-primary shrink-0" />
                        <span className="text-primary font-semibold">{locationName(m.destinoId)}</span>
                      </span>
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
        </CardContent>
      </Card>
    </AppShell>
  );
}
