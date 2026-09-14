import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scanner } from "@yudiel/react-qr-scanner";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/qr/")({
  component: QRScannerIndexPage,
});

function QRScannerIndexPage() {
  const navigate = useNavigate();
  const [camError, setCamError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col text-center">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            Creo<span className="text-[#F2B705]">+</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Escáner de Equipos</p>
        </div>

        <Card className="shadow-md border-t-4 border-t-[#F2B705]">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-xl">Escanear código QR</CardTitle>
            <p className="text-sm text-muted-foreground">
              Apunta la cámara al código QR de un equipo biomédico para ver sus detalles.
            </p>
          </CardHeader>
          <CardContent>
            {camError && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p>No se pudo acceder a la cámara. {camError === 'NotAllowedError' ? 'Debes otorgar permisos en el navegador.' : 'Verifica que tu equipo tenga una cámara conectada y no esté en uso.'}</p>
              </div>
            )}
            <div className="mt-2 rounded-md overflow-hidden bg-black/10">
              <Scanner 
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const value = result[0].rawValue;
                    // Extract ID from URL if it's a URL, or just use it directly
                    const scannedId = value.includes("/") ? value.split("/").pop() : value;
                    if (scannedId) {
                      navigate({ to: `/qr/${scannedId}` });
                    }
                  }
                }}
                onError={(err: any) => {
                  console.error("Camera Error:", err);
                  setCamError(err?.name || err?.message || 'Error desconocido');
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
