import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  /*
    בחירת הערכה עברה ל-‎index.html‎, לסקריפט שרץ לפני הציור הראשון.

    כאן היא ישבה ב-‎useEffect‎, כלומר רצה רק אחרי שReact נטען, נפרסר ורינדר —
    ובעמוד שה-LCP שלו 3.5 שניות זה אומר שמשתמש בערכה כהה ראה מסך לבן מלא כל
    הדרך ואז הבזק. ‎dir‎ ו-‎lang‎ ממילא כתובים ב-HTML עצמו, ולכן ההשמה כאן
    הייתה כפילות שרצה אחרי הזמן.
  */
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
