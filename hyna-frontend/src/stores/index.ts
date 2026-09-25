import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import { mockUsers } from '../mock/data';

interface AuthState {
  currentUser: User | null;
  currentRole: UserRole;
  isAuthenticated: boolean;
  setRole: (role: UserRole) => void;
  setUser: (user: User) => void;
  login: (role: UserRole) => void;
  logout: () => void;
}

const getDefaultUser = (role: UserRole): User => {
  if (role === 'admin') return mockUsers[0]; // Karthik Rajan
  if (role === 'manager') return mockUsers[3]; // Priya Sharma
  return mockUsers[1]; // Dharshan Kumar
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: getDefaultUser('admin'),
      currentRole: 'admin',
      isAuthenticated: true,
      setRole: (role) => set({ currentRole: role, currentUser: getDefaultUser(role) }),
      setUser: (user) => set({ currentUser: user }),
      login: (role) => set({ isAuthenticated: true, currentRole: role, currentUser: getDefaultUser(role) }),
      logout: () => set({ isAuthenticated: false, currentUser: null }),
    }),
    { name: 'hyna-auth' }
  )
);

// ---- Sidebar State ----
interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggle: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
  setMobileOpen: (open) => set({ isMobileOpen: open }),
}));

// ---- Theme State ----
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      resolvedTheme: getSystemTheme(),
      setMode: (mode) => set({
        mode,
        resolvedTheme: mode === 'system' ? getSystemTheme() : mode,
      }),
    }),
    { name: 'hyna-theme' }
  )
);
