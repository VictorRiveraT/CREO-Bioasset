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

import { fetchApi } from "@/lib/bioasset/apiClient";

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

import { Pencil, Trash2, Power, PowerOff, MoreHorizontal, Search, Eye, EyeOff } from "lucide-react";

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

  const [showPassword, setShowPassword] = useState(false);

  const [rol, setRol] = useState<Role>("asistencial");

  const [sede, setSede] = useState(user?.sede || "Todas");

  const [accesoHasta, setAccesoHasta] = useState("");

  const [sedeTemporal, setSedeTemporal] = useState("Ninguna");

  const [sedeTemporalHasta, setSedeTemporalHasta] = useState("");

  const [accesosExtra, setAccesosExtra] = useState<{sede: string, hasta: string}[]>([]);

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

        sedeTemporal: JSON.stringify(accesosExtra),

        sedeTemporalHasta: null,

      });

      toast.success("Usuario registrado exitosamente");

      setOpen(false);

      setNombre("");

      setEmail("");

      setPassword("");

      setRol("asistencial");

      setSede(user?.sede || "Todas");

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

                    <div className="relative w-full">

                      <Input

                        id="password"

                        type={showPassword ? "text" : "password"}

                        value={password}

                        onChange={(e) => setPassword(e.target.value)}

                        required

                        className="pr-10"

                      />

                      <button

                        type="button"

                        onClick={() => setShowPassword(!showPassword)}

                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"

                      >

                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}

                      </button>

                    </div>

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

                          {user?.sede === "Todas" && <SelectItem value="Todas">Todas las sedes</SelectItem>}

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

                    <Label className="font-semibold">Accesos Temporales Adicionales</Label>

                    {accesosExtra.map((acceso, idx) => (

                      <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-background rounded border">

                        <span className="flex-1 text-sm">{acceso.sede}</span>

                        <span className="text-xs text-muted-foreground">Hasta: {acceso.hasta}</span>

                        <button type="button" onClick={() => setAccesosExtra(accesosExtra.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold px-2">X</button>

                      </div>

                    ))}

                    <div className="grid grid-cols-12 gap-2 mt-2">

                      <div className="col-span-5">

                        <Select value={sedeTemporal} onValueChange={setSedeTemporal}>

                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sede" /></SelectTrigger>

                          <SelectContent>

                            <SelectItem value="Ninguna">Ninguna</SelectItem>

                            {user?.sede === "Todas" && <SelectItem value="Todas">Todas las sedes</SelectItem>}

                            {sedesList.map((s) => (<SelectItem key={s} value={s as string}>{s}</SelectItem>))}

                          </SelectContent>

                        </Select>

                      </div>

                      <div className="col-span-5">

                        <Input

                          type="date"

                          value={sedeTemporalHasta}

                          onChange={(e) => setSedeTemporalHasta(e.target.value)}

                          className="h-8 text-xs"

                          disabled={sedeTemporal === "Ninguna"}

                        />

                      </div>

                      <div className="col-span-2">

                        <button type="button" disabled={sedeTemporal === "Ninguna" || !sedeTemporalHasta} className="w-full h-8 bg-blue-600 text-white rounded text-xs disabled:opacity-50" onClick={() => {

                          setAccesosExtra([...accesosExtra, { sede: sedeTemporal, hasta: sedeTemporalHasta }]);

                          setSedeTemporal("Ninguna");

                          setSedeTemporalHasta("");

                        }}>Agregar</button>

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

                                  disabled={k === "ubicaciones" && rol !== "admin"}

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

  const defaultP = DEFAULT_PERMISSIONS[userItem.rol as keyof typeof DEFAULT_PERMISSIONS] || {};
  const actualP = userItem.permisos || defaultP;
  const extraP: string[] = [];
  const revokedP: string[] = [];

  (Object.keys(actualP) as Array<keyof typeof actualP>).forEach((mod) => {
    const defView = (defaultP as any)[mod]?.view || false;
    const defEdit = (defaultP as any)[mod]?.edit || false;
    const actView = (actualP as any)[mod]?.view || false;
    const actEdit = (actualP as any)[mod]?.edit || false;

    const modName = String(mod);
    if (actView && !defView) extraP.push(`${modName} (ver)`);
    if (!actView && defView) revokedP.push(`${modName} (ver)`);
    if (actEdit && !defEdit) extraP.push(`${modName} (editar)`);
    if (!actEdit && defEdit) revokedP.push(`${modName} (editar)`);
  });


  const isSelf = userItem.id === currentUser?.id;



  const [editOpen, setEditOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);



  const [nombre, setNombre] = useState(userItem.nombre);

  const [email, setEmail] = useState(userItem.email);

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [rol, setRol] = useState<Role>(userItem.rol as Role);

  const [isResetting, setIsResetting] = useState(false);



  const handleForceReset = async () => {

    setIsResetting(true);

    try {

      await fetchApi(`/auth/usuarios/${userItem.id}/force-reset`, { method: "POST" });

      alert("Se forzó el restablecimiento y se envió un correo al usuario.");

    } catch(err: any) {

      alert("Error: " + err.message);

    }

    setIsResetting(false);

  };



  const [sede, setSede] = useState(userItem.sede || "Todas");

  const [accesoHasta, setAccesoHasta] = useState(

    userItem.accesoHasta ? userItem.accesoHasta.substring(0, 10) : "",

  );

  const initialAccesos = (() => {

    try {

      if (userItem.sedeTemporal && userItem.sedeTemporal.startsWith("[")) {

        return JSON.parse(userItem.sedeTemporal);

      } else if (userItem.sedeTemporal && userItem.sedeTemporal !== "Ninguna") {

        return [{ sede: userItem.sedeTemporal, hasta: userItem.sedeTemporalHasta ? userItem.sedeTemporalHasta.substring(0, 10) : "" }];

      }

    } catch(e) {}

    return [];

  })();

  const [accesosExtra, setAccesosExtra] = useState<{sede: string, hasta: string}[]>(initialAccesos);

  const [sedeTemporal, setSedeTemporal] = useState("Ninguna");

  const [sedeTemporalHasta, setSedeTemporalHasta] = useState("");



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

        sedeTemporal: JSON.stringify(accesosExtra),

        sedeTemporalHasta: null,

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

        <TableCell>
          <div className="capitalize font-medium">{userItem.rol}</div>
          {(extraP.length > 0 || revokedP.length > 0) && (
            <div className="flex flex-col mt-1 space-y-0.5">
              {extraP.map((p) => (
                <span key={p} className="text-xs text-blue-600 dark:text-blue-400 capitalize">+{p}</span>
              ))}
              {revokedP.map((p) => (
                <span key={p} className="text-xs text-red-600 dark:text-red-400 capitalize">-{p}</span>
              ))}
            </div>
          )}
        </TableCell>

        <TableCell>

          <div className="font-medium">{userItem.sede || "Todas"}</div>

          {(() => {

            try {

              if (userItem.sedeTemporal && userItem.sedeTemporal.startsWith("[")) {

                const arr = JSON.parse(userItem.sedeTemporal);

                return arr.map((x: any, i: number) => (

                  <div key={i} className="text-xs text-blue-600 dark:text-blue-400">

                    +{x.sede} (hasta {x.hasta})

                  </div>

                ));

              } else if (userItem.sedeTemporal && userItem.sedeTemporal !== "Ninguna") {

                return (

                  <div className="text-xs text-blue-600 dark:text-blue-400">

                    +{userItem.sedeTemporal} (hasta {userItem.sedeTemporalHasta?.substring(0, 10)})

                  </div>

                );

              }

            } catch(e) {}

            return null;

          })()}

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

                <div className="flex gap-2">

                  <div className="relative w-full">

                    <Input

                      id={"password-"}

                      type={showPassword ? "text" : "password"}

                      value={password}

                      onChange={(e) => setPassword(e.target.value)}

                      placeholder="Dejar en blanco para no cambiar"

                      className="pr-10"

                    />

                    <button

                      type="button"

                      onClick={() => setShowPassword(!showPassword)}

                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"

                    >

                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}

                    </button>

                  </div>

                  <Button type="button" variant="outline" onClick={handleForceReset} disabled={isResetting} className="shrink-0 text-destructive border-destructive hover:bg-destructive/10">

                    Forzar restablecimiento

                  </Button>

                </div>

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

                      {currentUser?.sede === "Todas" && <SelectItem value="Todas">Todas las sedes</SelectItem>}

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

                <Label className="font-semibold">Accesos Temporales Adicionales</Label>

                {accesosExtra.map((acceso, idx) => (

                  <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-background rounded border">

                    <span className="flex-1 text-sm">{acceso.sede}</span>

                    <span className="text-xs text-muted-foreground">Hasta: {acceso.hasta}</span>

                    {!isSuperAdmin && <button type="button" onClick={() => setAccesosExtra(accesosExtra.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold px-2">X</button>}

                  </div>

                ))}

                {!isSuperAdmin && (

                <div className="grid grid-cols-12 gap-2 mt-2">

                  <div className="col-span-5">

                    <Select value={sedeTemporal} onValueChange={setSedeTemporal}>

                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sede" /></SelectTrigger>

                      <SelectContent>

                        <SelectItem value="Ninguna">Ninguna</SelectItem>

                        {currentUser?.sede === "Todas" && <SelectItem value="Todas">Todas las sedes</SelectItem>}

                        {sedesList.map((s) => (<SelectItem key={s} value={s as string}>{s}</SelectItem>))}

                      </SelectContent>

                    </Select>

                  </div>

                  <div className="col-span-5">

                    <Input

                      type="date"

                      value={sedeTemporalHasta}

                      onChange={(e) => setSedeTemporalHasta(e.target.value)}

                      className="h-8 text-xs"

                      disabled={sedeTemporal === "Ninguna"}

                    />

                  </div>

                  <div className="col-span-2">

                    <button type="button" disabled={sedeTemporal === "Ninguna" || !sedeTemporalHasta} className="w-full h-8 bg-blue-600 text-white rounded text-xs disabled:opacity-50" onClick={() => {

                      setAccesosExtra([...accesosExtra, { sede: sedeTemporal, hasta: sedeTemporalHasta }]);

                      setSedeTemporal("Ninguna");

                      setSedeTemporalHasta("");

                    }}>Agregar</button>

                  </div>

                </div>

                )}

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

                              disabled={isSuperAdmin || (k === "ubicaciones" && rol !== "admin")}

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

                } catch(e: any) { toast.error("Error: " + (e.message || "Error al eliminar")); }

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

