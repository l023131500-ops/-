import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CopyButtonProps {
  text: string;
  label: string;
  testId: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm";
}

export function CopyButton({ text, label, testId, variant = "outline", size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "הועתק", description: label });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "לא הצלחנו להעתיק", variant: "destructive" });
    }
  }

  return (
    <Button
      type="button"
      onClick={handleCopy}
      variant={variant}
      size={size}
      data-testid={testId}
      className="gap-2"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      <span>{label}</span>
    </Button>
  );
}
