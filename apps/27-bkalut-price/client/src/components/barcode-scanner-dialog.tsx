import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Native BarcodeDetector isn't in the TS DOM lib yet — declare the minimal shape we use.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

export function isBarcodeScanSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
}

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
}

export function BarcodeScannerDialog({ open, onOpenChange, onDetected }: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Kept in refs so the scan loop always calls the latest handlers without
  // re-running the getUserMedia setup effect on every parent render.
  const onDetectedRef = useRef(onDetected);
  const onOpenChangeRef = useRef(onOpenChange);
  onDetectedRef.current = onDetected;
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open || !window.BarcodeDetector) return;
    let cancelled = false;
    let rafId = 0;

    (async () => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new window.BarcodeDetector!({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              cancelled = true;
              onOpenChangeRef.current(false);
              onDetectedRef.current(codes[0].rawValue);
              return;
            }
          } catch {
            // BarcodeDetector can throw transiently on an empty/blurred frame — keep scanning.
          }
          rafId = requestAnimationFrame(scan);
        };
        rafId = requestAnimationFrame(scan);
      } catch {
        if (!cancelled) setError("לא ניתן לגשת למצלמה. ודאו שנתתם הרשאת מצלמה לדפדפן.");
      }
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-barcode-scanner">
        <DialogHeader>
          <DialogTitle>סריקת ברקוד</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive" data-testid="text-barcode-scan-error">{error}</p>
        ) : (
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video" data-testid="barcode-scan-viewport">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-px bg-primary/70" />
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">כוונו את המצלמה לברקוד המוצר</p>
      </DialogContent>
    </Dialog>
  );
}
