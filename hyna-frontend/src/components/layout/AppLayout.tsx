import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { CommandPalette } from './CommandPalette';
import { useSidebarStore } from '@/stores';

export function AppLayout() {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Sidebar - desktop */}
      <Sidebar />

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${isCollapsed ? 'md:ml-[68px]' : 'md:ml-[260px]'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto main-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Command palette (Ctrl+K) */}
      <CommandPalette />
    </div>
  );
}
