import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import RoutineDetail from "./pages/RoutineDetail.tsx";
import History from "./pages/History.tsx";
import Settings from "./pages/Settings.tsx";
import WeeklyReport from "./pages/WeeklyReport.tsx";
import { BackButtonHandler } from "./components/BackButtonHandler";

const queryClient = new QueryClient();

const RoutineDetailRoute = () => {
  const { id } = useParams();
  return <RoutineDetail key={id} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BackButtonHandler />
        <Routes>
        <Route path="/" element={<Index />} />
          <Route path="/routine/:id" element={<RoutineDetailRoute />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/weekly-report" element={<WeeklyReport />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
