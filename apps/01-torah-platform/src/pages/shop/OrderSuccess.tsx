import { Link } from "react-router-dom";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

export default function OrderSuccess() {
  const clear = useCart((s) => s.clear);
  useEffect(() => { clear(); }, [clear]);
  return (
    <div className="container mx-auto px-4 py-20 max-w-xl text-center">
      <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto mb-4" />
      <h1 className="font-heading text-3xl mb-3">ההזמנה התקבלה!</h1>
      <p className="text-muted-foreground mb-6">תודה רבה. נשלח אליך אישור לדוא״ל ונחזור בהקדם להשלמת המשלוח.</p>
      <div className="flex gap-3 justify-center">
        <Button asChild><Link to="/">חזור לעמוד הבית</Link></Button>
        <Button asChild variant="outline"><Link to="/shop">המשך קניות</Link></Button>
      </div>
    </div>
  );
}
