import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { PublicLayout } from "./components/layout/PublicLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Phase 13 Pages (Lazy Loaded)
const LandingPage = lazy(() => import("./pages/public/LandingPage").then(m => ({ default: m.LandingPage })));
const LawyerDirectoryPage = lazy(() => import("./pages/public/LawyerDirectoryPage").then(m => ({ default: m.LawyerDirectoryPage })));
const LoginPage = lazy(() => import("./pages/auth/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage").then(m => ({ default: m.RegisterPage })));
const AuthCallbackPage = lazy(() => import("./pages/auth/AuthCallbackPage").then(m => ({ default: m.AuthCallbackPage })));
const UnauthorizedPage = lazy(() => import("./pages/public/UnauthorizedPage").then(m => ({ default: m.UnauthorizedPage })));
const NotFoundPage = lazy(() => import("./pages/public/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

// Phase 14 Citizen Portal Pages (Lazy Loaded)
const CitizenLayout = lazy(() => import("./components/citizen/CitizenLayout").then(m => ({ default: m.CitizenLayout })));
const CitizenDashboard = lazy(() => import("./pages/citizen/CitizenDashboard").then(m => ({ default: m.CitizenDashboard })));
const CreateCaseWizard = lazy(() => import("./pages/citizen/CreateCaseWizard").then(m => ({ default: m.CreateCaseWizard })));
const CaseDetailPage = lazy(() => import("./pages/citizen/CaseDetailPage").then(m => ({ default: m.CaseDetailPage })));

// Phase 15 Lawyer Portal Pages (Lazy Loaded)
const LawyerLayout = lazy(() => import("./components/lawyer/LawyerLayout").then(m => ({ default: m.LawyerLayout })));
const LawyerDashboard = lazy(() => import("./pages/lawyer/LawyerDashboard").then(m => ({ default: m.LawyerDashboard })));
const LawyerOnboardingPage = lazy(() => import("./pages/lawyer/LawyerOnboardingPage").then(m => ({ default: m.LawyerOnboardingPage })));
const SharedCaseWorkspacePage = lazy(() => import("./pages/lawyer/SharedCaseWorkspacePage").then(m => ({ default: m.SharedCaseWorkspacePage })));

// Phase 16 Admin Portal Pages (Lazy Loaded)
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminLawyerVerificationPage = lazy(() => import("./pages/admin/AdminLawyerVerificationPage").then(m => ({ default: m.AdminLawyerVerificationPage })));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage").then(m => ({ default: m.AdminUsersPage })));
const AdminCasesPage = lazy(() => import("./pages/admin/AdminCasesPage").then(m => ({ default: m.AdminCasesPage })));
const AdminAuditLogsPage = lazy(() => import("./pages/admin/AdminAuditLogsPage").then(m => ({ default: m.AdminAuditLogsPage })));
const AdminQueuesPage = lazy(() => import("./pages/admin/AdminQueuesPage").then(m => ({ default: m.AdminQueuesPage })));

// Fallback Loading Spinner
function PageLoader() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground animate-pulse font-medium">Loading workspace...</p>
      </div>
    </div>
  );
}

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
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
