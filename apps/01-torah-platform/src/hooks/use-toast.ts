// Compatibility shim: maps Guru-Portal's useToast API to sonner
import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

function toast(opts: ToastOptions) {
  const msg = opts.title || "";
  const desc = opts.description;
  if (opts.variant === "destructive") {
    sonnerToast.error(msg, desc ? { description: desc } : undefined);
  } else {
    sonnerToast.success(msg, desc ? { description: desc } : undefined);
  }
}

export function useToast() {
  return { toast };
}

export { toast };
