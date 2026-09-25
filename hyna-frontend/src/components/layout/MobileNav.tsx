import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, MessageCircle, FolderKanban, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, useSidebarStore } from '@/stores';

export function MobileNav() {
  const { currentRole, effectiveRole } = useAuthStore();
  const { setMobileOpen } = useSidebarStore();
  const location = useLocation();

  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';

  const items = [
    { label: 'Home', icon: LayoutDashboard, path: `${prefix}/dashboard` },
    { label: 'Projects', icon: FolderKanban, path: `${prefix}/projects` },
    { label: 'Tasks', icon: CheckSquare, path: `${prefix}/tasks` },
    { label: 'Messages', icon: MessageCircle, path: `${prefix}/messages` },
    { label: 'More', icon: Menu, path: '__more__' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around h-16 bg-[var(--color-background)] border-t border-[var(--color-border)] safe-area-bottom">
      {items.map((item) => {
        if (item.path === '__more__') {
          return (
            <button
              key="more"
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[var(--color-muted-foreground)]"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        }

        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors',
              isActive
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-muted-foreground)]',
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
