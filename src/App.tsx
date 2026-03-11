import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "@/lib/msal-config";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Agents from "./pages/Agents";
import Events from "./pages/Events";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import Policies from "./pages/Policies";
import PolicyDetail from "./pages/PolicyDetail";
import AuditLog from "./pages/AuditLog";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MsalProvider instance={msalInstance}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                element={
                  <ProtectedRoute>
                    <WorkspaceProvider>
                      <DashboardLayout />
                    </WorkspaceProvider>
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Index />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/events" element={<Events />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/incidents/:id" element={<IncidentDetail />} />
                <Route path="/policies" element={<Policies />} />
                <Route path="/policies/:id" element={<PolicyDetail />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </MsalProvider>
  </QueryClientProvider>
);

export default App;
