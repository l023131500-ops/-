import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FeatureLocked = () => (
  <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
    <ShieldOff className="w-12 h-12 text-muted-foreground" />
    <h2 className="font-heading text-xl font-bold text-foreground">התכונה הזו אינה זמינה</h2>
    <p className="text-muted-foreground max-w-sm">
      הניהול השבית עבורך את הגישה לעמוד הזה. פנה להנהלה אם לדעתך זו טעות.
    </p>
    <Link to="/portal">
      <Button variant="outline">חזרה ללוח הבקרה</Button>
    </Link>
  </div>
);

export default FeatureLocked;
