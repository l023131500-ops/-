import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="font-heading text-7xl text-primary mb-3">404</div>
        <h1 className="font-heading text-2xl mb-2">העמוד לא נמצא</h1>
        <p className="text-muted-foreground mb-6">ייתכן שהכתובת השתנתה או שהעמוד נמחק</p>
        <Button asChild><Link to="/"><Home className="ml-2 h-4 w-4" /> חזור לעמוד הבית</Link></Button>
      </div>
    </div>
  );
}
