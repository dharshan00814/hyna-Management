import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useThemeStore, useAuthStore } from './stores';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SplashScreen } from './components/common/SplashScreen';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { MembersPage } from './pages/members/MembersPage';
import { MemberDetailPage } from './pages/members/MemberDetailPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { MeetingsPage } from './pages/meetings/MeetingsPage';
import { MeetingDetailPage } from './pages/meetings/MeetingDetailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { MessagesPage } from './pages/messages/MessagesPage';
import { FilesPage } from './pages/files/FilesPage';
import { LeavePage } from './pages/leave/LeavePage';
import { PayrollPage } from './pages/payroll/PayrollPage';
import { AnnouncementsPage } from './pages/announcements/AnnouncementsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Manager pages
import { ManagerDashboard } from './pages/manager/ManagerDashboard';

// Member pages
import { MemberDashboard } from './pages/member/MemberDashboard';

// Activity & Privacy Tracking pages
import {
  AdminActivityPage,
  ManagerActivityPage,
  MemberActivityPage,
  PrivacyTrackingPage,
  ConnectIntegrationsPage,
  LiveDeveloperActivityPage,
  MyDeveloperActivityPage,
} from './pages/activity';
import { MeetingRoom } from './pages/meetings/MeetingRoom';

function App() {
  const { mode, resolvedTheme, setMode } = useThemeStore();
  const { effectiveRole, isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  // Initialize live Supabase authentication session on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => setMode('system');
      mediaQuery.addEventListener('change', handleChange);
      root.classList.toggle('dark', mediaQuery.matches);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    root.classList.toggle('dark', resolvedTheme === 'dark');
  }, [mode, resolvedTheme, setMode]);

  // Launch splash screen: appears once on initial application startup
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Check if splash has already been shown in this tab session
    const hasShown = sessionStorage.getItem('hyna_splash_shown');
    // If testing query ?splash=true is passed, always show
    const forceSplash = new URLSearchParams(window.location.search).get('splash') === 'true';
    return !hasShown || forceSplash;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('hyna_splash_shown', 'true');
    setShowSplash(false);
  };

  // Route prefix calculated strictly from database-verified role
  const rolePrefix =
    effectiveRole === 'admin'
      ? '/admin'
      : effectiveRole === 'manager'
      ? '/manager'
      : '/member';

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            isLoading ? (
              <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--color-background)] text-[var(--color-foreground)]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center shadow-lg shadow-indigo-500/25 animate-pulse">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Restoring your session...</p>
                </div>
              </div>
            ) : isAuthenticated ? (
              <Navigate to={`${rolePrefix}/dashboard`} replace />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Protected App Routes Layout */}
        <Route element={<AppLayout />}>
          {/* ... */}
          {/* Executive Leadership Only Routes (CEO, CTO, COO) */}
          <Route element={<ProtectedRoute requireExecutiveLeadership={true} />}>
            {/* Members */}
            <Route path="/admin/members" element={<MembersPage />} />
            <Route path="/admin/members/:id" element={<MemberDetailPage />} />
            <Route path="/manager/members" element={<MembersPage />} />
            <Route path="/manager/members/:id" element={<MemberDetailPage />} />

            {/* Live Developer Activity */}
            <Route path="/admin/developer-activity" element={<LiveDeveloperActivityPage />} />
            <Route path="/manager/developer-activity" element={<LiveDeveloperActivityPage />} />
            <Route path="/member/my-activity" element={<MyDeveloperActivityPage />} />
            <Route path="/my-activity" element={<MyDeveloperActivityPage />} />
            <Route path="/developer-activity" element={<LiveDeveloperActivityPage />} />

            {/* Activity Analytics */}
            <Route path="/admin/activity" element={<AdminActivityPage />} />
            <Route path="/manager/activity" element={<ManagerActivityPage />} />
            <Route path="/member/activity" element={<MemberActivityPage />} />

            {/* Files */}
            <Route path="/admin/files" element={<FilesPage />} />
            <Route path="/manager/files" element={<FilesPage />} />
            <Route path="/member/files" element={<FilesPage />} />

            {/* Privacy & Security Tracking */}
            <Route path="/privacy/tracking" element={<PrivacyTrackingPage />} />
            <Route path="/admin/privacy/tracking" element={<PrivacyTrackingPage />} />
            <Route path="/manager/privacy/tracking" element={<PrivacyTrackingPage />} />
            <Route path="/member/privacy/tracking" element={<PrivacyTrackingPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/projects" element={<ProjectsPage />} />
            <Route path="/admin/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/admin/tasks" element={<TasksPage />} />
            <Route path="/admin/attendance" element={<AttendancePage />} />
            <Route path="/admin/meetings" element={<MeetingsPage />} />
            <Route path="/admin/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/messages" element={<MessagesPage />} />
            <Route path="/admin/leave" element={<LeavePage />} />
            <Route path="/admin/payroll" element={<PayrollPage />} />
            <Route path="/admin/announcements" element={<AnnouncementsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/settings/integrations" element={<ConnectIntegrationsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/manager/projects" element={<ProjectsPage />} />
            <Route path="/manager/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/manager/tasks" element={<TasksPage />} />
            <Route path="/manager/attendance" element={<AttendancePage />} />
            <Route path="/manager/meetings" element={<MeetingsPage />} />
            <Route path="/manager/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/manager/reports" element={<ReportsPage />} />
            <Route path="/manager/messages" element={<MessagesPage />} />
            <Route path="/manager/leave" element={<LeavePage />} />
            <Route path="/manager/payroll" element={<PayrollPage />} />
            <Route path="/manager/announcements" element={<AnnouncementsPage />} />
            <Route path="/manager/settings" element={<SettingsPage />} />
            <Route path="/manager/settings/integrations" element={<ConnectIntegrationsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['member', 'manager', 'admin']} />}>
            <Route path="/member/dashboard" element={<MemberDashboard />} />
            <Route path="/member/tasks" element={<TasksPage />} />
            <Route path="/member/projects" element={<ProjectsPage />} />
            <Route path="/member/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/member/attendance" element={<AttendancePage />} />
            <Route path="/member/meetings" element={<MeetingsPage />} />
            <Route path="/member/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/member/reports" element={<ReportsPage />} />
            <Route path="/member/messages" element={<MessagesPage />} />
            <Route path="/member/leave" element={<LeavePage />} />
            <Route path="/member/payroll" element={<PayrollPage />} />
            <Route path="/member/settings" element={<SettingsPage />} />
            <Route path="/member/settings/integrations" element={<ConnectIntegrationsPage />} />
          </Route>

          {/* Direct Accessible Shared Routes */}
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/settings/integrations" element={<ConnectIntegrationsPage />} />
        </Route>

        {/* Meeting Room - Without AppLayout (Full screen, direct link joinable) */}
        <Route path="/meeting/:id" element={<MeetingRoom />} />


        {/* Dynamic Fallback / Root Redirect */}
        <Route path="/" element={<Navigate to={`${rolePrefix}/dashboard`} replace />} />
        <Route path="*" element={<Navigate to={`${rolePrefix}/dashboard`} replace />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;
