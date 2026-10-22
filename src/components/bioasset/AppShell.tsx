import { Link, useRouterState } from "@tanstack/react-router";

import { useState, type ReactNode, useEffect, useMemo } from "react";

import {
  Activity,
  AlertTriangle,
  Boxes,
  LayoutDashboard,
  LogOut,
  Eye,
  EyeOff,
  MapPin,
  Menu,
  Route as RouteIcon,
  Users,
  Wrench,
  Sun,
  Moon,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
  QrCode,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useBio } from "@/lib/bioasset/store";

import { fetchApi } from "@/lib/bioasset/apiClient";

import { cn } from "@/lib/utils";

import { NotificationBell } from "./NotificationBell";

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
  { to: "/qr", label: "Escanear QR", icon: QrCode },
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
      {NAV.filter((item) => !item.module || canView(item.module)).map((item) => {
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

      <p className="text-xs text-sidebar-foreground/60 leading-tight">
        Sistema Inteligente de Gestión y Trazabilidad de Equipos Biomédicos
      </p>
    </div>
  );
}

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_=+.-]).{9,}$/;

function LoginScreen() {
  const { login } = useBio();

  const searchParams = new URLSearchParams(window.location.search);

  const resetEmail = searchParams.get("reset_email");

  const resetToken = searchParams.get("reset_token");

  // Validar vigencia del token de recuperacion (15 minutos)
  const tokenStatus = useMemo(() => {
    if (!resetEmail) return null;
    if (!resetToken) return "missing_token";
    try {
      const parts = resetToken.split(".");
      if (parts.length !== 3) return "invalid";
      const payload = JSON.parse(atob(parts[1] || ""));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return "expired";
      }
      return "valid";
    } catch {
      return "invalid";
    }
  }, [resetEmail, resetToken]);

  const timeRemainingText = useMemo(() => {
    if (!resetToken) return null;
    try {
      const parts = resetToken.split(".");
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1] || ""));
      if (!payload.exp) return null;
      const diffMs = payload.exp * 1000 - Date.now();
      if (diffMs <= 0) return null;
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins > 60) {
        const hours = Math.round(diffMins / 60);
        return `${hours} hora${hours > 1 ? "s" : ""}`;
      }
      return `${diffMins} minuto${diffMins > 1 ? "s" : ""}`;
    } catch {
      return null;
    }
  }, [resetToken]);

  const [view, setView] = useState<"login" | "recover" | "reset">(resetEmail ? "reset" : "login");
  const [email, setEmail] = useState(resetEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleQuickResend = async () => {
    if (!email) {
      setView("recover");
      return;
    }
    setError(null);
    setSuccess(null);
    setIsSending(true);
    try {
      await fetchApi("/auth/recover", { method: "POST", body: JSON.stringify({ email }) });
      setSuccess(`¡Enlace seguro enviado a ${email}! Revisa tu bandeja de entrada.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = await login(email, password);
    if (err) setError(err);
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await fetchApi("/auth/recover", { method: "POST", body: JSON.stringify({ email }) });
      setSuccess("Se ha enviado un enlace de recuperación a tu correo (vigencia de 15 minutos).");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    setSuccess(null);

    if (tokenStatus === "expired") {
      setError(
        "El enlace de recuperación ha expirado (validez de 15 minutos). Por favor solicita uno nuevo.",
      );
      return;
    }

    if (tokenStatus === "missing_token" || tokenStatus === "invalid") {
      setError("El enlace no contiene un token de seguridad válido. Por favor solicita uno nuevo.");
      return;
    }

    if (!passwordRegex.test(password)) {
      setError(
        "La contraseña debe tener al menos 9 caracteres, 1 mayúscula, 1 número y 1 símbolo especial.",
      );

      return;
    }

    try {
      await fetchApi("/auth/reset", {
        method: "POST",
        body: JSON.stringify({ email, newPassword: password, token: resetToken }),
      });

      setSuccess("Contraseña restablecida exitosamente. Redirigiendo al inicio de sesión...");

      setPassword("");

      setTimeout(() => {
        window.location.href = "/"; // Refresh to clear URL params and go to login
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md shadow-[var(--shadow-card)]">
        <CardHeader className="items-center text-center pb-2">
          <div className="text-5xl font-bold tracking-tight">
            Creo<span className="text-[#F2B705]">+</span>
          </div>

          <CardTitle className="text-2xl text-[#F2B705] mt-0">BIOASSET</CardTitle>

          <CardDescription className="mt-2">
            Creamos posibilidades para una mejor salud.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {view === "login" && (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-left block">
                  Correo institucional
                </Label>

                <Input
                  id="email"

                  type="email"

                  value={email}

                  onChange={(e) => setEmail(e.target.value)}

                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-left block">
                  Contraseña
                </Label>

                <div className="relative">
                  <Input
                    id="password"

                    type={showPassword ? "text" : "password"}

                    value={password}

                    onChange={(e) => setPassword(e.target.value)}

                    required
                  />

                  <button
                    type="button"

                    onClick={() => setShowPassword(!showPassword)}

                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                <div className="text-right">
                  <button
                    type="button"

                    onClick={() => {
                      setView("recover");
                      setError(null);
                      setSuccess(null);
                    }}

                    className="text-xs text-blue-600 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium">
                  <AlertCircle className="size-4 shrink-0" />

                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 font-medium">
                  <CheckCircle2 className="size-4 shrink-0" />

                  <span>{success}</span>
                </div>
              )}

              <Button type="submit" className="w-full bg-[#F2B705] text-black hover:bg-[#DCA004]">
                Iniciar sesión
              </Button>
            </form>
          )}

          {view === "recover" && (
            <form className="space-y-4" onSubmit={handleRecover}>
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">Recuperar contraseña</h3>

                <p className="text-sm text-muted-foreground">
                  Ingresa tu correo y te enviaremos un enlace.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recover-email" className="text-left block">
                  Correo institucional
                </Label>

                <Input
                  id="recover-email"

                  type="email"

                  value={email}

                  onChange={(e) => setEmail(e.target.value)}

                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium">
                  <AlertCircle className="size-4 shrink-0" />

                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 font-medium">
                  <CheckCircle2 className="size-4 shrink-0" />

                  <span>{success}</span>
                </div>
              )}

              <Button type="submit" className="w-full bg-[#F2B705] text-black hover:bg-[#DCA004]">
                Enviar enlace
              </Button>

              <div className="text-center mt-2">
                <button
                  type="button"

                  onClick={() => {
                    setView("login");
                    setError(null);
                    setSuccess(null);
                  }}

                  className="text-xs text-muted-foreground hover:underline"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}

          {view === "reset" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">Restablecer contraseña</h3>
                <p className="text-sm text-muted-foreground">
                  Ingresa tu nueva contraseña para {email}.
                </p>
              </div>

              {tokenStatus === "expired" ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3 rounded-lg bg-destructive/15 p-4 text-destructive">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Enlace de recuperación expirado</p>
                      <p className="text-xs leading-relaxed text-destructive/90">
                        Por motivos de seguridad, los enlaces para restablecer contraseña expiran
                        después de 15 minutos. Debes generar uno nuevo.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setView("recover");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="w-full bg-[#F2B705] text-black hover:bg-[#DCA004]"
                  >
                    Solicitar nuevo enlace
                  </Button>
                </div>
              ) : tokenStatus === "missing_token" || tokenStatus === "invalid" ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3 rounded-lg bg-amber-500/15 p-4 text-amber-800">
                    <AlertCircle className="size-5 shrink-0 mt-0.5 text-amber-700" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Enlace no válido o sin token</p>
                      <p className="text-xs leading-relaxed text-amber-900">
                        Por motivos de seguridad y control de expiración temporal, el enlace
                        requiere un token criptográfico generado por el sistema.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium text-left">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 font-medium text-left">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleQuickResend}
                    disabled={isSending}
                    className="w-full bg-[#F2B705] text-black hover:bg-[#DCA004]"
                  >
                    {isSending
                      ? "Enviando enlace..."
                      : "Reenviar enlace seguro con token a este correo"}
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setView("login");
                        setError(null);
                        setSuccess(null);
                      }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Volver al inicio de sesión
                    </button>
                  </div>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleReset}>
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-800 flex items-center gap-1.5 text-left">
                    <Clock className="size-3.5 shrink-0 text-amber-600" />
                    <span>
                      Enlace verificado y protegido (
                      {timeRemainingText ? `válido por ${timeRemainingText}` : "vigencia temporal"}
                      ).
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-left block">Correo</Label>
                    <Input
                      type="email"
                      value={email}
                      readOnly
                      className="bg-muted text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-left block">
                      Nueva contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight text-left">
                      Debe tener mínimo 9 caracteres, 1 mayúscula, 1 número y 1 carácter especial.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium text-left">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 font-medium text-left">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-[#F2B705] text-black hover:bg-[#DCA004]"
                  >
                    Confirmar
                  </Button>
                </form>
              )}
            </div>
          )}
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

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchApi("/auth/me");
        if (res && res.user && res.user.activo === false) {
          localStorage.removeItem("bioasset.token");
          window.location.href = "/";
        }
      } catch (e) {
        // api throws on 401
      }
    }, 5000); // 5s poll
    return () => clearInterval(interval);
  }, [user]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user && window.location.search.includes("reset_email")) {
      logout();
    }
  }, [user, logout]);

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
              {(user?.nombre || user?.email || "U").charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="text-sm font-medium text-sidebar-foreground truncate w-32">
                {user.nombre}
              </p>

              <p className="text-xs capitalize text-sidebar-foreground/60">{user.rol}</p>
            </div>
          </div>

          <Button
            variant="ghost"

            size="icon"

            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"

            onClick={logout}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b bg-card/90 px-3 py-2.5 backdrop-blur sm:px-6 md:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden shrink-0">
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

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base sm:text-lg font-semibold tracking-tight">
                  {title}
                </h1>
                {description && (
                  <p className="truncate text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <NotificationBell />
              {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}
            </div>
          </div>

          {actions && (
            <div className="mt-2.5 flex items-center justify-end sm:hidden pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 w-full justify-end [&>*]:shrink-0">
                {actions}
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 space-y-4 p-3 sm:space-y-6 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
