import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { MeetingsPage } from './pages/meetings/MeetingsPage';
import { MeetingRoomPage } from './pages/meetings/MeetingRoomPage';
import { MeetingDetailsPage } from './pages/meetings/MeetingDetailsPage';
import { WorkspacesPage } from './pages/workspaces/WorkspacesPage';
import { WorkspaceDetailsPage } from './pages/workspaces/WorkspaceDetailsPage';
import { TeamPage } from './pages/team/TeamPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { ActionItemsPage } from './pages/actionItems/ActionItemsPage';
import { AIInsightsPage } from './pages/ai/AIInsightsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen label="Verifying IntellMeet Authentication..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Public Route (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Meeting Room (Full Screen) */}
            <Route
              path="/room/:code"
              element={
                <ProtectedRoute>
                  <MeetingRoomPage />
                </ProtectedRoute>
              }
            />

            {/* Dashboard Protected Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/meetings" element={<MeetingsPage />} />
              <Route path="/meetings/:id" element={<MeetingDetailsPage />} />
              <Route path="/workspaces" element={<WorkspacesPage />} />
              <Route path="/workspaces/:id" element={<WorkspaceDetailsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/action-items" element={<ActionItemsPage />} />
              <Route path="/ai-insights" element={<AIInsightsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
