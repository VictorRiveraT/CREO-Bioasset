import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Route as RouteIcon,
  Users,
  Wrench,
  Sun,
  Moon,
  FileText,
  Settings,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBio } from "@/lib/bioasset/store";
import { cn } from "@/lib/utils";

import type { UserPermissions } from "@/lib/bioasset/types";

type NavItem = {
  to: string;
  label: string;
  icon: any;
  module?: keyof UserPermissions;
};

const NAV: NavItem[] = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/equipos", label: "Inventario", icon: Boxes, module: "inventario" },
  { to: "/trazabilidad", label: "Movimientos", icon: RouteIcon, module: "movimientos" },
  { to: "/mantenimiento", label: "Mantenimiento", icon: Wrench, module: "mantenimiento" },
  { to: "/ubicaciones", label: "Ubicaciones", icon: MapPin, module: "ubicaciones" },
  { to: "/incidencias", label: "Incidencias", icon: AlertCircle, module: "incidencias" },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle, module: "alertas" },
  { to: "/reportes", label: "Reportes", icon: FileText, module: "reportes" },
  { to: "/usuarios", label: "Usuarios", icon: Users, module: "usuarios" },
  { to: "/configuracion", label: "Configuración", icon: Settings, module: "configuracion" },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { canView } = useBio();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.filter(item => !item.module || canView(item.module)).map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground text-[#F2B705]", // Amber text when active
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex flex-col gap-1 px-6 py-8">
      {/* TODO: reemplazar con logo SVG oficial */}
      <div className="text-4xl font-bold tracking-tight text-sidebar-foreground mb-4">
        Creo<span className="text-[#F2B705]">+</span>
      </div>
      <p className="text-sm font-medium text-[#F2B705]">BIOASSET</p>
      <p className="text-xs text-sidebar-foreground/60 leading-tight">Sistema Inteligente de Gestión y Trazabilidad de Equipos Biomédicos</p>
    </div>
  );
}

function LoginScreen() {
  const { login } = useBio();
  const [email, setEmail] = useState("admin@bioasset.pe");
  const [password, setPassword] = useState("bioasset");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = await login(email, password);
    if (err) setError(err);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md shadow-[var(--shadow-card)]">
        <CardHeader className="items-center text-center">
          <div className="text-5xl font-bold tracking-tight mb-2">
            Creo<span className="text-[#F2B705]">+</span>
          </div>
          <CardTitle className="text-2xl mt-4 text-[#F2B705]">BIOASSET</CardTitle>
          <CardDescription>
            Creamos posibilidades para una mejor salud.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-left block">Correo institucional</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-left block">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-[#F2B705] text-black hover:bg-[#DCA004]">
              Iniciar sesión
            </Button>
          </form>
          <div className="mt-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Cuentas de demostración</p>
            <p>Admin: admin@bioasset.pe</p>
            <p>Biomédico: biomedico@bioasset.pe</p>
            <p>Asistencial: luis.ramirez@bioasset.pe</p>
            <p>Contraseña: bioasset</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { ready, user, logout } = useBio();
  const [open, setOpen] = useState(false);

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!user) return <LoginScreen />;

  return (
    <div className="flex min-h-screen w-full bg-background transition-colors duration-200">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <Brand />
        <NavList />
        <div className="mt-auto border-t border-sidebar-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground">
              {user.nombre.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-sidebar-foreground truncate w-32">{user.nombre}</p>
              <p className="text-xs capitalize text-sidebar-foreground/60">{user.rol}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={logout}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <Brand />
              <NavList onNavigate={() => setOpen(false)} />
              <div className="mt-auto border-t border-sidebar-border p-4">
                <Button variant="secondary" size="sm" className="w-full" onClick={logout}>
                  <LogOut className="size-4" /> Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="min-w-0 flex-1 flex items-center justify-between">
            <div>
              <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="truncate text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Quick Role Selector for DEV only */}
              {import.meta.env.DEV && (
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Dev Role:</span>
                  <select 
                    className="text-xs border rounded p-1 bg-background text-foreground"
                    value={user.rol}
                    onChange={(e) => {
                      // Hacky dev-only role switch bypassing real auth
                      user.rol = e.target.value as any;
                      window.dispatchEvent(new Event("bioasset.rolechanged"));
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="biomedico">Biomédico</option>
                    <option value="asistencial">Asistencial</option>
                    <option value="auditor">Auditor</option>
                    <option value="estudiante">Estudiante</option>
                  </select>
                </div>
              )}
              
            </div>
          </div>
          {actions}
        </header>
        <main className="flex-1 space-y-6 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
