import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/MainLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Visits from "./pages/Visits";
import Medications from "./pages/Medications";
import Vaccinations from "./pages/Vaccinations";
import HealthSummary from "./pages/HealthSummary";
import FitnessLogs from "./pages/FitnessLogs";
import FitnessAnalytics from "./pages/FitnessAnalytics";
import FitnessReport from "./pages/FitnessReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><MainLayout><Reports /></MainLayout></ProtectedRoute>} />
          <Route path="/visits" element={<ProtectedRoute><MainLayout><Visits /></MainLayout></ProtectedRoute>} />
          <Route path="/medications" element={<ProtectedRoute><MainLayout><Medications /></MainLayout></ProtectedRoute>} />
          <Route path="/vaccinations" element={<ProtectedRoute><MainLayout><Vaccinations /></MainLayout></ProtectedRoute>} />
          <Route path="/health-summary" element={<ProtectedRoute><MainLayout><HealthSummary /></MainLayout></ProtectedRoute>} />
          <Route path="/fitness-logs" element={<ProtectedRoute><MainLayout><FitnessLogs /></MainLayout></ProtectedRoute>} />
          <Route path="/fitness-analytics" element={<ProtectedRoute><MainLayout><FitnessAnalytics /></MainLayout></ProtectedRoute>} />
          <Route path="/fitness-report" element={<ProtectedRoute><MainLayout><FitnessReport /></MainLayout></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
