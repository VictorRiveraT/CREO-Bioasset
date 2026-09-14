import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/bioasset/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, QrCode, LogIn } from "lucide-react";
import { useBio } from "@/lib/bioasset/store";
import { Scanner } from "@yudiel/react-qr-scanner";

export const Route = createFileRoute("/qr/$id")({
  component: PublicQRPage,
});

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2 border-b last:border-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

function PublicQRPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { login, user, db, ready } = useBio();
  const [equipo, setEquipo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Login state
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Scan state
  const [scanOpen, setScanOpen] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    // If logged in AND has access to this equipment, redirect
    if (user) {
      const hasAccess = db.equipment.some((e) => e.id === id);
      if (hasAccess) {
        navigate({ to: `/equipos/${id}` });
        return;
      }
      // If logged in but NO access to this sede, stay here (show basic info)
    }

    setLoading(true);
    fetchApi(`/inventario/activos/public/${id}`)
      .then((res) => {
        setEquipo(res.activo);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("No se pudo cargar la información del equipo. Es posible que no exista.");
      })
      .finally(() => setLoading(false));
  }, [id, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const err = await login(email, password);
    if (err) {
      setLoginError(err);
    } else {
      setLoginOpen(false);
      // The useEffect will automatically redirect because `user` is now set
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Cargando datos del equipo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              Creo<span className="text-[#F2B705]">+</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">BIOASSET Público</p>
          </div>
          {user ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate({ to: '/equipos' })}>
              Volver al inventario
            </Button>
          ) : (
            <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="size-4" /> Iniciar sesión
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Acceso a personal</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {loginError && <p className="text-sm text-destructive">{loginError}</p>}
                  <Button type="submit" className="w-full bg-[#F2B705] text-black hover:bg-[#DCA004]">
                    Ingresar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {error || !equipo ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {error || "Equipo no encontrado"}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="shadow-md border-t-4 border-t-[#F2B705]">
              <CardHeader className="pb-3 text-center">
                <CardTitle className="text-xl">{equipo.nombre}</CardTitle>
                <p className="text-sm text-muted-foreground">{equipo.codigo}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <Field label="Categoría" value={equipo.categoria} />
                  <Field label="Marca" value={equipo.marca} />
                  <Field label="Modelo" value={equipo.modelo} />
                  <Field label="Serie" value={equipo.serie} />
                  <Field label="Ubicación" value={equipo.ubicacionNombre} />
                  <Field
                    label="Estado Actual"
                    value={
                      <span
                        className={
                          equipo.estado === "Inoperativo"
                            ? "text-destructive font-bold"
                            : "text-emerald-600 font-bold"
                        }
                      >
                        {equipo.estado}
                      </span>
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900 shadow-sm">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 shrink-0">
                  <Phone className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                    ¿Fallas o problemas?
                  </h4>
                  <p className="text-sm text-blue-800/80 dark:text-blue-400/80 mt-1">
                    Comunícate con soporte técnico al número gratuito:
                  </p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                    01-555-4321
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={scanOpen} onOpenChange={setScanOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="w-full gap-2 py-6 text-base" size="lg">
              <QrCode className="size-5" /> Escanear otro QR
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Escanear código QR</DialogTitle>
            </DialogHeader>
            <div className="mt-4 rounded-md overflow-hidden bg-black/10">
              {camError && (
                <div className="p-3 text-sm text-destructive text-center bg-destructive/15">
                  Error de cámara: Asegúrate de otorgar permisos o revisa si tu equipo cuenta con una conectada.
                </div>
              )}
              <Scanner 
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const value = result[0].rawValue;
                    // Extract ID from URL if it's a URL, or just use it directly
                    const scannedId = value.includes("/") ? value.split("/").pop() : value;
                    if (scannedId) {
                      setScanOpen(false);
                      navigate({ to: `/qr/${scannedId}` });
                    }
                  }
                }}
                onError={(err: any) => {
                  console.error("Camera Error:", err);
                  setCamError(err?.name || err?.message || 'Error');
                }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Apunta la cámara al código QR de otro equipo.
            </p>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
