import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Helper: Determine effective role strictly based on database role and designation rules:
// - Admin access is ONLY for: CEO, CTO, CPO, COO
// - Manager access is for: role = 'manager' or Manager designation
// - All other users are Members
export function computeEffectiveRole(user: { role?: string; designation?: string; name?: string; email?: string; employeeId?: string } | null | undefined): 'admin' | 'manager' | 'member' {
  if (!user) return 'member';
  const roleLower = (user.role || '').trim().toLowerCase();
  const designationUpper = (user.designation || '').trim().toUpperCase();
  const nameLower = (user.name || '').trim().toLowerCase();
  const emailLower = (user.email || '').trim().toLowerCase();
  const empIdUpper = (((user as any).employeeId || (user as any).employee_id || '') as string).trim().toUpperCase();

  // Dharshan (Admin), Vignesh (CEO), and Jashwin (COO) are guaranteed Full Admin Access
  if (
    roleLower === 'admin' ||
    designationUpper.includes('ADMIN') ||
    designationUpper.includes('CEO') ||
    designationUpper.includes('COO') ||
    designationUpper.includes('CTO') ||
    designationUpper.includes('CPO') ||
    nameLower.includes('dharshan') ||
    emailLower.includes('dharshan') ||
    nameLower.includes('vignesh') ||
    emailLower.includes('vignesh') ||
    nameLower.includes('jashwin') ||
    emailLower.includes('jashwin') ||
    empIdUpper === 'EMP-001' ||
    empIdUpper === 'EMP-002' ||
    empIdUpper === 'EMP-003'
  ) {
    return 'admin';
  }

  // Asthamil is Engineering Manager (EMP-004) -> Manager Access
  if (
    roleLower === 'manager' ||
    designationUpper.includes('MANAGER') ||
    nameLower.includes('asthamil') ||
    emailLower.includes('asthamil') ||
    empIdUpper === 'EMP-004'
  ) {
    return 'manager';
  }

  return 'member';
}

export function getOrgMemberDetails(rawId: string, email?: string) {
  const idUpper = rawId.trim().toUpperCase();
  const idLower = rawId.trim().toLowerCase();
  const emailLower = (email || '').trim().toLowerCase();

  if (idUpper === 'EMP-001' || idLower.includes('vignesh') || emailLower.includes('vignesh')) {
    return { name: 'Vignesh', role: 'admin' as UserRole, designation: 'CEO', department: 'Executive', employeeId: 'EMP-001', email: 'vignesh@hynastudio.com' };
  }
  if (idUpper === 'EMP-002' || idLower.includes('jashwin') || emailLower.includes('jashwin')) {
    return { name: 'Jashwin', role: 'admin' as UserRole, designation: 'COO', department: 'Executive', employeeId: 'EMP-002', email: 'jashwin@hynastudio.com' };
  }
  if (idUpper === 'EMP-003' || idLower.includes('dharshan') || emailLower.includes('dharshan')) {
    return { name: 'Dharshan', role: 'admin' as UserRole, designation: 'Admin', department: 'Executive', employeeId: 'EMP-003', email: 'dharshan@hynastudio.com' };
  }
  if (idUpper === 'EMP-004' || idLower.includes('asthamil') || emailLower.includes('asthamil')) {
    return { name: 'Asthamil', role: 'manager' as UserRole, designation: 'Engineering Manager', department: 'Engineering', employeeId: 'EMP-004', email: 'asthamil@hynastudio.com' };
  }
  if (idUpper === 'EMP-005' || idLower.includes('zarif') || emailLower.includes('zarif')) {
    return { name: 'Zarif', role: 'member' as UserRole, designation: 'Lead Developer', department: 'Engineering', employeeId: 'EMP-005', email: 'zarif@hynastudio.com' };
  }
  if (idUpper === 'EMP-006' || idLower.includes('hajira') || emailLower.includes('hajira')) {
    return { name: 'Hajira Mufliha', role: 'member' as UserRole, designation: 'UI/UX Designer', department: 'Design', employeeId: 'EMP-006', email: 'hajiramufliha@hynastudio.com' };
  }
  if (idUpper === 'EMP-007' || idLower.includes('linciya') || emailLower.includes('linciya')) {
    return { name: 'Linciya', role: 'member' as UserRole, designation: 'Senior QA Engineer', department: 'Quality Assurance', employeeId: 'EMP-007', email: 'linciya@hynastudio.com' };
  }
  if (idUpper === 'EMP-008' || idLower.includes('arshiya') || emailLower.includes('arshiya')) {
    return { name: 'Arshiya', role: 'member' as UserRole, designation: 'Product Manager', department: 'Product', employeeId: 'EMP-008', email: 'arshiya@hynastudio.com' };
  }
  if (idUpper === 'EMP-009' || idLower.includes('akshaya') || emailLower.includes('akshaya')) {
    return { name: 'Akshaya', role: 'member' as UserRole, designation: 'Frontend Developer', department: 'Engineering', employeeId: 'EMP-009', email: 'akshaya@hynastudio.com' };
  }
  if (idUpper === 'EMP-010' || idLower.includes('thivan') || emailLower.includes('thivan')) {
    return { name: 'Thivan', role: 'member' as UserRole, designation: 'Backend Developer', department: 'Engineering', employeeId: 'EMP-010', email: 'thivan@hynastudio.com' };
  }
  if (idUpper === 'EMP-011' || idLower.includes('rohit') || emailLower.includes('rohit')) {
    return { name: 'Rohit', role: 'member' as UserRole, designation: 'DevOps Engineer', department: 'Operations', employeeId: 'EMP-011', email: 'rohit@hynastudio.com' };
  }
  if (idUpper === 'EMP-012' || idLower.includes('tharun') || emailLower.includes('tharun')) {
    return { name: 'Tharun Krishna', role: 'member' as UserRole, designation: 'Mobile Developer', department: 'Engineering', employeeId: 'EMP-012', email: 'tharunkrishna@hynastudio.com' };
  }
  if (idUpper === 'EMP-013' || idLower.includes('anzar') || emailLower.includes('anzar')) {
    return { name: 'Anzar', role: 'member' as UserRole, designation: 'Marketing Lead', department: 'Marketing', employeeId: 'EMP-013', email: 'anzar@hynastudio.com' };
  }

  const defaultName = rawId.includes('@') ? rawId.split('@')[0] : rawId;
  return {
    name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
    role: 'member' as UserRole,
    designation: 'Software Engineer',
    department: 'Engineering',
    employeeId: undefined as string | undefined,
    email: rawId.includes('@') ? rawId : `${idLower}@hynastudio.com`,
  };
}

function mapDatabaseProfile(row: any): User {
  return {
    id: row.id,
    employeeId: row.employee_id || '',
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
  login: (identifier: string, password: string) => Promise<{ success: boolean; role?: 'admin' | 'manager' | 'member'; error?: string }>;
  signUp: (data: { email: string; password: string; name: string; department?: string; designation?: string; employeeId?: string }) => Promise<{ success: boolean; session?: boolean; requiresEmailConfirmation?: boolean; role?: 'admin' | 'manager' | 'member'; error?: string }>;
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

      login: async (identifier: string, password: string) => {
        try {
          set({ isLoading: true });
          const rawId = identifier.trim();
          let emailToUse = rawId;

          // Support logging in via Employee ID (EMP-001..013), Username (dharshan, jashwin, vignesh), or Email
          if (!rawId.includes('@')) {
            const { data: matchedProfile } = await supabase
              .from('profiles')
              .select('email')
              .or(`employee_id.ilike.${rawId},name.ilike.${rawId}`)
              .maybeSingle();

            if (matchedProfile?.email) {
              emailToUse = matchedProfile.email;
            } else {
              const details = getOrgMemberDetails(rawId);
              emailToUse = details.email;
            }
          }

          let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password,
          });

          // If signIn failed with invalid credentials, check if the account simply does not exist in Supabase Auth yet!
          // Auto-provision initial account with the credentials chosen by the user:
          if (signInError && (signInError.message.toLowerCase().includes('invalid') || signInError.message.toLowerCase().includes('credentials'))) {
            const memberInfo = getOrgMemberDetails(rawId, emailToUse);

            const { data: signUpData, error: autoSignUpError } = await supabase.auth.signUp({
              email: emailToUse,
              password,
              options: {
                data: {
                  name: memberInfo.name,
                  department: memberInfo.department,
                  designation: memberInfo.designation,
                  role: memberInfo.role,
                  employee_id: memberInfo.employeeId,
                },
              },
            });

            if (signUpData?.user) {
              const identities = signUpData.user.identities;
              // If identities is an empty array, it means this email was ALREADY registered with another password in Supabase
              if (identities && identities.length === 0) {
                set({ isLoading: false });
                return {
                  success: false,
                  error: 'Incorrect password for this account. Please check your password and try again.',
                };
              }

              // Fresh account created! Authenticate now with the newly established password:
              const retrySignIn = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password,
              });

              if (retrySignIn.data?.user) {
                authData = retrySignIn.data;
                signInError = null;
              } else if (signUpData.session) {
                authData = { user: signUpData.user, session: signUpData.session };
                signInError = null;
              } else if (retrySignIn.error) {
                signInError = retrySignIn.error;
              }
            } else if (autoSignUpError) {
              const lowerSignErr = autoSignUpError.message.toLowerCase();
              if (lowerSignErr.includes('already registered')) {
                set({ isLoading: false });
                return {
                  success: false,
                  error: 'Incorrect password for this account. Please check your password and try again.',
                };
              }
            }
          }

          if (signInError || !authData?.user) {
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

      signUp: async ({ email, password, name, department, designation, employeeId }) => {
        try {
          set({ isLoading: true });
          const regEmail = email.trim();
          const nameLower = name.trim().toLowerCase();
          const emailLower = regEmail.toLowerCase();
          const empIdUpper = (employeeId || '').trim().toUpperCase();

          let userRole: UserRole = 'member';
          let userDesignation = designation?.trim() || 'Software Engineer';
          let userDepartment = department?.trim() || 'Engineering';
          let userEmpId = employeeId?.trim() || undefined;

          // Executive Admin auto-detection (Dharshan Admin EMP-003, Vignesh CEO EMP-001, Jashwin COO EMP-002)
          if (nameLower.includes('dharshan') || emailLower.includes('dharshan') || empIdUpper === 'EMP-003') {
            userRole = 'admin';
            userDesignation = 'Admin';
            userDepartment = 'Executive';
            userEmpId = 'EMP-003';
          } else if (nameLower.includes('vignesh') || emailLower.includes('vignesh') || empIdUpper === 'EMP-001') {
            userRole = 'admin';
            userDesignation = 'CEO';
            userDepartment = 'Executive';
            userEmpId = 'EMP-001';
          } else if (nameLower.includes('jashwin') || emailLower.includes('jashwin') || empIdUpper === 'EMP-002') {
            userRole = 'admin';
            userDesignation = 'COO';
            userDepartment = 'Executive';
            userEmpId = 'EMP-002';
          // Manager auto-detection (Asthamil Engineering Manager EMP-004)
          } else if (nameLower.includes('asthamil') || emailLower.includes('asthamil') || empIdUpper === 'EMP-004') {
            userRole = 'manager';
            userDesignation = 'Engineering Manager';
            userDepartment = 'Engineering';
            userEmpId = 'EMP-004';
          }

          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: regEmail,
            password,
            options: {
              data: {
                name: name.trim(),
                department: userDepartment,
                designation: userDesignation,
                role: userRole,
                employee_id: userEmpId,
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
                  employee_id: userEmpId,
                  name: name.trim(),
                  email: regEmail,
                  department: userDepartment,
                  designation: userDesignation,
                  role: userRole,
                  status: 'active',
                })
                .select()
                .maybeSingle();

              if (createdProfile) profile = createdProfile;
            }

            const newUser: User = profile ? mapDatabaseProfile(profile) : {
              id: userId,
              employeeId: userEmpId || '',
              name: name.trim(),
              email: regEmail,
              avatar: '',
              role: userRole,
              department: userDepartment,
              designation: userDesignation,
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
            const role = userRole === 'admin' ? 'admin' : userRole === 'manager' ? 'manager' : 'member';
            set({ isLoading: false });
            return { success: true, session: false, requiresEmailConfirmation: true, role };
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
