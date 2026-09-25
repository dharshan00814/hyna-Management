import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useThemeStore, useAuthStore } from './stores';
import { AppLayout } from './components/layout/AppLayout';
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

// Member pages
import { MemberDashboard } from './pages/member/MemberDashboard';

function App() {
  const { mode, resolvedTheme, setMode } = useThemeStore();
  const { currentRole, isAuthenticated } = useAuthStore();

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

  const rolePrefix = currentRole === 'member' ? '/member' : '/admin';

  if (!isAuthenticated) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Navigate to={`${rolePrefix}/dashboard`} replace />} />
        <Route element={<AppLayout />}>
          {/* Admin routes */}
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

          {/* Member routes */}
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

          {/* Manager routes - same as admin for now */}
          <Route path="/manager/dashboard" element={<AdminDashboard />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={`${rolePrefix}/dashboard`} replace />} />
        <Route path="*" element={<Navigate to={`${rolePrefix}/dashboard`} replace />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;
