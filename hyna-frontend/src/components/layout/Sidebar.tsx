import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, CalendarClock,
  Video, BarChart3, MessageCircle, FolderOpen, Settings, ChevronLeft,
  CalendarOff, Megaphone, X, Hexagon, Activity, ShieldCheck, Radio, Laptop,
  CreditCard, GraduationCap
} from 'lucide-react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { useSidebarStore, useAuthStore, isExecutiveLeadership } from '@/stores';
import { Avatar } from '@/components/ui';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  roles: UserRole[];
}

const getActivityLabel = (role: string) => {
  if (role === 'admin') return 'Activity Analytics';
  if (role === 'manager') return 'Team Activity';
  return 'My Activity';
};

const getLiveActivityLabel = (role: string) => {
  if (role === 'admin') return 'Live Developers';
  if (role === 'manager') return 'Live Team Work';
  return 'My Live Activity';
};

const getLiveActivityPath = (role: string) => {
  if (role === 'admin') return '/admin/developer-activity';
  if (role === 'manager') return '/manager/developer-activity';
  return '/my-activity';
};

const getNavItems = (prefix: string, role: string, isExec: boolean): NavItem[] => {
  const items: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, path: `${prefix}/dashboard`, roles: ['admin', 'manager', 'member'] },
    { label: 'Projects', icon: FolderKanban, path: `${prefix}/projects`, roles: ['admin', 'manager', 'member'] },
    { label: 'Tasks', icon: CheckSquare, path: `${prefix}/tasks`, roles: ['admin', 'manager', 'member'] },
  ];

  // 1. Members: STRICTLY for CEO, CTO, COO
  if (isExec) {
    items.push({ label: 'Members', icon: Users, path: `${prefix}/members`, roles: ['admin', 'manager', 'member'] });
  }

  items.push({ label: 'Attendance', icon: CalendarClock, path: `${prefix}/attendance`, roles: ['admin', 'manager', 'member'] });

  // 2. Live Developers & 3. Activity Analytics: STRICTLY for CEO, CTO, COO
  if (isExec) {
    items.push({ label: getLiveActivityLabel(role), icon: Radio, path: getLiveActivityPath(role), roles: ['admin', 'manager', 'member'] });
    items.push({ label: getActivityLabel(role), icon: Activity, path: `${prefix}/activity`, roles: ['admin', 'manager', 'member'] });
  }

  items.push(
    { label: 'Meetings', icon: Video, path: `${prefix}/meetings`, roles: ['admin', 'manager', 'member'] },
    { label: 'Reports', icon: BarChart3, path: `${prefix}/reports`, roles: ['admin', 'manager', 'member'] },
    { label: 'Messages', icon: MessageCircle, path: `${prefix}/messages`, roles: ['admin', 'manager', 'member'] },
    { label: 'Internship', icon: GraduationCap, path: `${prefix}/internship`, roles: ['admin', 'manager'] },
  );


  items.push(
    { label: 'Leave', icon: CalendarOff, path: `${prefix}/leave`, roles: ['admin', 'manager', 'member'] },
    { label: 'Payroll', icon: CreditCard, path: `${prefix}/payroll`, roles: ['admin', 'manager', 'member'] },
    { label: 'Announcements', icon: Megaphone, path: `${prefix}/announcements`, roles: ['admin', 'manager'] },
  );

  return items;
};

const getBottomNavItems = (isExec: boolean): NavItem[] => {
  const items: NavItem[] = [
    { label: 'IDE Integrations', icon: Laptop, path: '/settings/integrations', roles: ['admin', 'manager', 'member'] },
  ];

  // 5. Privacy & Tracking (Security): STRICTLY for CEO, CTO, COO
  if (isExec) {
    items.push({ label: 'Privacy & Tracking', icon: ShieldCheck, path: '/privacy/tracking', roles: ['admin', 'manager', 'member'] });
  }

  items.push(
    { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'manager', 'member'] },
  );

  return items;
};

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } = useSidebarStore();
  const { currentUser, effectiveRole } = useAuthStore();
  const location = useLocation();

  const isExec = isExecutiveLeadership(currentUser);
  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';
  const navItems = getNavItems(prefix, effectiveRole, isExec).filter(item => item.roles.includes(effectiveRole));
  const bottomItems = getBottomNavItems(isExec).filter(item => item.roles.includes(effectiveRole));

  return (
    <>
      {/* Sidebar - Desktop only */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-30 h-full flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)]',
          // Desktop
          'hidden md:flex',
          isCollapsed ? 'w-[74px]' : 'w-[270px]',
        )}
      >
        {/* Logo area */}
        <div className={cn(
          'flex items-center h-20 shrink-0 px-5',
          isCollapsed ? 'justify-center px-2' : 'justify-between',
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#181B26] shadow-xs border border-[var(--color-border)] flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Hyna Studio Logo" className="w-6 h-6 object-contain" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight text-[var(--color-foreground)] truncate">Hyna Studio</h1>
                <p className="text-[11px] font-medium text-[var(--color-muted-foreground)] tracking-tight">Superpower Suite</p>
              </div>
            )}
          </div>
          {/* Collapse toggle - desktop */}
          {!isCollapsed && (
            <button
              onClick={toggle}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white dark:hover:bg-[#181B26] border border-transparent hover:border-[var(--color-border)] shadow-2xs transition-all cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation - Floating Pills */}
        <nav className="flex-1 overflow-y-auto py-2 px-3.5 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-2xl text-xs font-semibold tracking-tight transition-all duration-200 group relative',
                  isCollapsed ? 'justify-center w-12 h-12 mx-auto' : 'px-4 py-3',
                  isActive
                    ? 'bg-white dark:bg-[#151821] text-[var(--color-foreground)] shadow-xs border border-black/[0.04] dark:border-white/[0.08]'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/60 dark:hover:bg-white/[0.04]',
                )}
              >
                <item.icon className={cn(
                  'shrink-0 transition-transform group-hover:scale-105',
                  isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                  isActive ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]'
                )} />
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3.5 space-y-2 shrink-0 pb-6 border-t border-[var(--color-sidebar-border)]">
          {/* Pro Pill Banner (Superpower Style from screenshot) */}
          {!isCollapsed && (
            <div className="p-3 rounded-2xl bg-white dark:bg-[#151821] border border-[var(--color-border)] shadow-2xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D4F82C] text-[#11141A]">
                  PRO
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-foreground)] truncate">
                  Studio Edition
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
          )}

          {bottomItems.map((item) => {
            const itemPath = `${prefix}${item.path}`;
            const isActive = location.pathname === itemPath;
            return (
              <NavLink
                key={item.label}
                to={itemPath}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-2xl text-xs font-semibold tracking-tight transition-all duration-200 group',
                  isCollapsed ? 'justify-center w-12 h-12 mx-auto' : 'px-4 py-2.5',
                  isActive
                    ? 'bg-white dark:bg-[#151821] text-[var(--color-foreground)] shadow-xs border border-black/[0.04]'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/60 dark:hover:bg-white/[0.04]',
                )}
              >
                <item.icon className={cn('shrink-0', isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]')} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}

          {/* User profile */}
          {currentUser && (
            <div className={cn(
              'flex items-center gap-3 rounded-2xl p-2 bg-white/80 dark:bg-[#151821]/80 border border-[var(--color-border)] shadow-2xs mt-2',
              isCollapsed && 'justify-center p-1.5',
            )}>
              <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" />
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--color-foreground)] truncate">{currentUser.name}</p>
                  <p className="text-[10px] font-medium text-[var(--color-muted-foreground)] truncate">
                    {currentUser.designation || effectiveRole}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
