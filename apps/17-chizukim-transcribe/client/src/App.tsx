import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import RecordingsPage from "@/pages/recordings";
import RecordingDetailPage from "@/pages/recording-detail";
import UploadPage from "@/pages/upload";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={RecordingsPage} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/recording/:id" component={RecordingDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
