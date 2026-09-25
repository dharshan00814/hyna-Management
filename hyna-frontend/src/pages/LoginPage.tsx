import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Lock,
  Mail,
  ArrowRight,
  Layers,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores';
import { Button, Input } from '@/components/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, signUp } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('');
    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (!result.success) {
        setErrorMessage(result.error || 'Invalid credentials or user not found.');
        toast.error(result.error || 'Authentication failed');
        setIsLoading(false);
        return;
      }

      toast.success('Authenticated successfully. Loading your dashboard...');

      // Dynamic routing strictly based on database role:
      // CEO / CTO / CPO / COO -> /admin/dashboard
      // Manager -> /manager/dashboard
      // Member -> /member/dashboard
      let targetRoute = '/member/dashboard';
      if (result.role === 'admin') {
        targetRoute = '/admin/dashboard';
      } else if (result.role === 'manager') {
        targetRoute = '/manager/dashboard';
      }

      navigate(targetRoute, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err?.message || 'Unexpected authentication error');
      toast.error('Could not authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required registration fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('');
    setIsLoading(true);

    try {
      const result = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        department: department.trim(),
        designation: 'Software Engineer', // Default designation for new signups
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Registration failed.');
        toast.error(result.error || 'Could not register account');
        setIsLoading(false);
        return;
      }

      if (result.requiresEmailConfirmation) {
        setInfoMessage('Account created! A confirmation email has been sent. Please confirm your email before signing in, or sign in now if email confirmation is disabled in your project.');
        toast.info('Account created! Please check your email inbox.');
        setMode('signin');
      } else {
        toast.success('Account created! Welcome to Hyna Studio.');
        const targetRoute = result.role === 'admin' ? '/admin/dashboard' : result.role === 'manager' ? '/manager/dashboard' : '/member/dashboard';
        navigate(targetRoute, { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration error');
      toast.error('Could not complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[var(--color-background)] text-[var(--color-foreground)] transition-colors">
      {/* Left panel: Branding & Enterprise Intro */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-zinc-950 text-white border-r border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.2),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-zinc-300">
              Hyna Studio
            </span>
            <p className="text-[10px] text-indigo-300/80 uppercase tracking-widest font-semibold">
              Management System
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-md my-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Database-Driven Enterprise Security
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Role-Secured Workspace for High-Performance Teams.
          </h1>
          <p className="text-zinc-300 text-base leading-relaxed">
            Authenticated access automatically provisions your personalized command center. Permissions and queries are enforced server-side with PostgreSQL Row Level Security.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Strict Role-Based Routing (CEO/CTO/COO/CPO, Managers, Members)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Live Supabase Authentication & PostgreSQL RLS Protection</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Personalized Task Deliverables, Sprint Velocity & Attendance</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-zinc-400 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Hyna Studio Management</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Database Authenticated
          </span>
        </div>
      </div>

      {/* Right panel: Login & Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {mode === 'signin' ? 'Sign in to your account' : 'Create new member profile'}
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {mode === 'signin'
                ? 'Enter your credentials to access your personalized workspace.'
                : 'Join Hyna Studio with your work email.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-[var(--color-muted)] p-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                mode === 'signin'
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                mode === 'signup'
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              Register Member
            </button>
          </div>

          {/* Info Banner */}
          {infoMessage && (
            <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              {infoMessage}
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium animate-shake">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="signup-name" className="text-xs font-medium">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]" />
                    <input
                      id="signup-name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="signup-department" className="text-xs font-medium">Department</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]" />
                    <select
                      id="signup-department"
                      name="department"
                      value={department}
                      autoComplete="organization"
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Product">Product</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="text-xs font-medium">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@hynastudio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="text-xs font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-9 pr-10 rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold"
              isLoading={isLoading}
            >
              {mode === 'signin' ? 'Sign In to Workspace' : 'Complete Registration'}
              {!isLoading && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
