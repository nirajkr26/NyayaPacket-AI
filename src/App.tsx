import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LawyerDashboardPage } from './pages/LawyerDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotAllowedPage } from './pages/NotAllowedPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication & Utility Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/not-allowed" element={<NotAllowedPage />} />

          {/* Protected Application Layout */}
          <Route element={<Layout />}>
            {/* Citizen Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="cases"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <PlaceholderPage
                    title="My Cases"
                    description="Manage all your filed legal issues, track status across the 9 workflow stages, and review packets."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="evidence"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <PlaceholderPage
                    title="Evidence Files"
                    description="Upload, categorize, and securely inspect salary slips, tenancy agreements, receipts, and photos."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="verify"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <PlaceholderPage
                    title="Verify Draft"
                    description="Step-by-step verification interface where you confirm each AI-extracted fact before legal review."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="packets"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <PlaceholderPage
                    title="Case Packets"
                    description="Download structured PDF/ZIP packets ready for your consultation with an advocate or legal aid volunteer."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="sharing"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <PlaceholderPage
                    title="Secure Sharing"
                    description="Generate time-expiring, encrypted links to send directly to your advocate or para-legal clinic."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="action-items"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <PlaceholderPage
                    title="Action Items"
                    description="Checklist of citizen tasks, document gathering steps, and meeting preparation reminders."
                  />
                </ProtectedRoute>
              }
            />

            {/* Shared Help Route */}
            <Route
              path="help"
              element={
                <ProtectedRoute>
                  <PlaceholderPage
                    title="Help & Legal Aid Guide"
                    description="Plain-language legal explanations, helpline numbers, and FAQs on how NyayaPacket AI works."
                  />
                </ProtectedRoute>
              }
            />

            {/* Lawyer Protected Routes */}
            <Route
              path="lawyer"
              element={
                <ProtectedRoute allowedRoles={['lawyer']}>
                  <LawyerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="lawyer/shared"
              element={
                <ProtectedRoute allowedRoles={['lawyer']}>
                  <PlaceholderPage
                    title="Shared Cases"
                    description="All citizen legal packets explicitly shared with your advocate portal for consultation review."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="lawyer/consultations"
              element={
                <ProtectedRoute allowedRoles={['lawyer']}>
                  <PlaceholderPage
                    title="Consultations"
                    description="Manage scheduled citizen consultations, meeting notes, and video conference links."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="lawyer/action-items"
              element={
                <ProtectedRoute allowedRoles={['lawyer']}>
                  <PlaceholderPage
                    title="Advocate Action Items"
                    description="Draft legal notices, verify documentation, and monitor case preparation deadlines."
                  />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
