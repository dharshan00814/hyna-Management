import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useThemeStore, useAuthStore } from './stores';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';

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
import { AnnouncementsPage } from './pages/announcements/AnnouncementsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Manager pages
import { ManagerDashboard } from './pages/manager/ManagerDashboard';

// Member pages
import { MemberDashboard } from './pages/member/MemberDashboard';

function App() {
  const { mode, resolvedTheme, setMode } = useThemeStore();
  const { effectiveRole, isAuthenticated, initializeAuth } = useAuthStore();

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

  // Route prefix calculated strictly from database-verified role
  // CEO / CTO / CPO / COO -> /admin
  // Manager -> /manager
  // Member -> /member
  const rolePrefix =
    effectiveRole === 'admin'
      ? '/admin'
      : effectiveRole === 'manager'
      ? '/manager'
      : '/member';

  return (
    <>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={`${rolePrefix}/dashboard`} replace />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Protected App Routes Layout */}
        <Route element={<AppLayout />}>
          {/* ======================================================== */}
          {/* ADMIN ROUTES: Strictly CEO, CTO, CPO, COO only           */}
          {/* ======================================================== */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/projects" element={<ProjectsPage />} />
            <Route path="/admin/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/admin/tasks" element={<TasksPage />} />
            <Route path="/admin/members" element={<MembersPage />} />
            <Route path="/admin/members/:id" element={<MemberDetailPage />} />
            <Route path="/admin/attendance" element={<AttendancePage />} />
            <Route path="/admin/meetings" element={<MeetingsPage />} />
            <Route path="/admin/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/messages" element={<MessagesPage />} />
            <Route path="/admin/files" element={<FilesPage />} />
            <Route path="/admin/leave" element={<LeavePage />} />
            <Route path="/admin/announcements" element={<AnnouncementsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          {/* ======================================================== */}
          {/* MANAGER ROUTES: Dedicated Manager Workspace              */}
          {/* ======================================================== */}
          <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/manager/projects" element={<ProjectsPage />} />
            <Route path="/manager/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/manager/tasks" element={<TasksPage />} />
            <Route path="/manager/members" element={<MembersPage />} />
            <Route path="/manager/members/:id" element={<MemberDetailPage />} />
            <Route path="/manager/attendance" element={<AttendancePage />} />
            <Route path="/manager/meetings" element={<MeetingsPage />} />
            <Route path="/manager/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/manager/reports" element={<ReportsPage />} />
            <Route path="/manager/messages" element={<MessagesPage />} />
            <Route path="/manager/files" element={<FilesPage />} />
            <Route path="/manager/leave" element={<LeavePage />} />
            <Route path="/manager/announcements" element={<AnnouncementsPage />} />
            <Route path="/manager/settings" element={<SettingsPage />} />
          </Route>

          {/* ======================================================== */}
          {/* MEMBER ROUTES: Personalized Member Features              */}
          {/* ======================================================== */}
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
            <Route path="/member/files" element={<FilesPage />} />
            <Route path="/member/leave" element={<LeavePage />} />
            <Route path="/member/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Dynamic Fallback / Root Redirect */}
        <Route path="/" element={<Navigate to={`${rolePrefix}/dashboard`} replace />} />
        <Route path="*" element={<Navigate to={`${rolePrefix}/dashboard`} replace />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;
