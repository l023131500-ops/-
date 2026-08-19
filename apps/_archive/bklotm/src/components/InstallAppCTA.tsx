import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, Download, Share2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const InstallAppCTA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect standalone (already installed)
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(iOS);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowIOSGuide(true); // generic fallback instructions
    }
  };

  if (isStandalone || installed) return null;

  return (
    <>
      <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-y border-border">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative overflow-hidden rounded-3xl bg-card border-2 border-primary/30 shadow-2xl p-8 md:p-10">
              {/* Glow */}
              <motion.div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/20 blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div
                className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-secondary/20 blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 4, repeat: Infinity, delay: 2 }}
              />

              <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6">
                <motion.div
                  className="w-20 h-20 mx-auto md:mx-0 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl"
                  animate={{ y: [0, -6, 0], rotate: [0, 3, -3, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Smartphone className="w-10 h-10 text-primary-foreground" />
                </motion.div>

                <div className="text-center md:text-right">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
                    📱 התקינו את בקלות כאפליקציה
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    גישה מהירה ממסך הבית, ללא צורך בהורדה מחנות האפליקציות. מותאם במלואו למובייל.
                  </p>
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleInstall}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-base px-6 py-6 rounded-xl shadow-lg w-full md:w-auto"
                  >
                    <Download className="w-5 h-5" />
                    התקן כאפליקציה
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              {isIOS ? "התקנה במכשיר אייפון" : "הוסף למסך הבית"}
            </DialogTitle>
            <DialogDescription>
              עקבו אחר השלבים הבאים כדי להתקין את האפליקציה
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">1</div>
              <div className="flex-1 flex items-center gap-2 text-sm">
                <span>לחצו על כפתור</span>
                <Share2 className="w-4 h-4 text-primary inline" />
                <span>"שתף" בדפדפן</span>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">2</div>
              <div className="flex-1 flex items-center gap-2 text-sm">
                <span>בחרו</span>
                <Plus className="w-4 h-4 text-primary inline" />
                <span>"הוסף למסך הבית"</span>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">3</div>
              <div className="flex-1 text-sm">
                לחצו "הוסף" - האפליקציה תופיע במסך הבית שלכם 🎉
              </div>
            </div>
            <Button onClick={() => setShowIOSGuide(false)} className="w-full mt-2">
              <X className="w-4 h-4 ml-2" />
              סגור
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppCTA;
