import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, Sun, MapPin, Palette } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBio } from "@/lib/bioasset/store";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuracin | BIOASSET" },
      { name: "description", content: "Ajustes del sistema y catlogos." },
    ],
  }),
  component: ConfiguracionPage,
});

function ConfiguracionPage() {
  const { theme, setTheme, isAdmin } = useBio();

  return (
    <AppShell
      title="Configuracin"
      description="Ajustes generales del sistema y catlogos."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-[var(--shadow-card)] transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="size-5 text-primary" />
              <CardTitle>Apariencia</CardTitle>
            </div>
            <CardDescription>Personaliza cmo se ve la aplicacin en tu dispositivo.</CardDescription>
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

        {isAdmin && (
          <Card className="shadow-[var(--shadow-card)] transition-all hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" />
                <CardTitle>Catlogos</CardTitle>
              </div>
              <CardDescription>Administra los catlogos y referencias del sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Ubicaciones y reas</Label>
                  <p className="text-sm text-muted-foreground">
                    Gestiona las reas donde se asignan los equipos.
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
