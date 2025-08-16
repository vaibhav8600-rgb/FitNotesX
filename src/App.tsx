import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useSettingsStore } from "@/store/settingsStore";
import { useExercisesStore } from "@/store/exercisesStore";
import { useWorkoutsStore } from "@/store/workoutsStore";
import { seedDatabase } from "@/db/seed";

// Pages
import Index from "./pages/Index";
import Home from "./pages/Home";
import Exercises from "./pages/Exercises";
import Progress from "./pages/Progress";
import Body from "./pages/Body";
import More from "./pages/More";
import Training from "./pages/Training";
import Routines from "./pages/Routines";
import Settings from "./pages/Settings";
import Export from "./pages/Export";
import Import from "./pages/Import";
import Backup from "./pages/Backup";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";
import { hasSeededGuard, markSeededGuard } from "@/app/bootstrap"; // NEW

const queryClient = new QueryClient();

function AppContent() {
  const { loadSettings, setSeedingDone } = useSettingsStore();
  const { loadExercises } = useExercisesStore();
  const { loadWorkouts } = useWorkoutsStore();

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      await loadSettings();
      await loadExercises();
      await loadWorkouts();
      
       // UPDATED: Re-read fresh value AFTER loadSettings()
      const seededNow = useSettingsStore.getState().seedingDone; // NEW
      const guard = hasSeededGuard(); // NEW

      if (!seededNow && !guard) { // NEW
        await seedDatabase();
        await setSeedingDone(true);
        markSeededGuard(); // NEW
        await loadExercises();
        await loadWorkouts();
      }
    };
    
    initializeApp();
  }, [loadSettings, loadExercises, loadWorkouts, setSeedingDone]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground pb-16">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/training/:exerciseId?" element={<Training />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/body" element={<Body />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/more" element={<More />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/export" element={<Export />} />
          <Route path="/import" element={<Import />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </div>
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
