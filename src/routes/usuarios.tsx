import { createFileRoute, Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/bioasset/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { useBio, DEFAULT_PERMISSIONS } from "@/lib/bioasset/store";
import type { UserPermissions, Role } from "@/lib/bioasset/types";
import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Power, PowerOff, MoreHorizontal, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [{ title: "Usuarios | BIOASSET" }],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { db, isAdmin, isAuditor, toggleUser, user, addUser } = useBio();
  const [open, setOpen] = useState(false);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Role>("asistencial");
  const [sede, setSede] = useState("Todas");
  const [accesoHasta, setAccesoHasta] = useState("");
  const [sedeTemporal, setSedeTemporal] = useState("Ninguna");
  const [sedeTemporalHasta, setSedeTemporalHasta] = useState("");
  const [permisos, setPermisos] = useState<UserPermissions>(DEFAULT_PERMISSIONS.asistencial);

  // Filters
  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("todos");
  const [filterSede, setFilterSede] = useState("todas");

  if (user && !isAdmin && !isAuditor) {
    return <Navigate to="/" replace />;
  }

  const sedesList = Array.from(new Set(db.locations.map((l) => l.sede))).filter(Boolean);

  const handleRoleChange = (r: string) => {
    setRol(r as Role);
    setPermisos(DEFAULT_PERMISSIONS[r as Role]);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email || !password || !rol) return;
    try {
      await addUser({
        nombre,
        email,
        password,
        rol,
        emailVerified: false,
        permisos,
        sede,
        accesoHasta: accesoHasta ? new Date(accesoHasta).toISOString() : null,
        sedeTemporal,
        sedeTemporalHasta: sedeTemporalHasta ? new Date(sedeTemporalHasta).toISOString() : null,
      });
      toast.success("Usuario registrado exitosamente");
      setOpen(false);
      setNombre("");
      setEmail("");
      setPassword("");
      setRol("asistencial");
      setSede("Todas");
      setAccesoHasta("");
      setSedeTemporal("Ninguna");
      setSedeTemporalHasta("");
    } catch {
      toast.error("Ocurrió un error al registrar el usuario");
    }
  };

  const filteredUsers = useMemo(() => {
    return db.users.filter((u) => {
      const matchSearch =
        u.nombre.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRol = filterRol === "todos" || u.rol === filterRol;
      const matchSede =
        filterSede === "todas" ||
        u.sede === filterSede ||
        (!u.sede && filterSede === "Todas") ||
        u.sedeTemporal === filterSede;
      return matchSearch && matchRol && matchSede;
    });
  }, [db.users, search, filterRol, filterSede]);

  return (
    <AppShell
      title="Usuarios"
      description="Personal autorizado del sistema"
      actions={
        isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>+ Registrar usuario</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddUser}>
                <DialogHeader>
                  <DialogTitle>Registrar usuario</DialogTitle>
                  <DialogDescription>Cree un nuevo usuario para el sistema.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 overflow-y-auto max-h-[65vh] px-1">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre completo</Label>
                    <Input
                      id="nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña temporal</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="rol">Rol</Label>
                      <Select value={rol} onValueChange={handleRoleChange} required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="biomedico">Biomédico</SelectItem>
                          <SelectItem value="asistencial">Asistencial</SelectItem>
                          <SelectItem value="auditor">Auditor</SelectItem>
                          <SelectItem value="estudiante">Estudiante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sede">Sede Principal</Label>
                      <Select value={sede} onValueChange={setSede}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Todas">Todas las sedes</SelectItem>
                          {sedesList.map((s) => (
                            <SelectItem key={s} value={s as string}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2 p-3 bg-muted rounded-md">
                    <Label className="font-semibold">Acceso Temporal Adicional</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="grid gap-2">
                        <Label htmlFor="sedeTemporal">Sede Extra</Label>
                        <Select value={sedeTemporal} onValueChange={setSedeTemporal}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ninguna">Ninguna</SelectItem>
                            <SelectItem value="Todas">Todas las sedes</SelectItem>
                            {sedesList.map((s) => (
                              <SelectItem key={s} value={s as string}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="sedeTemporalHasta">Válido hasta</Label>
                        <Input
                          id="sedeTemporalHasta"
                          type="date"
                          value={sedeTemporalHasta}
                          onChange={(e) => setSedeTemporalHasta(e.target.value)}
                          disabled={sedeTemporal === "Ninguna"}
                          required={sedeTemporal !== "Ninguna"}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="accesoHasta">Expiración de Cuenta (Opcional)</Label>
                    <Input
                      id="accesoHasta"
                      type="date"
                      value={accesoHasta}
                      onChange={(e) => setAccesoHasta(e.target.value)}
                    />
                  </div>
                  <div className="col-span-full pt-4">
                    <Label>Permisos Granulares (Sobrescribir por defecto)</Label>
                    <div className="mt-2 border rounded-md overflow-hidden text-sm">
                      <table className="w-full text-left">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 font-medium">Módulo</th>
                            <th className="px-3 py-2 font-medium text-center">Ver</th>
                            <th className="px-3 py-2 font-medium text-center">Editar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(Object.keys(permisos) as Array<keyof UserPermissions>).map((k) => (
                            <tr key={k}>
                              <td className="px-3 py-2 capitalize">{k}</td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={permisos[k].view}
                                  onChange={(e) =>
                                    setPermisos({
                                      ...permisos,
                                      [k]: { ...permisos[k], view: e.target.checked },
                                    })
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={permisos[k].edit}
                                  onChange={(e) =>
                                    setPermisos({
                                      ...permisos,
                                      [k]: { ...permisos[k], edit: e.target.checked },
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Registrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )
      }
    >
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o correo..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <Select value={filterRol} onValueChange={setFilterRol}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="biomedico">Biomédico</SelectItem>
                  <SelectItem value="asistencial">Asistencial</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                  <SelectItem value="estudiante">Estudiante</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSede} onValueChange={setFilterSede}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sedes</SelectItem>
                  <SelectItem value="Todas">Sede: Todas</SelectItem>
                  {sedesList.map((s) => (
                    <SelectItem key={s} value={s as string}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre / Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Mantenimientos</TableHead>
                <TableHead>Estado</TableHead>
                {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <UserRow key={u.id} userItem={u} sedesList={sedesList} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function UserRow({ userItem, sedesList }: { userItem: any; sedesList: any[] }) {
  const { db, user: currentUser, toggleUser, updateUser, deleteUser, isAdmin } = useBio();
  const isSuperAdmin = userItem.email === "admin@bioasset.pe";
  const isSelf = userItem.id === currentUser?.id;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [nombre, setNombre] = useState(userItem.nombre);
  const [email, setEmail] = useState(userItem.email);
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Role>(userItem.rol as Role);
  const [sede, setSede] = useState(userItem.sede || "Todas");
  const [accesoHasta, setAccesoHasta] = useState(
    userItem.accesoHasta ? userItem.accesoHasta.substring(0, 10) : "",
  );
  const [sedeTemporal, setSedeTemporal] = useState(userItem.sedeTemporal || "Ninguna");
  const [sedeTemporalHasta, setSedeTemporalHasta] = useState(
    userItem.sedeTemporalHasta ? userItem.sedeTemporalHasta.substring(0, 10) : "",
  );

  const [permisos, setPermisos] = useState<UserPermissions>(
    userItem.permisos || DEFAULT_PERMISSIONS[userItem.rol as Role],
  );

  const handleEditRoleChange = (r: string) => {
    setRol(r as Role);
    setPermisos(DEFAULT_PERMISSIONS[r as Role]);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email || !rol) return;
    try {
      await updateUser(userItem.id, {
        nombre,
        email,
        password,
        rol,
        permisos,
        sede,
        accesoHasta: accesoHasta ? new Date(accesoHasta).toISOString() : null,
        sedeTemporal,
        sedeTemporalHasta: sedeTemporalHasta ? new Date(sedeTemporalHasta).toISOString() : null,
      });
      toast.success("Usuario actualizado exitosamente");
      setEditOpen(false);
    } catch {
      toast.error("Ocurrió un error al actualizar");
    }
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="font-medium">{userItem.nombre}</div>
          <div className="text-xs text-muted-foreground">{userItem.email}</div>
        </TableCell>
        <TableCell className="capitalize">{userItem.rol}</TableCell>
        <TableCell>
          <div className="font-medium">{userItem.sede || "Todas"}</div>
          {userItem.sedeTemporal && userItem.sedeTemporal !== "Ninguna" && (
            <div className="text-xs text-blue-600 dark:text-blue-400">
              +{userItem.sedeTemporal} (hasta {userItem.sedeTemporalHasta?.substring(0, 10)})
            </div>
          )}
          {userItem.accesoHasta && (
            <div className="text-xs text-destructive">
              Expira: {userItem.accesoHasta.substring(0, 10)}
            </div>
          )}
        </TableCell>
        <TableCell>{db.maintenance.filter((m) => m.tecnicoId === userItem.id).length}</TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={
              userItem.activo
                ? "border-success/30 bg-success/15 text-success"
                : "border-border bg-muted text-muted-foreground"
            }
          >
            {userItem.activo ? "Activo" : "Inactivo"}
          </Badge>
        </TableCell>
        {isAdmin && (
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isSuperAdmin && currentUser?.email !== "admin@bioasset.pe"}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-4" /> Editar
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => toggleUser(userItem.id)}
                  disabled={isSelf || isSuperAdmin}
                >
                  {userItem.activo ? (
                    <>
                      <PowerOff className="mr-2 size-4" /> Desactivar
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 size-4" /> Activar
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                  onClick={() => setDeleteOpen(true)}
                  disabled={isSelf || isSuperAdmin}
                >
                  <Trash2 className="mr-2 size-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={handleEditUser}>
            <DialogHeader>
              <DialogTitle>Editar usuario</DialogTitle>
              <DialogDescription>
                Modifique los datos y permisos de {userItem.nombre}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 overflow-y-auto max-h-[65vh] px-1">
              <div className="grid gap-2">
                <Label htmlFor={"nombre-"}>Nombre completo</Label>
                <Input
                  id={"nombre-"}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={"email-"}>Correo electrónico</Label>
                <Input
                  id={"email-"}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={"password-"}>Nueva contraseña (opcional)</Label>
                <Input
                  id={"password-"}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Dejar en blanco para no cambiar"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={"rol-"}>Rol</Label>
                  <Select
                    value={rol}
                    onValueChange={handleEditRoleChange}
                    required
                    disabled={isSuperAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="biomedico">Biomédico</SelectItem>
                      <SelectItem value="asistencial">Asistencial</SelectItem>
                      <SelectItem value="auditor">Auditor</SelectItem>
                      <SelectItem value="estudiante">Estudiante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={"sede-"}>Sede Principal</Label>
                  <Select value={sede} onValueChange={setSede} disabled={isSuperAdmin}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas las sedes</SelectItem>
                      {sedesList.map((s) => (
                        <SelectItem key={s} value={s as string}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2 p-3 bg-muted rounded-md">
                <Label className="font-semibold">Acceso Temporal Adicional</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="grid gap-2">
                    <Label htmlFor={"sedeTemporal-"}>Sede Extra</Label>
                    <Select
                      value={sedeTemporal}
                      onValueChange={setSedeTemporal}
                      disabled={isSuperAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ninguna">Ninguna</SelectItem>
                        <SelectItem value="Todas">Todas las sedes</SelectItem>
                        {sedesList.map((s) => (
                          <SelectItem key={s} value={s as string}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={"sedeTemporalHasta-"}>Válido hasta</Label>
                    <Input
                      id={"sedeTemporalHasta-"}
                      type="date"
                      value={sedeTemporalHasta}
                      onChange={(e) => setSedeTemporalHasta(e.target.value)}
                      disabled={isSuperAdmin || sedeTemporal === "Ninguna"}
                      required={sedeTemporal !== "Ninguna"}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={"accesoHasta-"}>Expiración de Cuenta (Opcional)</Label>
                <Input
                  id={"accesoHasta-"}
                  type="date"
                  value={accesoHasta}
                  onChange={(e) => setAccesoHasta(e.target.value)}
                  disabled={isSuperAdmin}
                />
              </div>

              <div className="col-span-full pt-4">
                <Label>Permisos Granulares (Sobrescribir por defecto)</Label>
                <div className="mt-2 border rounded-md overflow-hidden text-sm">
                  <table className="w-full text-left">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Módulo</th>
                        <th className="px-3 py-2 font-medium text-center">Ver</th>
                        <th className="px-3 py-2 font-medium text-center">Editar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(Object.keys(permisos) as Array<keyof UserPermissions>).map((k) => (
                        <tr key={k}>
                          <td className="px-3 py-2 capitalize">{k}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={permisos[k].view}
                              disabled={isSuperAdmin}
                              onChange={(e) =>
                                setPermisos({
                                  ...permisos,
                                  [k]: { ...permisos[k], view: e.target.checked },
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={permisos[k].edit}
                              disabled={isSuperAdmin}
                              onChange={(e) =>
                                setPermisos({
                                  ...permisos,
                                  [k]: { ...permisos[k], edit: e.target.checked },
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente a {userItem.nombre} del
              sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await deleteUser(userItem.id);
                  toast.success("Usuario eliminado");
                } catch {
                  toast.error("Error al eliminar");
                }
              }}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
