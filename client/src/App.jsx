import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Loader from './components/common/Loader.jsx';

const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.jsx'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage.jsx'));

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const TradeFormPage = lazy(() => import('./pages/TradeFormPage.jsx'));
const TradeDetailPage = lazy(() => import('./pages/TradeDetailPage.jsx'));
const PositionsPage = lazy(() => import('./pages/PositionsPage.jsx'));
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'));
const StressTestPage = lazy(() => import('./pages/StressTestPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const LedgerPage = lazy(() => import('./pages/LedgerPage.jsx'));
const SymbolsPage = lazy(() => import('./pages/SymbolsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader label="Restoring session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader label="Checking session..." />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loader label="Loading page..." />}>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/trades/new" element={<TradeFormPage />} />
              <Route path="/trades/:id" element={<TradeDetailPage />} />
              <Route path="/trades/:id/edit" element={<TradeFormPage />} />
              <Route path="/positions" element={<PositionsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/stress" element={<StressTestPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/ledger" element={<LedgerPage />} />
              <Route path="/symbols" element={<SymbolsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
