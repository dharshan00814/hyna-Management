import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Helper: Determine effective role strictly based on database role and designation rules:
// - Admin access is ONLY for: CEO, CTO, CPO, COO
// - Manager access is for: role = 'manager' or Manager designation
// - All other users are Members
export function computeEffectiveRole(user: { role?: string; designation?: string } | null | undefined): 'admin' | 'manager' | 'member' {
  if (!user) return 'member';
  const designationUpper = (user.designation || '').trim().toUpperCase();
  const executiveDesignations = ['CEO', 'CTO', 'CPO', 'COO'];

  if (executiveDesignations.includes(designationUpper) || (user.role === 'admin' && executiveDesignations.some(d => designationUpper.includes(d)))) {
    return 'admin';
  }

  if (user.role === 'manager' || designationUpper.includes('MANAGER')) {
    return 'manager';
  }

  return 'member';
}

function mapDatabaseProfile(row: any): User {
  return {
    id: row.id,
    name: row.name || 'Team Member',
    email: row.email || '',
    avatar: row.avatar || '',
    role: (row.role as UserRole) || 'member',
    department: row.department || 'Engineering',
    designation: row.designation || 'Software Engineer',
    phone: row.phone || '',
    joinDate: row.join_date || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    status: row.status || 'active',
    activeProjects: row.active_projects || 0,
    lastActive: row.last_active || row.updated_at || new Date().toISOString(),
    bio: row.bio || '',
    skills: row.skills || [],
  };
}

interface AuthState {
  currentUser: User | null;
  currentRole: UserRole;
  effectiveRole: 'admin' | 'manager' | 'member';
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: 'admin' | 'manager' | 'member'; error?: string }>;
  signUp: (data: { email: string; password: string; name: string; department?: string; designation?: string }) => Promise<{ success: boolean; session?: boolean; requiresEmailConfirmation?: boolean; role?: 'admin' | 'manager' | 'member'; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentRole: 'member',
      effectiveRole: 'member',
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (signInError || !authData.user) {
            set({ isLoading: false });
            let msg = signInError?.message || 'Authentication failed';
            const lowerMsg = msg.toLowerCase();
            if (lowerMsg.includes('email not confirmed')) {
              msg = 'Email address has not been confirmed yet. Please check your inbox or disable "Confirm email" in Supabase Dashboard (Authentication -> Providers -> Email).';
            } else if (lowerMsg.includes('invalid login credentials') || lowerMsg.includes('invalid credentials')) {
              msg = 'Invalid email or password. If you have not created an account yet, please switch to "Register Member" above to create your profile.';
            }
            return { success: false, error: msg };
          }

          const userId = authData.user.id;

          // Fetch user profile from database
          let { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          let user: User;
          if (profileError || !profileData) {
            // Attempt self-healing profile creation using active authenticated session
            const meta = authData.user.user_metadata || {};
            const { data: insertedProfile } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                name: meta.name || authData.user.email?.split('@')[0] || 'Team Member',
                email: authData.user.email || '',
                role: (meta.role as UserRole) || 'member',
                department: meta.department || 'Engineering',
                designation: meta.designation || 'Software Engineer',
                status: 'active',
              })
              .select()
              .maybeSingle();

            if (insertedProfile) {
              user = mapDatabaseProfile(insertedProfile);
            } else {
              // Fallback check against users view
              const { data: fallbackUsers } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

              if (fallbackUsers) {
                user = mapDatabaseProfile(fallbackUsers);
              } else {
                user = {
                  id: userId,
                  name: meta.name || authData.user.email?.split('@')[0] || 'Team Member',
                  email: authData.user.email || '',
                  avatar: '',
                  role: (meta.role as UserRole) || 'member',
                  department: meta.department || 'Engineering',
                  designation: meta.designation || 'Software Engineer',
                  phone: '',
                  joinDate: new Date().toISOString().split('T')[0],
                  status: 'active',
                  activeProjects: 0,
                  lastActive: new Date().toISOString(),
                };
              }
            }
          } else {
            user = mapDatabaseProfile(profileData);
          }

          const role = computeEffectiveRole(user);
          set({
            currentUser: user,
            currentRole: user.role,
            effectiveRole: role,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true, role };
        } catch (err: any) {
          set({ isLoading: false });
          return { success: false, error: err?.message || 'Unexpected login error' };
        }
      },

      signUp: async ({ email, password, name, department, designation }) => {
        try {
          set({ isLoading: true });
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                name: name.trim(),
                department: department?.trim() || 'Engineering',
                designation: designation?.trim() || 'Software Engineer',
                role: 'member', // Enforce member role on sign up
              },
            },
          });

          if (signUpError || !authData.user) {
            set({ isLoading: false });
            let msg = signUpError?.message || 'Registration failed';
            const lowerMsg = msg.toLowerCase();
            if (lowerMsg.includes('rate limit')) {
              msg = 'Supabase email send limit reached. Please disable "Confirm email" in Supabase Dashboard (Authentication -> Providers -> Email) to allow instant registration.';
            }
            return { success: false, error: msg };
          }

          // If session was created automatically (email confirmation disabled)
          if (authData.session) {
            const userId = authData.user.id;

            // Attempt to ensure profile exists in database
            let { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

            if (!profile) {
              const { data: createdProfile } = await supabase
                .from('profiles')
                .insert({
                  id: userId,
                  name: name.trim(),
                  email: email.trim(),
                  department: department?.trim() || 'Engineering',
                  designation: designation?.trim() || 'Software Engineer',
                  role: 'member',
                  status: 'active',
                })
                .select()
                .maybeSingle();

              if (createdProfile) profile = createdProfile;
            }

            const newUser: User = profile ? mapDatabaseProfile(profile) : {
              id: userId,
              name: name.trim(),
              email: email.trim(),
              avatar: '',
              role: 'member',
              department: department?.trim() || 'Engineering',
              designation: designation?.trim() || 'Software Engineer',
              phone: '',
              joinDate: new Date().toISOString().split('T')[0],
              status: 'active',
              activeProjects: 0,
              lastActive: new Date().toISOString(),
            };

            const role = computeEffectiveRole(newUser);
            set({
              currentUser: newUser,
              currentRole: newUser.role,
              effectiveRole: role,
              isAuthenticated: true,
              isLoading: false,
            });

            return { success: true, session: true, requiresEmailConfirmation: false, role };
          } else {
            // User registered, but email confirmation is pending in Supabase
            set({ isLoading: false });
            return { success: true, session: false, requiresEmailConfirmation: true };
          }
        } catch (err: any) {
          set({ isLoading: false });
          return { success: false, error: err?.message || 'Registration error' };
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn('SignOut error:', e);
        } finally {
          set({
            currentUser: null,
            currentRole: 'member',
            effectiveRole: 'member',
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      setUser: (user: User) => {
        const role = computeEffectiveRole(user);
        set({ currentUser: user, currentRole: user.role, effectiveRole: role });
      },

      initializeAuth: async () => {
        try {
          set({ isLoading: true });
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError || !session?.user) {
            set({
              currentUser: null,
              currentRole: 'member',
              effectiveRole: 'member',
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          const userId = session.user.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profile) {
            const user = mapDatabaseProfile(profile);
            const role = computeEffectiveRole(user);
            set({
              currentUser: user,
              currentRole: user.role,
              effectiveRole: role,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Check users view
            const { data: fallbackUser } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();

            if (fallbackUser) {
              const user = mapDatabaseProfile(fallbackUser);
              const role = computeEffectiveRole(user);
              set({
                currentUser: user,
                currentRole: user.role,
                effectiveRole: role,
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              set({
                currentUser: null,
                currentRole: 'member',
                effectiveRole: 'member',
                isAuthenticated: false,
                isLoading: false,
              });
            }
          }
        } catch (err) {
          console.error('Error initializing auth:', err);
          set({
            currentUser: null,
            currentRole: 'member',
            effectiveRole: 'member',
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'hyna-auth-state',
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentRole: state.currentRole,
        effectiveRole: state.effectiveRole,
        isAuthenticated: state.isAuthenticated,
      }),
    }
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
