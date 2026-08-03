import { Link } from "wouter";
import { useAdminAuth } from "@/lib/admin-auth";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Lock } from "lucide-react";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAuthed, loading } = useAdminAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground" data-testid="admin-gate-loading">
        מאמת הרשאה...
      </div>
    );
  }
  if (!isAuthed) {
    return (
      <Card dir="rtl" className="max-w-md mx-auto p-8 mt-12 text-center space-y-4" data-testid="admin-gate-blocked">
        <div className="flex justify-center">
          <span className="rounded-full bg-muted p-3 text-foreground/70">
            <Lock className="w-6 h-6" />
          </span>
        </div>
        <h2 className="text-lg font-semibold">דרוש חיבור פנימי</h2>
        <p className="text-sm text-muted-foreground">
          הדף הזה זמין רק לחברי הצוות. ההתחברות אנונימית — היא קיימת רק בזיכרון הדפדפן הנוכחי.
        </p>
        <Button asChild className="w-full">
          <Link href="/login" data-testid="link-go-login">כניסה למערכת</Link>
        </Button>
      </Card>
    );
  }
  return <>{children}</>;
}
