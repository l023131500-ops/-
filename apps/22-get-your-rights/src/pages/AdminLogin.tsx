import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Lock, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { authErrorMessage } from "@/lib/authErrors";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "שגיאה בהתחברות",
        description: authErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    navigate("/admin/leads");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">כניסת מנהל</h1>
            <p className="text-sm text-muted-foreground mt-1">הזינו את פרטי ההתחברות שלכם</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-sm"
              dir="ltr"
            />
            <PasswordInput
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="text-sm"
              dir="ltr"
            />
            <Button type="submit" disabled={loading} className="w-full gap-2">
              <LogIn className="w-4 h-4" />
              {loading ? "מתחבר..." : "כניסה"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
