import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Download, ExternalLink, X } from "lucide-react";

interface ImagePreviewDialogProps {
  src: string | null;
  onClose: () => void;
  title?: string;
}

export function ImagePreviewDialog({
  src,
  onClose,
  title = "Evidencia Fotográfica de Mantenimiento",
}: ImagePreviewDialogProps) {
  if (!src) return null;

  return (
    <Dialog open={Boolean(src)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] p-3 sm:p-5 flex flex-col items-center bg-card text-card-foreground border shadow-2xl z-[120] gap-3">
        <DialogHeader className="w-full pb-2 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Camera className="size-4 text-primary" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full flex items-center justify-center bg-black/5 dark:bg-black/40 rounded-xl overflow-hidden max-h-[70vh] p-1 border border-border/50">
          <img
            src={src}
            alt="Evidencia ampliada"
            className="max-h-[68vh] w-auto max-w-full rounded-lg object-contain shadow-sm select-none"
          />
        </div>

        <DialogFooter className="w-full pt-2 border-t flex flex-row items-center justify-between sm:justify-between">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Fotografía adjunta como evidencia técnica
          </span>
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <a
              href={src}
              download="evidencia-mantenimiento.jpg"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-1 cursor-pointer transition-colors"
            >
              <Download className="size-3.5 mr-1" /> Descargar
            </a>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 text-xs cursor-pointer"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
