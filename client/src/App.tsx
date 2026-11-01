import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { PublicLayout } from "./components/layout/PublicLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Phase 13 Pages
import { LandingPage } from "./pages/public/LandingPage";
import { LawyerDirectoryPage } from "./pages/public/LawyerDirectoryPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { AuthCallbackPage } from "./pages/auth/AuthCallbackPage";
import { UnauthorizedPage } from "./pages/public/UnauthorizedPage";
import { NotFoundPage } from "./pages/public/NotFoundPage";

// Phase 14 Citizen Portal Pages
import { CitizenLayout } from "./components/citizen/CitizenLayout";
import { CitizenDashboard } from "./pages/citizen/CitizenDashboard";
import { CreateCaseWizard } from "./pages/citizen/CreateCaseWizard";
import { CaseDetailPage } from "./pages/citizen/CaseDetailPage";

// Phase 15 Lawyer Portal Pages
import { LawyerLayout } from "./components/lawyer/LawyerLayout";
import { LawyerDashboard } from "./pages/lawyer/LawyerDashboard";
import { LawyerOnboardingPage } from "./pages/lawyer/LawyerOnboardingPage";
import { SharedCaseWorkspacePage } from "./pages/lawyer/SharedCaseWorkspacePage";

// Phase 16 Admin Portal Pages
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminLawyerVerificationPage } from "./pages/admin/AdminLawyerVerificationPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminCasesPage } from "./pages/admin/AdminCasesPage";
import { AdminAuditLogsPage } from "./pages/admin/AdminAuditLogsPage";
import { AdminQueuesPage } from "./pages/admin/AdminQueuesPage";

// Global React Query Client with smart defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes with Navbar and Footer */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/lawyers" element={<LawyerDirectoryPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
              </Route>

              {/* Citizen Portal (Phase 14) */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["CITIZEN"]}>
                    <CitizenLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<CitizenDashboard />} />
                <Route path="cases/new" element={<CreateCaseWizard />} />
                <Route path="cases/:caseId" element={<CaseDetailPage />} />
              </Route>

              {/* Lawyer Portal (Phase 15) */}
              <Route
                path="/lawyer"
                element={
                  <ProtectedRoute allowedRoles={["LAWYER"]}>
                    <LawyerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/lawyer/dashboard" replace />} />
                <Route path="dashboard" element={<LawyerDashboard />} />
                <Route path="consultations" element={<LawyerDashboard />} />
                <Route path="onboarding" element={<LawyerOnboardingPage />} />
                <Route path="cases/:caseId" element={<SharedCaseWorkspacePage />} />
              </Route>

              {/* Admin Portal (Phase 16) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="lawyers" element={<AdminLawyerVerificationPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="cases" element={<AdminCasesPage />} />
                <Route path="queues" element={<AdminQueuesPage />} />
                <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              </Route>

              {/* 404 Fallback */}
              <Route element={<PublicLayout />}>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
