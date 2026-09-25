import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, ChevronDown, Sun, Moon, Monitor } from 'lucide-react';
import { cn, getInitials, getAvatarColor, formatRelativeTime } from '@/lib/utils';
import { useAuthStore, useSidebarStore, useThemeStore } from '@/stores';
import { getNotifications, markNotificationRead } from '@/services/api';
import type { UserRole, Notification } from '@/types';

export function Header() {
  const { currentUser, currentRole, effectiveRole } = useAuthStore();
  const { setMobileOpen } = useSidebarStore();
  const { mode, setMode } = useThemeStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    getNotifications(currentUser?.id).then((data) => {
      if (isMounted) setNotifications(data);
    });
    return () => { isMounted = false; };
  }, [currentUser?.id]);

  const userNotifications = notifications
    .filter(n => n.userId === currentUser?.id || n.userId === 'all')
    .slice(0, 8);
  const unreadCount = userNotifications.filter(n => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Dispatch custom event for command palette
        window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };
  const ThemeIcon = themeIcons[mode];

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-4 sm:px-6 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-sm">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] mr-2 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search bar */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        className={cn(
          'hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-[var(--color-border)]',
          'text-[var(--color-muted-foreground)] text-sm bg-[var(--color-muted)]/50',
          'hover:bg-[var(--color-muted)] transition-colors cursor-pointer',
          'w-64 lg:w-80',
        )}
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Search Hyna Studio...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-background)] border border-[var(--color-border)]">
          ⌘K
        </kbd>
      </button>

      {/* Mobile search */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        className="flex sm:hidden items-center justify-center w-9 h-9 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      {/* Role switcher (dev mode) */}
      {currentUser && (
        <div className="hidden sm:flex items-center gap-2 mr-3 px-2.5 py-1 rounded-lg bg-[var(--color-muted)] text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-[var(--color-foreground)]">{currentUser.designation || currentRole}</span>
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={() => {
          const modes: Array<typeof mode> = ['light', 'dark', 'system'];
          const next = modes[(modes.indexOf(mode) + 1) % modes.length];
          setMode(next);
        }}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors mr-1"
        aria-label={`Theme: ${mode}`}
        title={`Theme: ${mode}`}
      >
        <ThemeIcon className="w-[18px] h-[18px]" />
      </button>

      {/* Notifications */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 card rounded-xl shadow-lg animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-[var(--color-primary)] font-medium cursor-pointer hover:underline">
                  Mark all read
                </span>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {userNotifications.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)] text-center py-8">No notifications</p>
              ) : (
                userNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0 cursor-pointer hover:bg-[var(--color-muted)] transition-colors',
                      !notif.read && 'bg-[var(--color-primary)]/5',
                    )}
                  >
                    <div className="shrink-0 mt-0.5">
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{notif.title}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1">{formatRelativeTime(notif.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-[var(--color-border)] px-4 py-2">
              <button
                onClick={() => { navigate(`/${currentRole === 'member' ? 'member' : 'admin'}/settings`); setShowNotifications(false); }}
                className="text-xs text-[var(--color-primary)] font-medium hover:underline w-full text-center"
              >
                View all notifications
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile dropdown */}
      <div ref={profileRef} className="relative ml-2">
        <button
          onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
        >
          {currentUser && (
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium',
              getAvatarColor(currentUser.name),
            )}>
              {getInitials(currentUser.name)}
            </div>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-[var(--color-muted-foreground)] hidden sm:block" />
        </button>

        {showProfile && (
          <div className="absolute right-0 top-full mt-2 w-56 card rounded-xl shadow-lg animate-scale-in overflow-hidden">
            {currentUser && (
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                <p className="text-xs text-[var(--color-muted-foreground)] truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {currentUser.designation || currentRole}
                </span>
              </div>
            )}
            <div className="py-1">
              <button
                onClick={() => {
                  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';
                  navigate(`${prefix}/settings`);
                  setShowProfile(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-muted)] transition-colors"
              >
                Account Settings
              </button>
              <div className="border-t border-[var(--color-border)] my-1" />
              <button
                onClick={async () => {
                  setShowProfile(false);
                  await useAuthStore.getState().logout();
                  navigate('/login', { replace: true });
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
