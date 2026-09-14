import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBio } from "@/lib/bioasset/store";
import { CATEGORIES, EQUIPMENT_STATUSES, type Equipment } from "@/lib/bioasset/types";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const BRAND_MODELS: Record<string, string[]> = {
  "Philips": ["IntelliVue MX400", "IntelliVue MX450", "Efficia CM100", "Epiq 7", "Sparq"],
  "Mindray": ["BeneVision N12", "BeneHeart D3", "PM-8000", "Resona 7", "SV300"],
  "Drager": ["Evita V500", "Savina 300", "Fabius Plus", "Infinity Delta"],
  "Zoll": ["R Series", "X Series", "AED Plus"],
  "B. Braun": ["Infusomat Space", "Perfusor Space"],
  "Baxter": ["Sigma Spectrum", "Colleague 3 CX"],
  "Puritan Bennett": ["980", "840"],
  "GE Healthcare": ["CARESCAPE B450", "Vivid T8", "MAC 2000", "LOGIQ E9"],
  "Nihon Kohden": ["Life Scope TR", "Cardiofax S"],
  "Medtronic": ["PB 980", "Lifepak 15"]
};

export function EquipmentDialog({
  equipment,
  trigger,
}: {
  equipment?: Equipment;
  trigger: ReactNode;
}) {
  const { db, addEquipment, updateEquipment, isAdmin, isBiomedico } = useBio();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const activeLocations = db.locations.filter((l) => l.activo);
  const [form, setForm] = useState({
    codigo: equipment?.codigo ?? `BIO-${String(db.equipment.length + 1).padStart(3, "0")}`,
    nombre: equipment?.nombre ?? "",
    categoria: equipment?.categoria ?? CATEGORIES[0],
    marca: equipment?.marca ?? "",
    modelo: equipment?.modelo ?? "",
    serie: equipment?.serie ?? "",
    ubicacionId: equipment?.ubicacionId ?? activeLocations[0]?.id ?? "",
    estado: equipment?.estado ?? "Operativo",
    fechaAdquisicion: equipment?.fechaAdquisicion ?? today(),
    proximoMantenimiento: equipment?.proximoMantenimiento ?? inDays(180),
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (equipment) {
      await updateEquipment(equipment.id, form as Partial<Equipment>);
      toast.success(`Equipo ${form.codigo} actualizado`);
    } else {
      const res = await addEquipment(form as Omit<Equipment, "id" | "activo">);
      toast.success(`Equipo ${form.codigo} registrado`);
      if (res && res.qrImage) {
        const a = document.createElement("a");
        a.href = res.qrImage;
        a.download = `qr_${form.codigo}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Descargando QR...");
      }
    }
    setConfirm(false);
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{equipment ? "Editar equipo" : "Registrar equipo"}</DialogTitle>
            <DialogDescription>
              Complete la informaciÃ³n del equipo biomÃ©dico.
            </DialogDescription>
          </DialogHeader>
          <form
            id="equipment-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setConfirm(true);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="codigo">CÃ³digo patrimonial</Label>
              <Input id="codigo" value={form.codigo} onChange={(e) => set("codigo", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del equipo</Label>
              <Input id="nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>CategorÃ­a</Label>
              <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Marca</Label>
                {(isAdmin || isBiomedico) && <MarcaDialog trigger={<span className="text-xs text-primary cursor-pointer hover:underline">Gestionar</span>} />}
              </div>
              <Select value={form.marca} onValueChange={(v) => { set("marca", v); set("modelo", ""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {db.marcas.map((m) => (
                    <SelectItem key={m.id} value={m.nombre}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={form.modelo} onValueChange={(v) => set("modelo", v)} disabled={!form.marca}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {(() => {
                    const m = db.marcas.find(x => x.nombre === form.marca);
                    if (!m) return null;
                    try {
                      const arr = JSON.parse(m.modelosJson) as string[];
                      return arr.map(modelo => (
                        <SelectItem key={modelo} value={modelo}>{modelo}</SelectItem>
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serie">NÃºmero de serie</Label>
              <Input id="serie" value={form.serie} onChange={(e) => set("serie", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>UbicaciÃ³n actual</Label>
              <Select value={form.ubicacionId} onValueChange={(v) => set("ubicacionId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(
                      activeLocations.reduce((acc, loc) => {
                        const s = loc.sede || "Sede Principal";
                        const p = loc.piso || "Piso 1";
                        const key = `${s} - ${p}`;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(loc);
                        return acc;
                      }, {} as Record<string, typeof activeLocations>)
                    ).map(([groupName, locs]) => (
                      <SelectGroup key={groupName}>
                        <SelectLabel>{groupName}</SelectLabel>
                        {locs.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adq">Fecha de adquisiciÃ³n</Label>
              <Input id="adq" type="date" value={form.fechaAdquisicion} onChange={(e) => set("fechaAdquisicion", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prox">PrÃ³ximo mantenimiento</Label>
              <Input id="prox" type="date" value={form.proximoMantenimiento} onChange={(e) => set("proximoMantenimiento", e.target.value)} required />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="equipment-form">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar registro</AlertDialogTitle>
            <AlertDialogDescription>
              Se guardarÃ¡ la informaciÃ³n del equipo {form.codigo} â€” {form.nombre}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={save}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function MovementDialog({
  equipoId,
  trigger,
}: {
  equipoId?: string;
  trigger: ReactNode;
}) {
  const { db, addMovement, equipmentById } = useBio();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [form, setForm] = useState({
    equipoId: equipoId ?? db.equipment[0]?.id ?? "",
    destinoId: "",
    motivo: "",
    observaciones: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const equipo = equipmentById(form.equipoId);

  const save = () => {
    if (!equipo || !form.destinoId) return;
    addMovement({
      equipoId: form.equipoId,
      origenId: equipo.ubicacionId,
      destinoId: form.destinoId,
      fecha: new Date().toISOString(),
      motivo: form.motivo,
      observaciones: form.observaciones,
    });
    toast.success("Traslado registrado y ubicaciÃ³n actualizada");
    setConfirm(false);
    setOpen(false);
    setForm((f) => ({ ...f, destinoId: "", motivo: "", observaciones: "" }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar movimiento</DialogTitle>
            <DialogDescription>
              La ubicaciÃ³n actual del equipo se actualizarÃ¡ automÃ¡ticamente.
            </DialogDescription>
          </DialogHeader>
          <form
            id="movement-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setConfirm(true);
            }}
          >
            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select value={form.equipoId} onValueChange={(v) => set("equipoId", v)} disabled={!!equipoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {db.equipment.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.codigo} â€” {e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>UbicaciÃ³n de origen</Label>
              <Input value={db.locations.find((l) => l.id === equipo?.ubicacionId)?.nombre ?? "â€”"} readOnly />
            </div>
            <div className="space-y-2">
              <Label>UbicaciÃ³n de destino</Label>
              <Select value={form.destinoId} onValueChange={(v) => set("destinoId", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccione destino" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(
                      db.locations
                        .filter((l) => l.activo && l.id !== equipo?.ubicacionId)
                        .reduce((acc, loc) => {
                          const s = loc.sede || "Sede Principal";
                          const p = loc.piso || "Piso 1";
                          const key = `${s} - ${p}`;
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(loc);
                          return acc;
                        }, {} as Record<string, typeof db.locations>)
                    ).map(([groupName, locs]) => (
                      <SelectGroup key={groupName}>
                        <SelectLabel>{groupName}</SelectLabel>
                        {locs.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del traslado</Label>
              <Input id="motivo" value={form.motivo} onChange={(e) => set("motivo", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observaciones</Label>
              <Textarea id="obs" value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="movement-form" disabled={!form.destinoId}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar traslado</AlertDialogTitle>
            <AlertDialogDescription>
              El equipo {equipo?.codigo} se moverÃ¡ a{" "}
              {db.locations.find((l) => l.id === form.destinoId)?.nombre}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={save}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function MaintenanceDialog({
  equipoId,
  trigger,
}: {
  equipoId?: string;
  trigger: ReactNode;
}) {
  const { db, addMaintenance, user, updateEquipment } = useBio();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [form, setForm] = useState({
    equipoId: equipoId ?? db.equipment[0]?.id ?? "",
    tipo: "Preventivo",
    fecha: today(),
    biomedicoId: user?.id ?? "u2",
    descripcion: "",
    resultado: "Conforme",
    observaciones: "",
    proximaFecha: inDays(180),
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    addMaintenance({
      equipoId: form.equipoId,
      tipo: form.tipo as "Preventivo" | "Correctivo",
      fecha: form.fecha,
      biomedicoId: form.biomedicoId,
      descripcion: form.descripcion,
      resultado: form.resultado,
      observaciones: form.observaciones,
      proximaFecha: form.proximaFecha,
    });
    updateEquipment(form.equipoId, { estado: "Operativo" });
    toast.success("Mantenimiento registrado y prÃ³xima fecha programada");
    setConfirm(false);
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar mantenimiento</DialogTitle>
            <DialogDescription>
              Registre el trabajo realizado y programe el prÃ³ximo mantenimiento.
            </DialogDescription>
          </DialogHeader>
          <form
            id="maintenance-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setConfirm(true);
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Equipo</Label>
              <Select value={form.equipoId} onValueChange={(v) => set("equipoId", v)} disabled={!!equipoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {db.equipment.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.codigo} â€” {e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de mantenimiento</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventivo">Preventivo</SelectItem>
                  <SelectItem value="Correctivo">Correctivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>BiomÃ©dico responsable</Label>
              <Select value={form.biomedicoId} onValueChange={(v) => set("biomedicoId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {db.users.filter((u) => u.activo).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="res">Resultado</Label>
              <Input id="res" value={form.resultado} onChange={(e) => set("resultado", e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="desc">DescripciÃ³n del trabajo realizado</Label>
              <Textarea id="desc" value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="mobs">Observaciones</Label>
              <Textarea id="mobs" value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prox2">PrÃ³xima fecha de mantenimiento</Label>
              <Input id="prox2" type="date" value={form.proximaFecha} onChange={(e) => set("proximaFecha", e.target.value)} required />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="maintenance-form">Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mantenimiento</AlertDialogTitle>
            <AlertDialogDescription>
              Se registrarÃ¡ el mantenimiento y se programarÃ¡ el prÃ³ximo para el{" "}
              {form.proximaFecha}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={save}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function MarcaDialog({ trigger }: { trigger: ReactNode }) {
  const { db, saveMarca, deleteMarca } = useBio();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [modelosText, setModelosText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setNombre(m.nombre);
    try { setModelosText(JSON.parse(m.modelosJson).join(", ")); } catch { setModelosText(""); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const arr = modelosText.split(",").map(s => s.trim()).filter(s => s);
    await saveMarca({ id: editingId ?? undefined, nombre, modelosJson: JSON.stringify(arr) });
    setEditingId(null);
    setNombre("");
    setModelosText("");
    toast.success("Marca guardada");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gestionar marcas y modelos</DialogTitle>
          <DialogDescription>
            Agregue o edite marcas y sus modelos asociados. Separe los modelos por comas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-md p-2 h-64 overflow-y-auto space-y-2">
            {db.marcas.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                <span className="font-medium">{m.nombre}</span>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(m); }}>
                    <Pencil className="size-3" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await deleteMarca(m.id);
                      toast.success("Marca eliminada");
                    } catch {
                      toast.error("Error al eliminar la marca");
                    }
                  }}>
                    <Trash className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSave} className="space-y-4 border rounded-md p-4">
            <h4 className="font-medium">{editingId ? "Editar marca" : "Nueva marca"}</h4>
            <div className="space-y-2">
              <Label>Nombre de la marca</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Modelos (separados por coma)</Label>
              <Textarea value={modelosText} onChange={e => setModelosText(e.target.value)} required rows={4} placeholder="Ej: MX400, MX450, Epiq 7" />
            </div>
            <div className="flex justify-end gap-2">
              {editingId && <Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(null); setNombre(""); setModelosText(""); }}>Cancelar</Button>}
              <Button type="submit" size="sm">Guardar</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function IncidentDialog({
  equipoId,
  trigger,
}: {
  equipoId: string;
  trigger: ReactNode;
}) {
  const { addIncident, updateEquipment } = useBio();
  const [open, setOpen] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState("");

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle) return;
    try {
      await addIncident({ activo_id: equipoId, titulo: incidentTitle, estado: "Pendiente" });
      await updateEquipment(equipoId, { estado: "Inoperativo" });
      setOpen(false);
      setIncidentTitle("");
      toast.success("Falla reportada correctamente");
    } catch(err) {
      console.error(err);
      toast.error("Error al reportar falla");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleReportIncident}>
          <DialogHeader>
            <DialogTitle>Reportar falla</DialogTitle>
            <DialogDescription>Describa el problema que presenta el equipo. El estado cambiará a Inoperativo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Descripción de la falla</Label>
              <Input value={incidentTitle} onChange={e => setIncidentTitle(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive">Reportar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
