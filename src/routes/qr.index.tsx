import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scanner } from "@yudiel/react-qr-scanner";
import { AlertCircle, ArrowLeft, Search, QrCode } from "lucide-react";

export const Route = createFileRoute("/qr/")({
  head: () => ({
    meta: [
      { title: "Escanear QR | BIOASSET" },
      { name: "description", content: "Escáner de código QR para equipos biomédicos" },
    ],
  }),
  component: QRScannerIndexPage,
});

function QRScannerIndexPage() {
  const navigate = useNavigate();
  const [camError, setCamError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    const scannedId = trimmed.includes("/") ? trimmed.split("/").pop() : trimmed;
    if (scannedId) {
      navigate({ to: `/qr/${scannedId}` });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/equipos" })}
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="size-4" /> Volver al inventario
          </Button>
          <span className="text-xs text-muted-foreground font-medium">BIOASSET</span>
        </div>

        <div className="flex flex-col text-center">
          <div className="text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
            <QrCode className="size-6 text-[#F2B705]" />
            <span>Creo<span className="text-[#F2B705]">+</span> BioAsset</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Escáner de Equipos Biomédicos</p>
        </div>

        <Card className="shadow-md border-t-4 border-t-[#F2B705]">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-xl">Escanear código QR</CardTitle>
            <p className="text-sm text-muted-foreground">
              Apunta la cámara al código QR de la etiqueta patrimonial para abrir su ficha técnica.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {camError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p>
                  No se pudo acceder a la cámara. {camError === "NotAllowedError" ? "Debes otorgar permisos de cámara en tu navegador." : "Verifica que tengas una cámara conectada y no esté en uso por otra app."}
                </p>
              </div>
            )}

            <div className="rounded-md overflow-hidden bg-black/10 aspect-square flex items-center justify-center relative">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const value = result[0].rawValue;
                    const scannedId = value.includes("/") ? value.split("/").pop() : value;
                    if (scannedId) {
                      navigate({ to: `/qr/${scannedId}` });
                    }
                  }
                }}
                onError={(err: any) => {
                  console.error("Camera Error:", err);
                  setCamError(err?.name || err?.message || "Error desconocido");
                }}
              />
            </div>

            {/* Manual Lookup Fallback */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2 text-center">
                ¿Problemas con la cámara? Ingresa el código patrimonial o ID manual:
              </p>
              <form onSubmit={handleManualSearch} className="flex gap-2">
                <Input
                  placeholder="Ej. BIO-001 o ID..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="h-9"
                />
                <Button type="submit" size="sm" variant="secondary" disabled={!manualCode.trim()} className="gap-1 shrink-0">
                  <Search className="size-3.5" />
                  Buscar
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
