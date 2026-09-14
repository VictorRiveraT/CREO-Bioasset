import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/bioasset/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBio } from "@/lib/bioasset/store";
import type { Location } from "@/lib/bioasset/types";

export const Route = createFileRoute("/ubicaciones")({
  head: () => ({
    meta: [
      { title: "Ubicaciones | BIOASSET" },
      {
        name: "description",
        content: "Catálogo de ubicaciones donde se encuentran los equipos biomédicos.",
      },
      { property: "og:title", content: "Ubicaciones | BIOASSET" },
      { property: "og:description", content: "Catálogo de áreas y servicios de la institución." },
    ],
  }),
  component: UbicacionesPage,
});

function SedeDialog({ trigger }: { trigger: React.ReactNode }) {
  const { saveLocation } = useBio();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [pisos, setPisos] = useState("1");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Sede</DialogTitle>
          <DialogDescription>Define una nueva sede y sus pisos iniciales.</DialogDescription>
        </DialogHeader>
        <form
          id="sede-form"
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const n = parseInt(pisos) || 1;
            for (let i = 1; i <= n; i++) {
              await saveLocation({
                id: undefined,
                nombre: "___EMPTY___",
                descripcion: "",
                activo: false,
                sede: nombre,
                piso: `Piso ${i}`,
              });
            }
            toast.success(`Sede creada con ${n} piso(s)`);
            setOpen(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="sede-nom">Nombre de la Sede</Label>
            <Input id="sede-nom" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Miraflores" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sede-pisos">Cantidad de pisos</Label>
            <Input id="sede-pisos" type="number" min="1" max="50" value={pisos} onChange={(e) => setPisos(e.target.value)} required />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" form="sede-form">Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocationDialog({ location, trigger, presetSede, presetPiso }: { location?: Location; trigger: React.ReactNode; presetSede?: string; presetPiso?: string }) {
  const { saveLocation } = useBio();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState(location?.nombre === "___EMPTY___" ? "" : (location?.nombre ?? ""));
  const [descripcion, setDescripcion] = useState(location?.descripcion ?? "");
  const [sede, setSede] = useState(location?.sede ?? presetSede ?? "Sede Principal");
  const [piso, setPiso] = useState(location?.piso ?? presetPiso ?? "Piso 1");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{location ? "Editar Área" : "Nueva Área / especialidad"}</DialogTitle>
          <DialogDescription>Áreas o servicios donde pueden estar los equipos.</DialogDescription>
        </DialogHeader>
        <form
          id="loc-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveLocation({
              id: location?.id,
              nombre,
              descripcion,
              activo: location?.activo ?? true,
              sede,
              piso,
            });
            toast.success(location ? "Área actualizada" : "Área creada");
            setOpen(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="nom">Nombre de área/especialidad</Label>
            <Input id="nom" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Urgencias" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descripción</Label>
            <Input id="desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" form="loc-form">Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UbicacionesPage() {
  const { db, canEdit, toggleLocation, deleteLocation } = useBio();

  // Group locations by Sede -> Piso
  const agrupado = db.locations.reduce((acc, loc) => {
    const s = loc.sede || "Sede Principal";
    const p = loc.piso || "Piso 1";
    if (!acc[s]) acc[s] = {};
    if (!acc[s][p]) acc[s][p] = [];
    acc[s][p].push(loc);
    return acc;
  }, {} as Record<string, Record<string, Location[]>>);

  return (
    <AppShell
      title="Ubicaciones"
      description="Catálogo estructurado por Sedes y Pisos"
      actions={
        canEdit("ubicaciones") ? (
          <SedeDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Nueva sede
              </Button>
            }
          />
        ) : null
      }
    >
      <div className="space-y-4">
        {Object.keys(agrupado).length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No hay sedes registradas.
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4" defaultValue={Object.keys(agrupado)}>
            {Object.entries(agrupado).map(([sedeName, pisos]) => (
              <AccordionItem key={sedeName} value={sedeName} className="border bg-card text-card-foreground shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 text-xl font-bold">
                    {sedeName}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 space-y-6">
                  <Accordion type="multiple" className="space-y-4" defaultValue={Object.keys(pisos)}>
                    {Object.entries(pisos)
                      .sort(([a], [b]) => {
                        const numA = parseInt(a.replace(/\D/g, '')) || 0;
                        const numB = parseInt(b.replace(/\D/g, '')) || 0;
                        return numA - numB;
                      })
                      .map(([pisoName, allLocs]) => {
                        const locs = allLocs.filter(l => l.nombre !== "___EMPTY___");
                        return (
                        <AccordionItem key={pisoName} value={pisoName} className="border border-border/50 rounded-md overflow-hidden">
                          <AccordionTrigger className="bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors">
                            <div className="font-semibold text-base">{pisoName}</div>
                          </AccordionTrigger>
                          <AccordionContent className="p-0">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="pl-4">Área / Especialidad</TableHead>
                                  <TableHead>Descripción</TableHead>
                                  <TableHead className="text-center w-24">Equipos</TableHead>
                                  <TableHead className="w-24">Estado</TableHead>
                                  {canEdit("ubicaciones") && <TableHead className="text-right w-40 pr-4">Acciones</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {locs.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={canEdit("ubicaciones") ? 5 : 4} className="text-center text-muted-foreground py-6">
                                      No hay áreas registradas en {pisoName.toLowerCase()}.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  locs.map((l) => {
                                    const eqCount = db.equipment.filter((e) => e.ubicacionId === l.id).length;
                                    return (
                                    <TableRow key={l.id}>
                                      <TableCell className="font-medium pl-4">{l.nombre}</TableCell>
                                      <TableCell className="text-muted-foreground">{l.descripcion}</TableCell>
                                      <TableCell className="text-center font-mono">
                                        {eqCount}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className={
                                            l.activo
                                              ? "border-success/30 bg-success/15 text-success"
                                              : "border-border bg-muted text-muted-foreground"
                                          }
                                        >
                                          {l.activo ? "Activa" : "Inactiva"}
                                        </Badge>
                                      </TableCell>
                                      {canEdit("ubicaciones") && (
                                        <TableCell className="space-x-2 text-right pr-4">
                                          <LocationDialog
                                            location={l}
                                            trigger={<Button variant="outline" size="sm">Editar</Button>}
                                          />
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="sm" className="text-destructive">
                                                Eliminar
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  {eqCount > 0 ? (
                                                    <span className="text-destructive font-medium">No se puede eliminar porque hay {eqCount} equipos asignados a esta área.</span>
                                                  ) : (
                                                    `Se eliminará permanentemente el área "${l.nombre}".`
                                                  )}
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                  disabled={eqCount > 0}
                                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  onClick={async () => {
                                                    try {
                                                      await deleteLocation(l.id);
                                                      toast.success("Área eliminada");
                                                    } catch {
                                                      toast.error("Error al eliminar");
                                                    }
                                                  }}
                                                >
                                                  Eliminar
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  )})
                                )}
                              </TableBody>
                            </Table>
                            {canEdit("ubicaciones") && (
                              <div className="p-3 border-t border-border/50 bg-muted/10 flex justify-end">
                                <LocationDialog
                                  presetSede={sedeName}
                                  presetPiso={pisoName}
                                  trigger={
                                    <Button variant="outline" size="sm" className="h-8">
                                      <Plus className="mr-2 size-3" /> Añadir Área
                                    </Button>
                                  }
                                />
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      )})}
                      </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </AppShell>
    );
  }
