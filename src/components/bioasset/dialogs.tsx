import { useState, useEffect, useMemo, type ReactNode } from "react";

import { toast } from "sonner";

import { Pencil, Trash, Download, Camera, ImagePlus, Eye, Trash2, FileText, ExternalLink, X, Receipt, HeartPulse, Laptop, Sparkles, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

import { generateMaintenancePDF } from "@/lib/bioasset/pdf-generator";
import { ImagePreviewDialog } from "./image-preview-dialog";

import {
  CATEGORIES,
  EQUIPMENT_STATUSES,
  type Equipment,
  type MaintenanceRecord,
} from "@/lib/bioasset/types";

const today = () => new Date().toISOString().slice(0, 10);

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function compressImage(file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

const BRAND_MODELS: Record<string, string[]> = {
  Philips: ["IntelliVue MX400", "IntelliVue MX450", "Efficia CM100", "Epiq 7", "Sparq"],

  Mindray: ["BeneVision N12", "BeneHeart D3", "PM-8000", "Resona 7", "SV300"],

  Drager: ["Evita V500", "Savina 300", "Fabius Plus", "Infinity Delta"],

  Zoll: ["R Series", "X Series", "AED Plus"],

  "B. Braun": ["Infusomat Space", "Perfusor Space"],

  Baxter: ["Sigma Spectrum", "Colleague 3 CX"],

  "Puritan Bennett": ["980", "840"],

  "GE Healthcare": ["CARESCAPE B450", "Vivid T8", "MAC 2000", "LOGIQ E9"],

  "Nihon Kohden": ["Life Scope TR", "Cardiofax S"],

  Medtronic: ["PB 980", "Lifepak 15"],
};

export function EquipmentDialog({
  equipment,

  trigger,
}: {
  equipment?: Equipment;

  trigger: ReactNode;
}) {
  const { db, addEquipment, updateEquipment, isAdmin, isBiomedico, categorias, estadosEquipo } = useBio();

  const [open, setOpen] = useState(false);

  const [confirm, setConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeLocations = db.locations.filter((l) => l.activo);

  const defaultClase = (equipment?.claseActivo ?? (equipment?.codigo?.startsWith("TI-") ? "Tecnologico" : "Biomedico")) as "Biomedico" | "Tecnologico";
  const defaultCodigo = equipment?.codigo ?? (defaultClase === "Tecnologico" 
    ? `TI-${String(db.equipment.filter(e => e.codigo?.startsWith("TI-")).length + 1).padStart(3, "0")}`
    : `BM-${String(db.equipment.filter(e => !e.codigo?.startsWith("TI-")).length + 1).padStart(3, "0")}`);

  const [form, setForm] = useState({
    claseActivo: defaultClase,
    codigo: defaultCodigo,
    nombre: equipment?.nombre ?? "",
    categoria: equipment?.categoria ?? (categorias[0] || "Diagnóstico por imagen"),
    marca: equipment?.marca ?? "",
    modelo: equipment?.modelo ?? "",
    serie: equipment?.serie ?? "",
    ubicacionId: equipment?.ubicacionId ?? activeLocations[0]?.id ?? "",
    estado: equipment?.estado ?? "Operativo",
    fechaAdquisicion: equipment?.fechaAdquisicion ?? today(),
    proximoMantenimiento: equipment?.proximoMantenimiento ?? inDays(180),
  });

  useEffect(() => {
    if (open) {
      const openClase = (equipment?.claseActivo ?? (equipment?.codigo?.startsWith("TI-") ? "Tecnologico" : "Biomedico")) as "Biomedico" | "Tecnologico";
      const openCodigo = equipment?.codigo ?? (openClase === "Tecnologico"
        ? `TI-${String(db.equipment.filter(e => e.codigo?.startsWith("TI-")).length + 1).padStart(3, "0")}`
        : `BM-${String(db.equipment.filter(e => !e.codigo?.startsWith("TI-")).length + 1).padStart(3, "0")}`);

      setForm({
        claseActivo: openClase,
        codigo: openCodigo,
        nombre: equipment?.nombre ?? "",
        categoria: equipment?.categoria ?? (categorias[0] || "Diagnóstico por imagen"),
        marca: equipment?.marca ?? "",
        modelo: equipment?.modelo ?? "",
        serie: equipment?.serie ?? "",
        ubicacionId: equipment?.ubicacionId ?? activeLocations[0]?.id ?? "",
        estado: equipment?.estado ?? "Operativo",
        fechaAdquisicion: equipment?.fechaAdquisicion ?? today(),
        proximoMantenimiento: equipment?.proximoMantenimiento ?? inDays(180),
      });
    }
  }, [open, equipment, db.equipment.length, activeLocations[0]?.id]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
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
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el equipo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>

        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{equipment ? "Editar equipo" : "Registrar equipo"}</DialogTitle>

            <DialogDescription>Complete la información del equipo biomédico.</DialogDescription>
          </DialogHeader>

          <form
            id="equipment-form"

            className="grid gap-4 sm:grid-cols-2"

            onSubmit={(e) => {
              e.preventDefault();
              if (!equipment) {
                const normCod = form.codigo.trim().toLowerCase();
                const existsCod = db.equipment.some(
                  (eq) => (eq.codigo || "").trim().toLowerCase() === normCod,
                );
                if (existsCod) {
                  toast.error(`El código patrimonial "${form.codigo}" ya se encuentra registrado.`);
                  return;
                }
                const normSerie = form.serie.trim().toLowerCase();
                if (normSerie) {
                  const existsSerie = db.equipment.some(
                    (eq) => (eq.serie || "").trim().toLowerCase() === normSerie,
                  );
                  if (existsSerie) {
                    toast.error(`El número de serie "${form.serie}" ya está registrado en otro equipo.`);
                    return;
                  }
                }
              }
              setConfirm(true);
            }}
          >
            {/* SUGERENCIA 6: Códigos patrimoniales distintos para Tecnológicos y Biomédicos */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Clase de Activo Patrimonial</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    set("claseActivo", "Biomedico");
                    if (!equipment) {
                      const count = db.equipment.filter((e) => !e.codigo?.startsWith("TI-")).length + 1;
                      set("codigo", `BM-${String(count).padStart(3, "0")}`);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                    form.claseActivo === "Biomedico"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/60 text-muted-foreground border-border"
                  }`}
                >
                  <HeartPulse className="size-4" />
                  <span>Equipo Biomédico (BM-)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    set("claseActivo", "Tecnologico");
                    if (!equipment) {
                      const count = db.equipment.filter((e) => e.codigo?.startsWith("TI-")).length + 1;
                      set("codigo", `TI-${String(count).padStart(3, "0")}`);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                    form.claseActivo === "Tecnologico"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/60 text-muted-foreground border-border"
                  }`}
                >
                  <Laptop className="size-4" />
                  <span>Equipo Tecnológico / TI (TI-)</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Código patrimonial</Label>

              <Input
                id="codigo"

                value={form.codigo}

                onChange={(e) => set("codigo", e.target.value)}

                disabled={!!equipment}

                required
              />
              {equipment && (
                <p className="text-[11px] text-muted-foreground">
                  El código patrimonial es identificador único y no puede editarse.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del equipo</Label>

              <Input
                id="nombre"

                value={form.nombre}

                onChange={(e) => set("nombre", e.target.value)}

                required
              />
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>

              <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {Array.from(new Set([...categorias, ...(form.categoria ? [form.categoria] : [])])).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>

              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {Array.from(new Set([...estadosEquipo, ...(form.estado ? [form.estado] : [])])).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marca</Label>

              <Select
                value={form.marca}

                onValueChange={(v) => {
                  set("marca", v);

                  set("modelo", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>

                <SelectContent>
                  {(db.marcas || []).map((m) => (
                    <SelectItem key={m.id} value={m.nombre}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>

              <Select
                value={form.modelo}

                onValueChange={(v) => set("modelo", v)}

                disabled={!form.marca}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>

                <SelectContent>
                  {(() => {
                    const m = (db.marcas || []).find((x) => x.nombre === form.marca);

                    if (!m) return null;

                    try {
                      const arr = JSON.parse(m.modelosJson) as string[];

                      return arr.map((modelo) => (
                        <SelectItem key={modelo} value={modelo}>
                          {modelo}
                        </SelectItem>
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serie">Número de serie</Label>

              <Input
                id="serie"

                value={form.serie}

                onChange={(e) => set("serie", e.target.value)}

                required
              />
            </div>

            <div className="space-y-2">
              <Label>Ubicación actual</Label>

              <Select value={form.ubicacionId} onValueChange={(v) => set("ubicacionId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {Object.entries(
                    activeLocations.reduce(
                      (acc, loc) => {
                        const s = loc.sede || "Sede Principal";

                        const p = loc.piso || "Piso 1";

                        const key = `${s} - ${p}`;

                        if (!acc[key]) acc[key] = [];

                        acc[key].push(loc);

                        return acc;
                      },

                      {} as Record<string, typeof activeLocations>,
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="adq">Fecha de adquisición</Label>

              <Input
                id="adq"

                type="date"

                value={form.fechaAdquisicion}

                onChange={(e) => set("fechaAdquisicion", e.target.value)}

                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prox">Próximo mantenimiento</Label>

              <Input
                id="prox"

                type="date"

                value={form.proximoMantenimiento}

                onChange={(e) => set("proximoMantenimiento", e.target.value)}

                required
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>

            <Button type="submit" form="equipment-form">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar registro</AlertDialogTitle>

            <AlertDialogDescription>
              Se guardará la información del equipo {form.codigo} â€” {form.nombre}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>

            <AlertDialogAction onClick={save} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function MovementDialog({ equipoId, trigger }: { equipoId?: string; trigger: ReactNode }) {
  const { db, addMovement, equipmentById, motivosTraslado } = useBio();

  const [open, setOpen] = useState(false);

  const [confirm, setConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    equipoId: equipoId ?? db.equipment[0]?.id ?? "",
    destinoId: "",
    motivo: motivosTraslado[0] ?? "",
    observaciones: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        equipoId: equipoId ?? db.equipment[0]?.id ?? "",
        destinoId: "",
        motivo: motivosTraslado[0] ?? "",
        observaciones: "",
      });
    }
  }, [open, equipoId, db.equipment[0]?.id]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const equipo = equipmentById(form.equipoId);

  const save = async () => {
    if (isSubmitting) return;
    if (!equipo || !form.destinoId) return;

    setIsSubmitting(true);
    try {
      await addMovement({
        equipoId: form.equipoId,

        origenId: equipo.ubicacionId,

        destinoId: form.destinoId,

        fecha: new Date().toISOString(),

        motivo: form.motivo,

        observaciones: form.observaciones,
      });

      toast.success("Traslado registrado y ubicación actualizada");

      setConfirm(false);

      setOpen(false);

      setForm((f) => ({ ...f, destinoId: "", motivo: "", observaciones: "" }));
    } catch (err: any) {
      toast.error(err?.message || "Error al registrar traslado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>

        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar movimiento</DialogTitle>

            <DialogDescription>
              La ubicación actual del equipo se actualizará automáticamente.
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

              <Select
                value={form.equipoId}

                onValueChange={(v) => set("equipoId", v)}

                disabled={!!equipoId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {db.equipment.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.codigo} â€” {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ubicación de origen</Label>

              <Input
                value={db.locations.find((l) => l.id === equipo?.ubicacionId)?.nombre ?? "â€”"}

                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label>Ubicación de destino</Label>

              <Select value={form.destinoId} onValueChange={(v) => set("destinoId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione destino" />
                </SelectTrigger>

                <SelectContent>
                  {Object.entries(
                    db.locations

                      .filter((l) => l.activo && l.id !== equipo?.ubicacionId)

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
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del traslado</Label>

              <Select value={form.motivo} onValueChange={(v) => set("motivo", v)}>
                <SelectTrigger id="motivo">
                  <SelectValue placeholder="Seleccione motivo de traslado" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([...motivosTraslado, ...(form.motivo ? [form.motivo] : [])])).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observaciones</Label>

              <Textarea
                id="obs"

                value={form.observaciones}

                onChange={(e) => set("observaciones", e.target.value)}
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>

            <Button type="submit" form="movement-form" disabled={!form.destinoId}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar traslado</AlertDialogTitle>

            <AlertDialogDescription>
              El equipo {equipo?.codigo} se moverá a{" "}
              {db.locations.find((l) => l.id === form.destinoId)?.nombre}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>

            <AlertDialogAction onClick={save} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function MaintenanceDialog({
  equipoId,

  incidenciaId,

  maintenance,

  trigger,
}: {
  equipoId?: string;

  incidenciaId?: string;

  maintenance?: MaintenanceRecord;

  trigger: ReactNode;
}) {
  const { db, addMaintenance, updateMaintenance, user, updateEquipment, updateIncident, tiposMantenimiento, resultadosMantenimiento, fallasFrecuentes } = useBio();

  const [open, setOpen] = useState(false);

  const [confirm, setConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set initial state. If we have a maintenance record, use its values.

  // Try to parse structured data

  let initObs = maintenance?.observaciones ?? "";

  let pReportada = "";

  let pAcciones = "";

  let pRecom = "";
  let initFotos: string[] = [];

  try {
    const parsed = JSON.parse(initObs);

    if (parsed && typeof parsed === "object") {
      initObs = parsed.causas || "";

      pReportada = parsed.perturbacion || "";

      pAcciones = parsed.acciones || "";

      pRecom = parsed.recomendaciones || "";

      if (Array.isArray(parsed.fotos)) {
        initFotos = parsed.fotos.filter((f: any) => typeof f === "string" && f.length > 0);
      }
    }
  } catch {
    // Ignorar si observaciones no es JSON estructurado
  }

  if (
    maintenance?.archivoBase64 &&
    !maintenance.archivoBase64.endsWith(".pdf") &&
    !maintenance.archivoBase64.includes("application/pdf") &&
    !initFotos.includes(maintenance.archivoBase64)
  ) {
    initFotos.unshift(maintenance.archivoBase64);
  }

  const [form, setForm] = useState({
    equipoId: maintenance?.equipoId ?? equipoId ?? db.equipment[0]?.id ?? "",
    tipo: maintenance?.tipo ?? (incidenciaId ? "Correctivo" : "Preventivo"),
    fecha: maintenance?.fecha ?? today(),
    biomedicoId: maintenance?.biomedicoId ?? user?.id ?? "",
    resultado: maintenance?.resultado ?? "En progreso",
    observaciones: initObs,
    perturbacion: pReportada,
    acciones: pAcciones,
    recomendaciones: pRecom,
    proximaFecha: maintenance?.proximaFecha ?? inDays(180),
    archivoBase64: maintenance?.archivoBase64 ?? "",
    fotos: initFotos,
  });

  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  // Sugerencia 4: Cotizaciones de repuestos y mano de obra
  const [cotizacion, setCotizacion] = useState<{
    repuestos: { descripcion: string; cantidad: number; precioUnitario: number; total: number; proveedor: string }[];
    manoDeObra: number;
    contratista: string;
    totalGeneral: number;
    estadoCotizacion: "Pendiente" | "Aprobada" | "Rechazada";
  }>({
    repuestos: [],
    manoDeObra: 0,
    contratista: "",
    totalGeneral: 0,
    estadoCotizacion: "Pendiente",
  });

  useEffect(() => {
    if (open) {
      let obs = maintenance?.observaciones ?? "";
      let pReport = "";
      let pAcc = "";
      let pRec = "";
      let fts: string[] = [];
      try {
        const parsed = JSON.parse(obs);
        if (parsed && typeof parsed === "object") {
          obs = parsed.causas || "";
          pReport = parsed.perturbacion || "";
          pAcc = parsed.acciones || "";
          pRec = parsed.recomendaciones || "";
          if (Array.isArray(parsed.fotos)) {
            fts = parsed.fotos.filter((f: any) => typeof f === "string" && f.length > 0);
          }
          if (parsed.cotizacion && typeof parsed.cotizacion === "object") {
            setCotizacion({
              repuestos: Array.isArray(parsed.cotizacion.repuestos) ? parsed.cotizacion.repuestos : [],
              manoDeObra: Number(parsed.cotizacion.manoDeObra) || 0,
              contratista: parsed.cotizacion.contratista || "",
              totalGeneral: Number(parsed.cotizacion.totalGeneral) || 0,
              estadoCotizacion: parsed.cotizacion.estadoCotizacion || "Pendiente",
            });
          } else {
            setCotizacion({ repuestos: [], manoDeObra: 0, contratista: "", totalGeneral: 0, estadoCotizacion: "Pendiente" });
          }
        }
      } catch {
        // Ignorar si observaciones no es JSON estructurado
      }

      if (
        maintenance?.archivoBase64 &&
        !maintenance.archivoBase64.endsWith(".pdf") &&
        !maintenance.archivoBase64.includes("application/pdf") &&
        !fts.includes(maintenance.archivoBase64)
      ) {
        fts.unshift(maintenance.archivoBase64);
      }

      setForm({
        equipoId: maintenance?.equipoId ?? equipoId ?? db.equipment[0]?.id ?? "",
        tipo: maintenance?.tipo ?? (incidenciaId ? "Correctivo" : "Preventivo"),
        fecha: maintenance?.fecha ?? today(),
        biomedicoId: maintenance?.biomedicoId ?? user?.id ?? "",
        resultado: maintenance?.resultado ?? "En progreso",
        observaciones: obs,
        perturbacion: pReport,
        acciones: pAcc,
        recomendaciones: pRec,
        proximaFecha: maintenance?.proximaFecha ?? inDays(180),
        archivoBase64: maintenance?.archivoBase64 ?? "",
        fotos: fts,
      });
      setFileError("");
    }
  }, [open, maintenance, equipoId, incidenciaId, user?.id, db.equipment[0]?.id]);

  const [fileError, setFileError] = useState("");
  const [showAllFallas, setShowAllFallas] = useState(false);

  const targetEquipo = useMemo(() => {
    return db.equipment.find((e) => e.id === form.equipoId);
  }, [db.equipment, form.equipoId]);

  const matchingFallas = useMemo(() => {
    if (!fallasFrecuentes || fallasFrecuentes.length === 0) return [];
    if (!targetEquipo || showAllFallas) return fallasFrecuentes;

    const eqCat = (targetEquipo.categoria || "").trim().toLowerCase();
    const eqMarca = (targetEquipo.marca || "").trim().toLowerCase();
    const eqMod = (targetEquipo.modelo || "").trim().toLowerCase();

    return fallasFrecuentes
      .filter((f) => {
        const fCat = (f.categoria || "Todas").trim().toLowerCase();
        const fMarca = (f.marca || "Todas").trim().toLowerCase();
        const fMod = (f.modelo || "Todos").trim().toLowerCase();

        const catMatches = fCat === "todas" || !fCat || (eqCat && fCat === eqCat);
        const marcaMatches = fMarca === "todas" || !fMarca || (eqMarca && fMarca === eqMarca);
        const modMatches = fMod === "todos" || !fMod || (eqMod && fMod === eqMod);

        return catMatches && marcaMatches && modMatches;
      })
      .sort((a, b) => {
        const aScore = (a.modelo && a.modelo !== "Todos" ? 4 : 0) + (a.marca && a.marca !== "Todas" ? 2 : 0) + (a.categoria && a.categoria !== "Todas" ? 1 : 0);
        const bScore = (b.modelo && b.modelo !== "Todos" ? 4 : 0) + (b.marca && b.marca !== "Todas" ? 2 : 0) + (b.categoria && b.categoria !== "Todas" ? 1 : 0);
        return bScore - aScore;
      });
  }, [fallasFrecuentes, targetEquipo, showAllFallas]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhotos(true);
    setFileError("");
    try {
      const newPhotos: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`La imagen ${file.name} supera los 15MB.`);
          continue;
        }
        const compressed = await compressImage(file);
        if (compressed) {
          newPhotos.push(compressed);
        }
      }
      if (newPhotos.length > 0) {
        setForm((prev) => ({
          ...prev,
          fotos: [...prev.fotos, ...newPhotos],
          archivoBase64: prev.archivoBase64 || newPhotos[0] || "",
        }));
        toast.success(`${newPhotos.length} foto(s) agregada(s) como evidencia.`);
      }
    } catch {
      toast.error("Error al procesar las fotos.");
    } finally {
      setIsProcessingPhotos(false);
      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setForm((prev) => {
      const updated = prev.fotos.filter((_, i) => i !== index);
      return {
        ...prev,
        fotos: updated,
        archivoBase64: prev.archivoBase64 === prev.fotos[index] ? (updated[0] || "") : prev.archivoBase64,
      };
    });
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFileError("El documento es demasiado grande. Máximo 10MB.");
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      set("archivoBase64", reader.result as string);
      toast.success("Documento o protocolo adjuntado exitosamente.");
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        equipoId: form.equipoId,

        tipo: form.tipo as "Preventivo" | "Correctivo",

        fecha: form.fecha,

        biomedicoId: form.biomedicoId,

        descripcion: "Formato técnico detallado",

        resultado: form.resultado,

        costo: cotizacion.totalGeneral > 0 ? cotizacion.totalGeneral : undefined,
        proveedor: cotizacion.contratista || undefined,
        observaciones: JSON.stringify({
          causas: form.observaciones,
          perturbacion: form.perturbacion,
          acciones: form.acciones,
          recomendaciones: form.recomendaciones,
          fotos: form.fotos,
          cotizacion: cotizacion.totalGeneral > 0 || cotizacion.repuestos.length > 0 ? cotizacion : undefined,
        }),

        proximaFecha: form.proximaFecha,

        archivoBase64: form.archivoBase64 || (form.fotos.length > 0 ? form.fotos[0] : ""),

        incidenciaId: incidenciaId || maintenance?.incidenciaId || undefined,
      };

      if (maintenance) {
        await updateMaintenance(maintenance.id, payload);
      } else {
        await addMaintenance(payload);
      }

      // Update equipment based on resultado

      if (form.resultado === "Completado") {
        await updateEquipment(form.equipoId, { estado: "Operativo" });
      } else if (form.resultado === "De baja") {
        await updateEquipment(form.equipoId, { estado: "De baja" });
      } else if (form.resultado === "En progreso") {
        await updateEquipment(form.equipoId, { estado: "En mantenimiento" });
      }

      // Update incident if applicable

      const tiedIncident = incidenciaId ?? maintenance?.incidenciaId;

      if (tiedIncident) {
        if (form.resultado === "Completado" || form.resultado === "De baja") {
          await updateIncident(tiedIncident, { estado: "Cerrada" });
        } else if (form.resultado === "En progreso") {
          await updateIncident(tiedIncident, { estado: "En revision" });
        }
      }

      toast.success("Registro de mantenimiento actualizado");

      setConfirm(false);

      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Error al registrar mantenimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>

        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {maintenance ? "Actualizar mantenimiento" : "Registrar mantenimiento"}
            </DialogTitle>

            <DialogDescription>
              {form.resultado === "En progreso"
                ? "Inicie el trabajo de mantenimiento."
                : "Adjunte el formato oficial físico (foto o PDF) para completar el registro."}
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

              <Select
                value={form.equipoId}

                onValueChange={(v) => set("equipoId", v)}

                disabled={!!equipoId || !!maintenance}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {db.equipment.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.codigo} — {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado del Mantenimiento</Label>

              <Select value={form.resultado} onValueChange={(v) => set("resultado", v)}>
                <SelectTrigger className="font-semibold text-primary">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {Array.from(new Set([
                    ...resultadosMantenimiento,
                    "En progreso",
                    "Completado",
                    "De baja",
                    ...(form.resultado ? [form.resultado] : []),
                  ])).map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de mantenimiento</Label>

              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {Array.from(new Set([
                    ...tiposMantenimiento,
                    "Preventivo",
                    "Correctivo",
                    ...(form.tipo ? [form.tipo] : []),
                  ])).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha de ejecución</Label>

              <Input
                id="fecha"

                type="date"

                value={form.fecha}

                onChange={(e) => set("fecha", e.target.value)}

                required
              />
            </div>

            <div className="space-y-4 sm:col-span-2 p-4 border rounded-xl bg-card shadow-sm">
              <h4 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Informe Técnico Oficial (CREO+)
              </h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Perturbación / Falla Reportada</Label>
                  <div className="flex items-center gap-2 text-[11px]">
                    {targetEquipo && (
                      <button
                        type="button"
                        onClick={() => setShowAllFallas(!showAllFallas)}
                        className="text-primary hover:underline font-medium cursor-pointer"
                      >
                        {showAllFallas ? "Filtrar por este equipo" : "Ver todo el catálogo"}
                      </button>
                    )}
                  </div>
                </div>

                {matchingFallas && matchingFallas.length > 0 && (
                  <div className="space-y-1">
                    {targetEquipo && !showAllFallas && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Sparkles className="size-3 text-amber-500 shrink-0" />
                        <span>Fallas sugeridas para:</span>
                        <span className="font-semibold text-foreground">
                          {targetEquipo.categoria || "Equipo"}
                          {targetEquipo.marca ? ` · ${targetEquipo.marca}` : ""}
                          {targetEquipo.modelo ? ` (${targetEquipo.modelo})` : ""}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-muted/20 rounded-md border border-border/50">
                      {matchingFallas.map((f, i) => (
                        <button
                          key={i}
                          type="button"
                          title={f.detalle || f.descripcion || f.valor}
                          onClick={() => {
                            set("perturbacion", form.perturbacion ? `${form.perturbacion}. ${f.valor}` : f.valor);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary text-secondary-foreground border border-border/70 transition-colors cursor-pointer text-left flex items-center gap-1"
                        >
                          <span>+ {f.valor}</span>
                          {(f.marca && f.marca !== "Todas" || f.modelo && f.modelo !== "Todos") && (
                            <span className="text-[9px] text-muted-foreground font-mono bg-background/80 px-1 rounded">
                              {f.marca && f.marca !== "Todas" ? f.marca : ""} {f.modelo && f.modelo !== "Todos" ? f.modelo : ""}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Input
                  placeholder="Detalle breve de la falla o seleccione del catálogo superior"
                  value={form.perturbacion}
                  onChange={(e) => set("perturbacion", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>A. Causas / Observaciones</Label>

                <Textarea
                  rows={2}

                  placeholder="Detalle las causas o observaciones encontradas..."

                  value={form.observaciones}

                  onChange={(e) => set("observaciones", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>B. Acciones inmediatas tomadas</Label>

                <Textarea
                  rows={2}

                  placeholder="Qué acciones se tomaron para resolver el problema..."

                  value={form.acciones}

                  onChange={(e) => set("acciones", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>C. Recomendaciones futuras / Acciones correctivas</Label>

                <Textarea
                  rows={2}

                  placeholder="Recomendaciones para evitar futuras fallas..."

                  value={form.recomendaciones}

                  onChange={(e) => set("recomendaciones", e.target.value)}
                />
              </div>

              {/* SECCIÓN D: FOTOGRAFÍAS Y EVIDENCIAS */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Camera className="size-5" />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm sm:text-base">
                        D. Evidencias Fotográficas
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Sube fotos del equipo, piezas dañadas o proceso de intervención.
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="foto-evidencia-input"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <ImagePlus className="size-4" />
                      <span>{form.fotos.length > 0 ? "Agregar más fotos" : "Subir fotos"}</span>
                    </Label>
                    <input
                      id="foto-evidencia-input"
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotosChange}
                      disabled={isProcessingPhotos}
                    />
                  </div>
                </div>

                {isProcessingPhotos && (
                  <p className="text-xs text-primary animate-pulse">
                    Optimizando y cargando fotografías...
                  </p>
                )}

                {/* Galería de miniaturas de evidencia */}
                {form.fotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
                    {form.fotos.map((foto, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-lg border overflow-hidden aspect-square bg-muted/40 shadow-xs hover:shadow-md transition-all cursor-pointer ring-1 ring-border/50 hover:ring-primary/50"
                        onClick={() => setPreviewFoto(foto)}
                      >
                        <img
                          src={foto}
                          alt={`Evidencia ${idx + 1}`}
                          className="w-full h-full object-cover select-none"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none z-10">
                          #{idx + 1}
                        </span>
                        <div className="absolute top-1 right-1 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removePhoto(idx);
                            }}
                            className="p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-transform hover:scale-110 shadow cursor-pointer flex items-center justify-center"
                            title="Eliminar foto"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <div className="absolute bottom-1 right-1 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPreviewFoto(foto);
                            }}
                            className="p-1 rounded-full bg-black/75 text-white hover:bg-black transition-transform hover:scale-110 shadow cursor-pointer flex items-center gap-1 text-[10px] px-1.5"
                            title="Ver en grande"
                          >
                            <Eye className="size-3" />
                            <span className="text-[10px]">Ver</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground bg-muted/10">
                    <Camera className="size-7 mx-auto mb-1.5 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">Sin fotografías adjuntas</p>
                    <p className="mt-0.5 text-[11px]">
                      Puedes tomar fotos desde la cámara de tu celular o seleccionarlas desde tu galería/computadora.
                    </p>
                  </div>
                )}
              </div>

              {/* SUGERENCIA 3: Documento o protocolo (PDF, Word, Excel para contratistas y reportes) */}
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pdf-protocolo" className="text-xs font-semibold text-muted-foreground">
                    Documentos o Informes de Contratistas (PDF, Word, Excel)
                  </Label>
                  {form.archivoBase64 && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Documento adjunto cargado
                    </span>
                  )}
                </div>
                <Input
                  id="pdf-protocolo"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handlePdfChange}
                  className="text-xs h-9 cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">
                  Formatos admitidos: Protocolos en PDF, cotizaciones/métricas en Excel (.xlsx) o reportes técnicos de contratistas en Word (.docx) hasta 15MB.
                </p>
                {maintenance?.archivoBase64 && (
                  <div className="mt-1">
                    <a
                      href={maintenance.archivoBase64}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 bg-primary/10 px-2 py-1 rounded"
                    >
                      <FileText className="size-3" /> Ver / Descargar documento o formato adjunto actual
                    </a>
                  </div>
                )}
                {fileError && <p className="text-xs text-destructive">{fileError}</p>}
              </div>
            </div>

            {/* SUGERENCIA 4: COTIZACIÓN DE REPUESTOS Y MANO DE OBRA */}
            <div className="space-y-3 sm:col-span-2 p-4 border rounded-xl bg-card shadow-2xs">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="size-5 text-amber-500" />
                  <div>
                    <h4 className="font-semibold text-sm">Cotización de Repuestos y Mano de Obra</h4>
                    <p className="text-xs text-muted-foreground">
                      Costos de intervención, cotizaciones internas o de contratistas
                    </p>
                  </div>
                </div>
                <Badge variant={cotizacion.estadoCotizacion === "Aprobada" ? "default" : "outline"} className="text-xs">
                  {cotizacion.estadoCotizacion}
                </Badge>
              </div>

              {/* Selector de estado de cotización y contratista */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Estado de Cotización</Label>
                  <Select
                    value={cotizacion.estadoCotizacion}
                    onValueChange={(val: any) => setCotizacion((c) => ({ ...c, estadoCotizacion: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendiente">Pendiente de Aprobación</SelectItem>
                      <SelectItem value="Aprobada">Aprobada</SelectItem>
                      <SelectItem value="Rechazada">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Proveedor / Contratista</Label>
                  <Input
                    placeholder="Ej. MedTech Perú / Técnico especializado"
                    className="h-8 text-xs"
                    value={cotizacion.contratista}
                    onChange={(e) => setCotizacion((c) => ({ ...c, contratista: e.target.value }))}
                  />
                </div>
              </div>

              {/* Tabla de repuestos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Repuestos y Piezas Requeridas</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCotizacion((c) => ({
                        ...c,
                        repuestos: [
                          ...c.repuestos,
                          { descripcion: "", cantidad: 1, precioUnitario: 0, total: 0, proveedor: "" },
                        ],
                      }));
                    }}
                  >
                    <Plus className="size-3 mr-1" /> Agregar repuesto
                  </Button>
                </div>

                {cotizacion.repuestos.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {cotizacion.repuestos.map((rep, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border text-xs">
                        <Input
                          placeholder="Descripción del repuesto"
                          className="h-7 text-xs flex-1"
                          value={rep.descripcion}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCotizacion((c) => {
                              const updated = [...c.repuestos];
                              if (updated[idx]) { updated[idx].descripcion = val; }
                              return { ...c, repuestos: updated };
                            });
                          }}
                        />
                        <div className="flex items-center gap-1 w-20">
                          <span className="text-[10px] text-muted-foreground">Cant:</span>
                          <Input
                            type="number"
                            min="1"
                            className="h-7 text-xs w-12 text-center px-1"
                            value={rep.cantidad}
                            onChange={(e) => {
                              const qty = Number(e.target.value) || 1;
                              setCotizacion((c) => {
                                const updated = [...c.repuestos];
                                if (updated[idx]) { updated[idx].cantidad = qty; updated[idx].total = qty * updated[idx].precioUnitario; }
                                const repTotal = updated.reduce((s, r) => s + r.total, 0);
                                return { ...c, repuestos: updated, totalGeneral: repTotal + c.manoDeObra };
                              });
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 w-24">
                          <span className="text-[10px] text-muted-foreground">S/.:</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="h-7 text-xs w-16 text-right px-1"
                            value={rep.precioUnitario}
                            onChange={(e) => {
                              const pr = Number(e.target.value) || 0;
                              setCotizacion((c) => {
                                const updated = [...c.repuestos];
                                if (updated[idx]) { updated[idx].precioUnitario = pr; updated[idx].total = updated[idx].cantidad * pr; }
                                const repTotal = updated.reduce((s, r) => s + r.total, 0);
                                return { ...c, repuestos: updated, totalGeneral: repTotal + c.manoDeObra };
                              });
                            }}
                          />
                        </div>
                        <span className="w-16 text-right font-semibold text-foreground">
                          S/. {rep.total.toFixed(2)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => {
                            setCotizacion((c) => {
                              const updated = c.repuestos.filter((_, i) => i !== idx);
                              const repTotal = updated.reduce((s, r) => s + r.total, 0);
                              return { ...c, repuestos: updated, totalGeneral: repTotal + c.manoDeObra };
                            });
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No se han registrado repuestos para esta intervención.</p>
                )}
              </div>

              {/* Mano de obra y total general */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Costo Mano de Obra:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold">S/.</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-7 w-20 text-right text-xs"
                      value={cotizacion.manoDeObra}
                      onChange={(e) => {
                        const mo = Number(e.target.value) || 0;
                        setCotizacion((c) => {
                          const repTotal = c.repuestos.reduce((s, r) => s + r.total, 0);
                          return { ...c, manoDeObra: mo, totalGeneral: repTotal + mo };
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg">
                  <span className="font-semibold text-foreground">Costo Total Intervención:</span>
                  <span className="font-bold text-sm text-primary">S/. {cotizacion.totalGeneral.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prox2">Próxima fecha de mantenimiento</Label>

              <Input
                id="prox2"

                type="date"

                value={form.proximaFecha}

                onChange={(e) => set("proximaFecha", e.target.value)}

                required
              />
            </div>
          </form>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center w-full gap-2">
            <div className="flex w-full">
              {maintenance && (
                <Button
                  type="button"

                  variant="outline"

                  onClick={() =>
                    generateMaintenancePDF(
                      maintenance,

                      db.equipment.find((e) => e.id === maintenance.equipoId),

                      db.users.find((u) => u.id === maintenance.biomedicoId),

                      db.locations.find(
                        (l) =>
                          l.id ===
                          db.equipment.find((e) => e.id === maintenance.equipoId)?.ubicacionId,
                      )?.sede || "Sede Principal",

                      db.locations.find(
                        (l) =>
                          l.id ===
                          db.equipment.find((e) => e.id === maintenance.equipoId)?.ubicacionId,
                      )?.nombre || "Almacén",
                    )
                  }

                  className="mr-auto text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Informe PDF
                </Button>
              )}
            </div>

            <div className="flex gap-2 w-full justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>

              
              <Button type="submit" form="maintenance-form">
                {maintenance ? "Actualizar" : "Registrar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mantenimiento</AlertDialogTitle>

            <AlertDialogDescription>
              Se registrará el mantenimiento y se programará el próximo para el {form.proximaFecha}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>

            <AlertDialogAction onClick={save} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImagePreviewDialog
        src={previewFoto}
        onClose={() => setPreviewFoto(null)}
      />
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

    try {
      setModelosText(JSON.parse(m.modelosJson).join(", "));
    } catch {
      setModelosText("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    e.stopPropagation();

    const arr = modelosText

      .split(",")

      .map((s) => s.trim())

      .filter((s) => s);

    await saveMarca({ id: editingId || undefined, nombre, modelosJson: JSON.stringify(arr) });

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
            {(db.marcas || []).map((m) => (
              <div
                key={m.id}

                className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
              >
                <span className="font-medium">{m.nombre}</span>

                <div className="flex gap-2">
                  <Button
                    type="button"

                    variant="ghost"

                    size="sm"

                    className="h-6 w-6 p-0"

                    onClick={(e) => {
                      e.preventDefault();

                      e.stopPropagation();

                      startEdit(m);
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>

                  <Button
                    type="button"

                    variant="ghost"

                    size="sm"

                    className="h-6 w-6 p-0 text-destructive"

                    onClick={async (e) => {
                      e.preventDefault();

                      e.stopPropagation();

                      try {
                        await deleteMarca(m.id);

                        toast.success("Marca eliminada");
                      } catch {
                        toast.error("Error al eliminar la marca");
                      }
                    }}
                  >
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

              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Modelos (separados por coma)</Label>

              <Textarea
                value={modelosText}

                onChange={(e) => setModelosText(e.target.value)}

                required

                rows={4}

                placeholder="Ej: MX400, MX450, Epiq 7"
              />
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <Button
                  type="button"

                  variant="outline"

                  size="sm"

                  onClick={() => {
                    setEditingId(null);

                    setNombre("");

                    setModelosText("");
                  }}
                >
                  Cancelar
                </Button>
              )}

              <Button type="submit" size="sm">
                Guardar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function IncidentDialog({ equipoId, trigger }: { equipoId?: string; trigger: ReactNode }) {
  const { db, addIncident, updateEquipment, fallasFrecuentes } = useBio();
  const [open, setOpen] = useState(false);
  const [selectedEquipoId, setSelectedEquipoId] = useState(equipoId || "");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [showAllFallas, setShowAllFallas] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedEquipoId(equipoId || "");
      setIncidentTitle("");
      setShowAllFallas(false);
    }
  }, [open, equipoId]);

  const targetId = equipoId || selectedEquipoId;
  const targetEquipo = db.equipment.find((e) => e.id === targetId);

  const matchingFallas = useMemo(() => {
    if (!fallasFrecuentes || fallasFrecuentes.length === 0) return [];
    if (!targetEquipo || showAllFallas) return fallasFrecuentes;

    const eqCat = (targetEquipo.categoria || "").trim().toLowerCase();
    const eqMarca = (targetEquipo.marca || "").trim().toLowerCase();
    const eqMod = (targetEquipo.modelo || "").trim().toLowerCase();

    return fallasFrecuentes
      .filter((f) => {
        const fCat = (f.categoria || "Todas").trim().toLowerCase();
        const fMarca = (f.marca || "Todas").trim().toLowerCase();
        const fMod = (f.modelo || "Todos").trim().toLowerCase();

        const catMatches = fCat === "todas" || !fCat || (eqCat && fCat === eqCat);
        const marcaMatches = fMarca === "todas" || !fMarca || (eqMarca && fMarca === eqMarca);
        const modMatches = fMod === "todos" || !fMod || (eqMod && fMod === eqMod);

        return catMatches && marcaMatches && modMatches;
      })
      .sort((a, b) => {
        const aScore = (a.modelo && a.modelo !== "Todos" ? 4 : 0) + (a.marca && a.marca !== "Todas" ? 2 : 0) + (a.categoria && a.categoria !== "Todas" ? 1 : 0);
        const bScore = (b.modelo && b.modelo !== "Todos" ? 4 : 0) + (b.marca && b.marca !== "Todas" ? 2 : 0) + (b.categoria && b.categoria !== "Todas" ? 1 : 0);
        return bScore - aScore;
      });
  }, [fallasFrecuentes, targetEquipo, showAllFallas]);

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !incidentTitle.trim()) {
      toast.error("Seleccione un equipo e ingrese la descripción de la falla");
      return;
    }
    try {
      await addIncident({ activoId: targetId, activo_id: targetId, titulo: incidentTitle.trim(), estado: "Abierta" });
      await updateEquipment(targetId, { estado: "Fuera de servicio" });
      setOpen(false);
      setIncidentTitle("");
      toast.success("Falla reportada correctamente");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al reportar falla");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleReportIncident}>
          <DialogHeader>
            <DialogTitle>Reportar falla / incidencia</DialogTitle>
            <DialogDescription>
              Describa el problema que presenta el equipo. El estado del activo cambiará
              automáticamente a Fuera de servicio.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!equipoId ? (
              <div className="grid gap-2">
                <Label>Equipo afectado</Label>
                <Select value={selectedEquipoId} onValueChange={setSelectedEquipoId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el equipo..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {db.equipment
                      .filter((e) => e.estado !== "De baja")
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.codigo} — {e.nombre} ({e.marca})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <span className="text-xs text-muted-foreground block">Equipo seleccionado:</span>
                <span className="font-semibold text-yellow-500">{targetEquipo?.codigo}</span> —{" "}
                {targetEquipo?.nombre}
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Descripción de la falla</Label>
                {targetEquipo && (
                  <button
                    type="button"
                    onClick={() => setShowAllFallas(!showAllFallas)}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    {showAllFallas ? "Filtrar por este equipo" : "Ver todo el catálogo"}
                  </button>
                )}
              </div>

              {matchingFallas && matchingFallas.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Sparkles className="size-3 text-amber-500 shrink-0" />
                    <span>Fallas frecuentes recomendadas</span>
                    {targetEquipo && !showAllFallas && (
                      <span className="font-semibold text-foreground">
                        para {targetEquipo.categoria || "este equipo"}
                        {targetEquipo.marca ? ` · ${targetEquipo.marca}` : ""}
                        {targetEquipo.modelo ? ` (${targetEquipo.modelo})` : ""}:
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-muted/30 rounded-md border border-border/60">
                    {matchingFallas.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        title={f.detalle || f.descripcion || f.valor}
                        onClick={() => {
                          setIncidentTitle((prev) => (prev ? `${prev}. ${f.valor}` : f.valor));
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary text-secondary-foreground border border-border/70 transition-colors cursor-pointer text-left flex items-center gap-1"
                      >
                        <span>+ {f.valor}</span>
                        {(f.marca && f.marca !== "Todas" || f.modelo && f.modelo !== "Todos") && (
                          <span className="text-[9px] text-muted-foreground font-mono bg-background/80 px-1 rounded">
                            {f.marca && f.marca !== "Todas" ? f.marca : ""} {f.modelo && f.modelo !== "Todos" ? f.modelo : ""}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Textarea
                placeholder="Describa la avería o síntoma presentado por el equipo..."
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                required
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!targetId || !incidentTitle.trim()}
            >
              Reportar incidencia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
