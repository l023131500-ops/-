import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Share, MoreVertical, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 container mx-auto px-6 text-center py-20">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-teal flex items-center justify-center mb-6">
              <Smartphone className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-black text-foreground mb-3">האפליקציה כבר מותקנת! ✅</h1>
            <p className="font-body text-muted-foreground">אתם כבר משתמשים באיגוד השיעורים כאפליקציה.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center mb-6 shadow-lg">
            <Download className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-black text-foreground mb-3">התקנת האפליקציה</h1>
          <p className="font-body text-muted-foreground mb-8">הוסיפו את איגוד השיעורים למסך הבית של הטלפון — ללא צורך בחנות אפליקציות!</p>

          {deferredPrompt && (
            <Button onClick={handleInstall} className="bg-gradient-teal text-primary-foreground font-display font-black py-6 px-8 text-lg rounded-2xl gap-2 mb-8">
              <Download className="w-5 h-5" /> התקן עכשיו
            </Button>
          )}

          <div className="bg-card rounded-2xl border border-border p-6 text-right space-y-6">
            {isIOS ? (
              <>
                <h3 className="font-display text-lg font-bold text-foreground">הוראות ל-iPhone / iPad</h3>
                <div className="space-y-4 font-body text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">1</div>
                    <p>לחצו על כפתור <Share className="w-4 h-4 inline text-blue-500" /> <strong>"שיתוף"</strong> בתחתית הדפדפן (Safari)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">2</div>
                    <p>גללו למטה ובחרו <PlusSquare className="w-4 h-4 inline" /> <strong>"הוסף למסך הבית"</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">3</div>
                    <p>אשרו את ההתקנה — זהו! 🎉</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-foreground">הוראות לאנדרואיד</h3>
                <div className="space-y-4 font-body text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">1</div>
                    <p>לחצו על <MoreVertical className="w-4 h-4 inline" /> <strong>שלוש הנקודות</strong> בפינה העליונה של הדפדפן</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">2</div>
                    <p>בחרו <strong>"התקן אפליקציה"</strong> או <strong>"הוסף למסך הבית"</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">3</div>
                    <p>אשרו — האפליקציה תופיע במסך הבית! 🎉</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Install;
