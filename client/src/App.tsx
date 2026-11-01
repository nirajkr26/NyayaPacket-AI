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
import { UnauthorizedPage } from "./pages/public/UnauthorizedPage";
import { NotFoundPage } from "./pages/public/NotFoundPage";

// Phase 14 Citizen Portal Pages
import { CitizenLayout } from "./components/citizen/CitizenLayout";
import { CitizenDashboard } from "./pages/citizen/CitizenDashboard";
import { CreateCaseWizard } from "./pages/citizen/CreateCaseWizard";
import { CaseDetailPage } from "./pages/citizen/CaseDetailPage";

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
                path="/lawyer/*"
                element={
                  <ProtectedRoute allowedRoles={["LAWYER"]}>
                    <div className="p-8 text-center">Advocate Portal Loading...</div>
                  </ProtectedRoute>
                }
              />

              {/* Admin Portal (Phase 16) */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <div className="p-8 text-center">Admin Portal Loading...</div>
                  </ProtectedRoute>
                }
              />

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
