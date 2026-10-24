import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  Boxes,
  Route as RouteIcon,
  Wrench,
  Tag,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBio } from "@/lib/bioasset/store";
import { CATEGORIES, type OpcionCatalogo } from "@/lib/bioasset/types";
import { toast } from "sonner";

export const Route = createFileRoute("/controles")({
  head: () => ({
    meta: [
      { title: "Controles y Catálogos | BIOASSET" },
      {
        name: "description",
        content: "Gestión centralizada de listas desplegables, categorías, estados, motivos y marcas por sede.",
      },
    ],
  }),
  component: ControlesPage,
});

export function ControlesPage() {
  const {
    db,
    user,
    isAdmin,
    isBiomedico,
    addOpcionCatalogo,
    updateOpcionCatalogo,
    deleteOpcionCatalogo,
    saveMarca,
    deleteMarca,
  } = useBio();

  const [activeTab, setActiveTab] = useState("equipos");
  const [sedeFiltro, setSedeFiltro] = useState<string>("todas");

  // Distinct sedes from locations
  const sedesDisponibles = useMemo(() => {
    const set = new Set<string>();
    (db.locations || []).forEach((loc) => {
      if (loc.sede) set.add(loc.sede);
    });
    if (set.size === 0) set.add("Sede Principal");
    return Array.from(set);
  }, [db.locations]);

  // Si no tiene permisos de admin ni de biomedico, bloquear acceso
  if (!isAdmin && !isBiomedico) {
    return (
      <AppShell title="Controles" description="Módulo administrativo">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-destructive/10 p-4 text-destructive mb-4">
            <ShieldAlert className="size-10" />
          </div>
          <h2 className="text-xl font-semibold">Acceso restringido</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Este módulo está reservado exclusivamente para Administradores y Personal Biomédico para el control de catálogos y opciones del sistema.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/">Volver al Inicio</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  // Filtrado de opciones de catálogo según sede seleccionada
  const opcionesFiltradas = (tipo: string) => {
    return (db.opcionesCatalogo || [])
      .filter((op) => op.tipo?.toLowerCase() === tipo.toLowerCase())
      .filter((op) => {
        if (sedeFiltro === "todas") return true;
        return !op.sede || op.sede === "Todas" || op.sede.toLowerCase() === sedeFiltro.toLowerCase();
      })
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.valor.localeCompare(b.valor));
  };

  return (
    <AppShell
      title="Módulo de Controles"
      description="Administra de forma dinámica las opciones, categorías, estados, marcas y motivos desplegables en todo el sistema."
    >
      <div className="space-y-6">
        {/* Barra superior de filtro de sede y bienvenida */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <SlidersHorizontal className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Filtro de Sede Institucional</h2>
              <p className="text-xs text-muted-foreground">
                Configura opciones globales o específicas para cada sede clínica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Building2 className="size-4 text-muted-foreground" />
            <Select value={sedeFiltro} onValueChange={setSedeFiltro}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filtrar por sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las sedes (Global)</SelectItem>
                {sedesDisponibles.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pestañas principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted/60">
            <TabsTrigger value="equipos" className="flex items-center gap-2 py-2.5">
              <Boxes className="size-4" />
              <span>Equipos</span>
            </TabsTrigger>
            <TabsTrigger value="marcas" className="flex items-center gap-2 py-2.5">
              <Tag className="size-4" />
              <span>Marcas y Modelos</span>
            </TabsTrigger>
            <TabsTrigger value="trazabilidad" className="flex items-center gap-2 py-2.5">
              <RouteIcon className="size-4" />
              <span>Trazabilidad</span>
            </TabsTrigger>
            <TabsTrigger value="mantenimiento" className="flex items-center gap-2 py-2.5">
              <Wrench className="size-4" />
              <span>Mantenimiento</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: EQUIPOS */}
          <TabsContent value="equipos" className="space-y-6 focus-visible:outline-none">
            <CatalogoSection
              titulo="Categorías de Equipos"
              descripcion="Clasificaciones funcionales aplicadas al registrar o filtrar activos biomédicos."
              tipo="categoria_equipo"
              icon={Boxes}
              opciones={opcionesFiltradas("categoria_equipo")}
              sedesDisponibles={sedesDisponibles}
              currentSede={user?.sede || "Todas"}
              onAdd={addOpcionCatalogo}
              onUpdate={updateOpcionCatalogo}
              onDelete={deleteOpcionCatalogo}
            />

            <CatalogoSection
              titulo="Estados Operativos de Equipos"
              descripcion="Estados posibles de operatividad que definen el ciclo de vida de los equipos."
              tipo="estado_equipo"
              icon={CheckCircle2}
              opciones={opcionesFiltradas("estado_equipo")}
              sedesDisponibles={sedesDisponibles}
              currentSede={user?.sede || "Todas"}
              onAdd={addOpcionCatalogo}
              onUpdate={updateOpcionCatalogo}
              onDelete={deleteOpcionCatalogo}
            />
          </TabsContent>

          {/* TAB 2: MARCAS Y MODELOS */}
          <TabsContent value="marcas" className="focus-visible:outline-none">
            <MarcasSection
              marcas={db.marcas || []}
              onSaveMarca={saveMarca}
              onDeleteMarca={deleteMarca}
            />
          </TabsContent>

          {/* TAB 3: TRAZABILIDAD (MOVIMIENTOS) */}
          <TabsContent value="trazabilidad" className="space-y-6 focus-visible:outline-none">
            <CatalogoSection
              titulo="Motivos de Traslado / Movimiento"
              descripcion="Opciones controladas para justificar el movimiento o reubicación de equipos entre áreas y sedes."
              tipo="motivo_traslado"
              icon={RouteIcon}
              opciones={opcionesFiltradas("motivo_traslado")}
              sedesDisponibles={sedesDisponibles}
              currentSede={user?.sede || "Todas"}
              onAdd={addOpcionCatalogo}
              onUpdate={updateOpcionCatalogo}
              onDelete={deleteOpcionCatalogo}
            />
          </TabsContent>

          {/* TAB 4: MANTENIMIENTO */}
          <TabsContent value="mantenimiento" className="space-y-6 focus-visible:outline-none">
            <CatalogoSection
              titulo="Tipos de Mantenimiento"
              descripcion="Clasificación de órdenes e intervenciones técnicas sobre los equipos (Preventivo, Correctivo, Calibración, etc.)."
              tipo="tipo_mantenimiento"
              icon={Wrench}
              opciones={opcionesFiltradas("tipo_mantenimiento")}
              sedesDisponibles={sedesDisponibles}
              currentSede={user?.sede || "Todas"}
              onAdd={addOpcionCatalogo}
              onUpdate={updateOpcionCatalogo}
              onDelete={deleteOpcionCatalogo}
            />

            <CatalogoSection
              titulo="Resultados y Estados de Mantenimiento"
              descripcion="Conclusiones técnicas registradas al finalizar o evaluar un trabajo de mantenimiento."
              tipo="resultado_mantenimiento"
              icon={CheckCircle2}
              opciones={opcionesFiltradas("resultado_mantenimiento")}
              sedesDisponibles={sedesDisponibles}
              currentSede={user?.sede || "Todas"}
              onAdd={addOpcionCatalogo}
              onUpdate={updateOpcionCatalogo}
              onDelete={deleteOpcionCatalogo}
            />

            <FallasCatalogSection
              opciones={opcionesFiltradas("falla_frecuente")}
              marcas={db.marcas || []}
              categorias={Array.from(new Set([...categorias, ...CATEGORIES]))}
              sedesDisponibles={sedesDisponibles}
              currentSede={user?.sede || "Todas"}
              onAdd={addOpcionCatalogo}
              onUpdate={updateOpcionCatalogo}
              onDelete={deleteOpcionCatalogo}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

// ========================================================
// COMPONENTE: SECCIÓN DE CATÁLOGO GENÉRICA
// ========================================================
interface CatalogoSectionProps {
  titulo: string;
  descripcion: string;
  tipo: string;
  icon: any;
  opciones: OpcionCatalogo[];
  sedesDisponibles: string[];
  currentSede: string;
  onAdd: (op: Partial<OpcionCatalogo>) => Promise<any>;
  onUpdate: (id: string, op: Partial<OpcionCatalogo>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

function CatalogoSection({
  titulo,
  descripcion,
  tipo,
  icon: Icon,
  opciones,
  sedesDisponibles,
  currentSede,
  onAdd,
  onUpdate,
  onDelete,
}: CatalogoSectionProps) {
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OpcionCatalogo | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<OpcionCatalogo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    valor: "",
    descripcion: "",
    sede: currentSede || "Todas",
    orden: 0,
    activo: true,
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      valor: "",
      descripcion: "",
      sede: currentSede || "Todas",
      orden: (opciones.length + 1) * 10,
      activo: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: OpcionCatalogo) => {
    setEditingItem(item);
    setFormData({
      valor: item.valor,
      descripcion: item.descripcion || "",
      sede: item.sede || "Todas",
      orden: item.orden ?? 0,
      activo: item.activo,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.valor.trim()) {
      toast.error("El valor o nombre es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await onUpdate(editingItem.id, {
          valor: formData.valor.trim(),
          descripcion: formData.descripcion.trim(),
          sede: formData.sede,
          orden: Number(formData.orden),
          activo: formData.activo,
        });
        toast.success(`Opción "${formData.valor}" actualizada exitosamente`);
      } else {
        await onAdd({
          tipo,
          valor: formData.valor.trim(),
          descripcion: formData.descripcion.trim(),
          sede: formData.sede,
          orden: Number(formData.orden),
          activo: formData.activo,
        });
        toast.success(`Opción "${formData.valor}" creada exitosamente`);
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar la opción");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActivo = async (item: OpcionCatalogo) => {
    try {
      await onUpdate(item.id, {
        ...item,
        activo: !item.activo,
      });
      toast.success(
        `Opción "${item.valor}" ${!item.activo ? "activada" : "desactivada"} exitosamente`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar estado");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsSubmitting(true);
    try {
      await onDelete(deleteConfirmItem.id);
      toast.success(`Opción "${deleteConfirmItem.valor}" eliminada exitosamente`);
      setDeleteConfirmItem(null);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo eliminar la opción. Podría estar en uso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const opcionesFiltradas = opciones.filter((op) => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (
      op.valor.toLowerCase().includes(term) ||
      (op.descripcion && op.descripcion.toLowerCase().includes(term))
    );
  });

  return (
    <Card className="shadow-sm border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary mt-0.5">
            <Icon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              {titulo}
              <Badge variant="outline" className="text-xs font-normal">
                {opciones.length} {opciones.length === 1 ? "opción" : "opciones"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-0.5">
              {descripcion}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar opción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Button onClick={openCreateModal} size="sm" className="h-9 gap-1 shrink-0">
            <Plus className="size-4" />
            <span>Nueva Opción</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-16 text-center text-xs">Orden</TableHead>
                <TableHead className="text-xs">Nombre / Valor</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Descripción</TableHead>
                <TableHead className="text-xs">Sede</TableHead>
                <TableHead className="text-xs text-center">Estado</TableHead>
                <TableHead className="w-24 text-right text-xs">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opcionesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    {busqueda ? "No se encontraron opciones para tu búsqueda." : "No hay opciones registradas para este catálogo."}
                  </TableCell>
                </TableRow>
              ) : (
                opcionesFiltradas.map((item) => (
                  <TableRow key={item.id} className={!item.activo ? "opacity-60 bg-muted/20" : ""}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {item.orden ?? 0}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <span>{item.valor}</span>
                        {!item.activo && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-xs truncate">
                      {item.descripcion || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.sede && item.sede !== "Todas" ? "outline" : "secondary"}
                        className="text-xs font-normal"
                      >
                        {item.sede || "Todas"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={item.activo}
                        onCheckedChange={() => handleToggleActivo(item)}
                        aria-label="Activar o desactivar opción"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditModal(item)}
                          title="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmItem(item)}
                          title="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Modal Crear / Editar Opción */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Opción" : "Nueva Opción de Catálogo"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Modifica los detalles de la opción de catálogo seleccionada."
                  : "Ingresa el nuevo valor para incluir en la lista de opciones."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="valor">
                  Nombre o Valor <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="valor"
                  placeholder="Ej: Odontología, En calibración, etc."
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Detalle o propósito de esta opción..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sede">Sede asignada</Label>
                  <Select
                    value={formData.sede}
                    onValueChange={(v) => setFormData({ ...formData, sede: v })}
                  >
                    <SelectTrigger id="sede">
                      <SelectValue placeholder="Seleccionar sede" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas las sedes (Global)</SelectItem>
                      {sedesDisponibles.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orden">Orden de aparición</Label>
                  <Input
                    id="orden"
                    type="number"
                    min="0"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="activo-switch" className="text-sm">Opción Activa</Label>
                  <p className="text-xs text-muted-foreground">
                    Las opciones inactivas no se muestran en los formularios.
                  </p>
                </div>
                <Switch
                  id="activo-switch"
                  checked={formData.activo}
                  onCheckedChange={(c) => setFormData({ ...formData, activo: c })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : editingItem ? "Guardar Cambios" : "Crear Opción"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alerta de confirmación de eliminación */}
      <AlertDialog
        open={Boolean(deleteConfirmItem)}
        onOpenChange={(open) => !open && setDeleteConfirmItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              ¿Confirmar eliminación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar la opción{" "}
              <strong>"{deleteConfirmItem?.valor}"</strong>? Esta acción no se puede deshacer.
              Si hay registros históricos asociados, el sistema bloqueará la eliminación para proteger la integridad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Eliminando..." : "Eliminar Opción"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ========================================================
// COMPONENTE: SECCIÓN DE MARCAS Y MODELOS
// ========================================================
interface MarcasSectionProps {
  marcas: any[];
  onSaveMarca: (m: { id?: string; nombre: string; modelosJson: string }) => Promise<void>;
  onDeleteMarca: (id: string) => Promise<void>;
}

function MarcasSection({ marcas, onSaveMarca, onDeleteMarca }: MarcasSectionProps) {
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMarca, setEditingMarca] = useState<any | null>(null);
  const [deleteConfirmMarca, setDeleteConfirmMarca] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [nombre, setNombre] = useState("");
  const [modelosText, setModelosText] = useState("");

  const openCreateModal = () => {
    setEditingMarca(null);
    setNombre("");
    setModelosText("");
    setModalOpen(true);
  };

  const openEditModal = (m: any) => {
    setEditingMarca(m);
    setNombre(m.nombre);
    try {
      const arr = JSON.parse(m.modelosJson);
      setModelosText(Array.isArray(arr) ? arr.join(", ") : "");
    } catch {
      setModelosText("");
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre de la marca es obligatorio.");
      return;
    }

    const arr = modelosText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setIsSubmitting(true);
    try {
      await onSaveMarca({
        id: editingMarca?.id,
        nombre: nombre.trim(),
        modelosJson: JSON.stringify(arr),
      });
      toast.success(
        editingMarca
          ? `Marca "${nombre}" actualizada exitosamente`
          : `Marca "${nombre}" creada exitosamente`,
      );
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar la marca");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmMarca) return;
    setIsSubmitting(true);
    try {
      await onDeleteMarca(deleteConfirmMarca.id);
      toast.success(`Marca "${deleteConfirmMarca.nombre}" eliminada exitosamente`);
      setDeleteConfirmMarca(null);
    } catch (err: any) {
      toast.error(err?.message || "No se puede eliminar la marca porque tiene equipos asociados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const marcasFiltradas = marcas.filter((m) => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    if (m.nombre.toLowerCase().includes(term)) return true;
    try {
      const arr = JSON.parse(m.modelosJson);
      return Array.isArray(arr) && arr.some((model: string) => model.toLowerCase().includes(term));
    } catch {
      return false;
    }
  });

  return (
    <Card className="shadow-sm border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary mt-0.5">
            <Tag className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              Marcas y Modelos de Fabricantes
              <Badge variant="outline" className="text-xs font-normal">
                {marcas.length} {marcas.length === 1 ? "marca" : "marcas"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-0.5">
              Catálogo oficial de marcas de equipos biomédicos y sus modelos homologados.
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar marca o modelo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Button onClick={openCreateModal} size="sm" className="h-9 gap-1 shrink-0">
            <Plus className="size-4" />
            <span>Nueva Marca</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-48 text-xs font-semibold">Marca</TableHead>
                <TableHead className="text-xs font-semibold">Modelos Asociados</TableHead>
                <TableHead className="w-24 text-right text-xs font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marcasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                    {busqueda
                      ? "No se encontraron marcas ni modelos para tu búsqueda."
                      : "No hay marcas registradas. Añade una nueva para comenzar."}
                  </TableCell>
                </TableRow>
              ) : (
                marcasFiltradas.map((m) => {
                  let modelos: string[] = [];
                  try {
                    modelos = JSON.parse(m.modelosJson) || [];
                  } catch {
                    modelos = [];
                  }

                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-sm">
                        <div className="flex items-center gap-2">
                          <Tag className="size-4 text-muted-foreground" />
                          <span>{m.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {modelos.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              Sin modelos específicos registrados
                            </span>
                          ) : (
                            modelos.map((mod, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs font-mono font-normal bg-muted/80 hover:bg-muted"
                              >
                                {mod}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditModal(m)}
                            title="Editar Marca y Modelos"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmMarca(m)}
                            title="Eliminar Marca"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Modal Crear / Editar Marca */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingMarca ? "Editar Marca y Modelos" : "Nueva Marca de Equipo"}
              </DialogTitle>
              <DialogDescription>
                Define la marca del fabricante y los modelos homologados disponibles en el selector de equipos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre-marca">
                  Nombre de la Marca <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre-marca"
                  placeholder="Ej: Philips, GE Healthcare, Mindray..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelos-marca">Modelos Asociados (separados por coma)</Label>
                <Textarea
                  id="modelos-marca"
                  placeholder="Ej: MX400, MX450, IntelliVue MP50, Epiq 7"
                  value={modelosText}
                  onChange={(e) => setModelosText(e.target.value)}
                  rows={4}
                />
                <p className="text-[11px] text-muted-foreground">
                  Escribe los nombres de los modelos separados por comas. Al registrar o editar un equipo, estos modelos se desplegarán automáticamente al elegir esta marca.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : editingMarca ? "Guardar Cambios" : "Crear Marca"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alerta Confirmación Eliminar Marca */}
      <AlertDialog
        open={Boolean(deleteConfirmMarca)}
        onOpenChange={(open) => !open && setDeleteConfirmMarca(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              ¿Eliminar marca de equipos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar la marca{" "}
              <strong>"{deleteConfirmMarca?.nombre}"</strong> y todos sus modelos asociados?
              Si existen equipos en el inventario registrados bajo esta marca, la operación será rechazada para evitar inconsistencias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Eliminando..." : "Eliminar Marca"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}


// ========================================================
// COMPONENTE: CATÁLOGO DE FALLAS FRECUENTES POR ACTIVO / TIPO / MARCA / MODELO
// ========================================================
interface FallasCatalogSectionProps {
  opciones: OpcionCatalogo[];
  marcas: any[];
  categorias: string[];
  sedesDisponibles: string[];
  currentSede: string;
  onAdd: (op: Partial<OpcionCatalogo>) => Promise<any>;
  onUpdate: (id: string, op: Partial<OpcionCatalogo>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

function parseFallaMeta(raw: string | undefined) {
  if (!raw) return { categoria: "Todas", marca: "Todas", modelo: "Todos", detalle: "" };
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object") {
      return {
        categoria: p.categoria || "Todas",
        marca: p.marca || "Todas",
        modelo: p.modelo || "Todos",
        detalle: p.detalle || "",
      };
    }
  } catch {}
  return { categoria: "Todas", marca: "Todas", modelo: "Todos", detalle: raw };
}

function FallasCatalogSection({
  opciones,
  marcas,
  categorias,
  sedesDisponibles,
  currentSede,
  onAdd,
  onUpdate,
  onDelete,
}: FallasCatalogSectionProps) {
  const [busqueda, setBusqueda] = useState("");
  const [catFiltro, setCatFiltro] = useState("todas");
  const [marcaFiltro, setMarcaFiltro] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OpcionCatalogo | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<OpcionCatalogo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    valor: "",
    categoria: "Todas",
    marca: "Todas",
    modelo: "Todos",
    detalle: "",
    sede: currentSede || "Todas",
    orden: 0,
    activo: true,
  });

  // Modelos dinámicos según la marca seleccionada en el formulario
  const modelosParaMarcaForm = useMemo(() => {
    if (!formData.marca || formData.marca === "Todas") return [];
    const found = marcas.find((m) => m.nombre?.toLowerCase() === formData.marca.toLowerCase());
    if (!found) return [];
    try {
      const arr = JSON.parse(found.modelosJson);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, [formData.marca, marcas]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      valor: "",
      categoria: "Todas",
      marca: "Todas",
      modelo: "Todos",
      detalle: "",
      sede: currentSede || "Todas",
      orden: (opciones.length + 1) * 10,
      activo: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: OpcionCatalogo) => {
    setEditingItem(item);
    const meta = parseFallaMeta(item.descripcion);
    setFormData({
      valor: item.valor,
      categoria: meta.categoria,
      marca: meta.marca,
      modelo: meta.modelo,
      detalle: meta.detalle,
      sede: item.sede || "Todas",
      orden: item.orden ?? 0,
      activo: item.activo,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.valor.trim()) {
      toast.error("El nombre o síntoma de la falla es obligatorio.");
      return;
    }

    const descJson = JSON.stringify({
      categoria: formData.categoria,
      marca: formData.marca,
      modelo: formData.modelo,
      detalle: formData.detalle.trim(),
    });

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await onUpdate(editingItem.id, {
          valor: formData.valor.trim(),
          descripcion: descJson,
          sede: formData.sede,
          orden: Number(formData.orden),
          activo: formData.activo,
        });
        toast.success(`Falla "${formData.valor}" actualizada exitosamente`);
      } else {
        await onAdd({
          tipo: "falla_frecuente",
          valor: formData.valor.trim(),
          descripcion: descJson,
          sede: formData.sede,
          orden: Number(formData.orden),
          activo: formData.activo,
        });
        toast.success(`Falla "${formData.valor}" registrada en el catálogo`);
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar la falla");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedDefaults = async () => {
    setIsSubmitting(true);
    const defaults = [
      { valor: "Falla de encendido / No inicia", categoria: "Todas", marca: "Todas", modelo: "Todos", detalle: "Problema en cable poder o circuito fuente" },
      { valor: "Falla en sensor SpO2 / Cables ECG", categoria: "Monitoreo", marca: "Todas", modelo: "Todos", detalle: "Sensor desconectado o cable roto" },
      { valor: "Fuga de aire / presión en manguera NIBP", categoria: "Monitoreo", marca: "Todas", modelo: "Todos", detalle: "Manguito o conector rápido agrietado" },
      { valor: "Error de calibración en celda de O2", categoria: "Soporte vital", marca: "Dräger", modelo: "Fabius Plus", detalle: "Celda de oxígeno agotada" },
      { valor: "Batería degradada / no retiene carga", categoria: "Soporte vital", marca: "B. Braun", modelo: "Infusomat Space", detalle: "Batería de litio superó ciclos de vida" },
      { valor: "Pantalla táctil o perilla no responde", categoria: "Monitoreo", marca: "Philips", modelo: "IntelliVue MX400", detalle: "Encoder rotativo descalibrado" },
      { valor: "Alarma persistente sin causa aparente", categoria: "Todas", marca: "Todas", modelo: "Todos", detalle: "Sensor sucio o umbral desajustado" },
      { valor: "Fallo de palas / descarga de desfibrilador", categoria: "Reanimación", marca: "Mindray", modelo: "BeneHeart D3", detalle: "Error de sincronismo o impedancia alta" },
      { valor: "Descalibración o lectura errónea en cartucho", categoria: "Laboratorio", marca: "Abbott", modelo: "i-STAT 1", detalle: "Error de temperatura o pines sucios" },
      { valor: "Problema de conexión / red / impresión", categoria: "Tecnológico / TI", marca: "Todas", modelo: "Todos", detalle: "Falla en tarjeta de red o puerto serial" },
    ];

    try {
      for (let i = 0; i < defaults.length; i++) {
        const d = defaults[i];
        await onAdd({
          tipo: "falla_frecuente",
          valor: d.valor,
          descripcion: JSON.stringify({ categoria: d.categoria, marca: d.marca, modelo: d.modelo, detalle: d.detalle }),
          sede: "Todas",
          orden: (i + 1) * 10,
          activo: true,
        });
      }
      toast.success("Catálogo inicializado con 10 fallas frecuentes biomédicas.");
    } catch {
      toast.error("Error al inicializar fallas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado en tabla
  const itemsFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return opciones.filter((op) => {
      const meta = parseFallaMeta(op.descripcion);
      const matchTerm =
        !term ||
        op.valor.toLowerCase().includes(term) ||
        meta.categoria.toLowerCase().includes(term) ||
        meta.marca.toLowerCase().includes(term) ||
        meta.modelo.toLowerCase().includes(term) ||
        meta.detalle.toLowerCase().includes(term);

      const matchCat =
        catFiltro === "todas" || meta.categoria.toLowerCase() === catFiltro.toLowerCase();
      const matchMarca =
        marcaFiltro === "todas" || meta.marca.toLowerCase() === marcaFiltro.toLowerCase();

      return matchTerm && matchCat && matchMarca;
    });
  }, [opciones, busqueda, catFiltro, marcaFiltro]);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                Catálogo de Fallas Frecuentes y Síntomas por Activo
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {opciones.length} {opciones.length === 1 ? "falla" : "fallas"}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Asigna fallas y síntomas típicos por Categoría/Tipo de equipo, Marca y Modelo para autocompletar al reportar averías.
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {opciones.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={handleSeedDefaults}
              disabled={isSubmitting}
            >
              <Sparkles className="size-3.5" />
              Cargar fallas sugeridas
            </Button>
          )}
          <Button size="sm" onClick={openCreateModal} className="gap-1 text-xs">
            <Plus className="size-4" /> Nueva Falla Frecuente
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros locales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por síntoma, categoría o modelo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Select value={catFiltro} onValueChange={setCatFiltro}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={marcaFiltro} onValueChange={setMarcaFiltro}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filtrar por marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las marcas</SelectItem>
              {marcas.map((m) => (
                <SelectItem key={m.id || m.nombre} value={m.nombre}>
                  {m.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabla */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12 text-center text-xs">Orden</TableHead>
                <TableHead className="text-xs">Falla o Síntoma</TableHead>
                <TableHead className="text-xs">Tipo / Categoría</TableHead>
                <TableHead className="text-xs">Marca Asignada</TableHead>
                <TableHead className="text-xs">Modelo Asignado</TableHead>
                <TableHead className="text-xs">Sede</TableHead>
                <TableHead className="w-20 text-center text-xs">Estado</TableHead>
                <TableHead className="w-24 text-right text-xs">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsFiltrados.map((item) => {
                const meta = parseFallaMeta(item.descripcion);
                return (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {item.orden ?? 0}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs text-foreground">{item.valor}</div>
                      {meta.detalle && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {meta.detalle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {meta.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal bg-secondary/50">
                        {meta.marca}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal bg-primary/5 text-primary">
                        {meta.modelo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {item.sede || "Todas"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={item.activo}
                        onCheckedChange={() => onUpdate(item.id, { ...item, activo: !item.activo })}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => openEditModal(item)}
                          title="Editar falla"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmItem(item)}
                          title="Eliminar falla"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {itemsFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    No se encontraron fallas frecuentes registradas con los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Modal Crear / Editar Falla */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-500" />
                {editingItem ? "Editar Falla Frecuente" : "Registrar Falla Frecuente"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Asigna esta falla o síntoma a una categoría, marca y modelo específico para autocompletar al reportar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="falla-nombre">
                  Falla o Síntoma <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="falla-nombre"
                  placeholder="Ej: Fuga de aire en manguera NIBP"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label>Tipo / Categoría de Equipo</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas las categorías</SelectItem>
                      {categorias.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Marca asignada</Label>
                  <Select
                    value={formData.marca}
                    onValueChange={(val) => setFormData({ ...formData, marca: val, modelo: "Todos" })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas las marcas</SelectItem>
                      {marcas.map((m) => (
                        <SelectItem key={m.id || m.nombre} value={m.nombre}>
                          {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Modelo asignado</Label>
                {modelosParaMarcaForm.length > 0 ? (
                  <Select
                    value={formData.modelo}
                    onValueChange={(val) => setFormData({ ...formData, modelo: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos los modelos de {formData.marca}</SelectItem>
                      {modelosParaMarcaForm.map((mod: string) => (
                        <SelectItem key={mod} value={mod}>
                          {mod}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Todos los modelos (o escribe un modelo específico)"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="h-8 text-xs"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="falla-sede">Sede asignada</Label>
                  <Select
                    value={formData.sede}
                    onValueChange={(val) => setFormData({ ...formData, sede: val })}
                  >
                    <SelectTrigger id="falla-sede" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas las sedes (Global)</SelectItem>
                      {sedesDisponibles.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="falla-orden">Orden</Label>
                  <Input
                    id="falla-orden"
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="falla-detalle">Detalle o síntoma observable (opcional)</Label>
                <Textarea
                  id="falla-detalle"
                  placeholder="Detalles sobre cómo detectar o reproducir el síntoma..."
                  value={formData.detalle}
                  onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border">
                <div className="space-y-0.5">
                  <span className="font-semibold text-xs block">Opción activa</span>
                  <span className="text-[11px] text-muted-foreground block">
                    Disponible inmediatamente en los formularios del sistema
                  </span>
                </div>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(val) => setFormData({ ...formData, activo: val })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : editingItem ? "Actualizar Falla" : "Guardar Falla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alerta de confirmación de eliminación */}
      <AlertDialog
        open={Boolean(deleteConfirmItem)}
        onOpenChange={(op) => !op && setDeleteConfirmItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" /> ¿Eliminar falla del catálogo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar la falla <strong>"{deleteConfirmItem?.valor}"</strong>?
              Esta acción no afectará los mantenimientos ya registrados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteConfirmItem) return;
                setIsSubmitting(true);
                try {
                  await onDelete(deleteConfirmItem.id);
                  toast.success("Falla eliminada del catálogo");
                  setDeleteConfirmItem(null);
                } catch {
                  toast.error("Error al eliminar la falla");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
