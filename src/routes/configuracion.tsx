import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Moon, Sun, MapPin, Palette, Mail, Send } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBio } from "@/lib/bioasset/store";
import { fetchApi } from "@/lib/bioasset/apiClient";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración | BIOASSET" },
      { name: "description", content: "Ajustes del sistema y catálogos." },
    ],
  }),
  component: ConfiguracionPage,
});

function ConfiguracionPage() {
  const { theme, setTheme, isAdmin } = useBio();
  const [sendingReport, setSendingReport] = useState(false);

  const handleSendDailyReport = async () => {
    setSendingReport(true);
    try {
      await fetchApi("/alertas/trigger-daily", { method: "POST" });
      toast.success("Reporte diario enviado exitosamente a tu correo electrónico.");
    } catch (err: any) {
      toast.error(err.message || "Error al enviar el reporte diario.");
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <AppShell title="Configuración" description="Ajustes generales del sistema, notificaciones y catálogos.">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-[var(--shadow-card)] transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="size-5 text-primary" />
              <CardTitle>Apariencia</CardTitle>
            </div>
            <CardDescription>Personaliza cómo se ve la aplicación en tu dispositivo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Modo nocturno</Label>
                <p className="text-sm text-muted-foreground">
                  Activa la interfaz oscura para reducir la fatiga visual.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="size-4 text-muted-foreground" />
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
                <Moon className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)] transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              <CardTitle>Notificaciones y Reportes</CardTitle>
            </div>
            <CardDescription>Generación de resúmenes operativos por correo electrónico.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Reporte Diario Consolidado</Label>
                <p className="text-sm text-muted-foreground">
                  Envía el resumen operativo de KPIs, alertas y mantenimientos a tu correo.
                </p>
              </div>
              <Button onClick={handleSendDailyReport} disabled={sendingReport} variant="outline" className="gap-2">
                <Send className="size-4" />
                {sendingReport ? "Enviando..." : "Enviar Ahora"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="shadow-[var(--shadow-card)] transition-all hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" />
                <CardTitle>Catálogos</CardTitle>
              </div>
              <CardDescription>Administra los catálogos y referencias del sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Ubicaciones y áreas</Label>
                  <p className="text-sm text-muted-foreground">
                    Gestiona las áreas donde se asignan los equipos.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/ubicaciones">Gestionar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

