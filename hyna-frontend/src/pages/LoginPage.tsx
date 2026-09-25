import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Briefcase,
  UserCheck,
  Lock,
  Mail,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores';
import type { UserRole } from '@/types';
import { mockUsers } from '@/mock/data';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState('karthik@hynastudio.com');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'admin') setEmail('karthik@hynastudio.com');
    else if (role === 'manager') setEmail('priya@hynastudio.com');
    else setEmail('dharshan@hynastudio.com');
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      login(selectedRole);
      const roleName = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
      toast.success(`Welcome back! Logged in as ${roleName}`);
      setIsLoading(false);
      const rolePrefix = selectedRole === 'member' ? '/member' : '/admin';
      navigate(`${rolePrefix}/dashboard`, { replace: true });
    }, 400);
  };

  const demoAccounts = [
    {
      role: 'admin' as UserRole,
      title: 'Administrator',
      name: 'Karthik Rajan',
      desc: 'Full access to projects, members, financial reports & settings',
      icon: ShieldCheck,
      color: 'from-indigo-500 to-purple-600',
    },
    {
      role: 'manager' as UserRole,
      title: 'Manager',
      name: 'Priya Sharma',
      desc: 'Sprint planning, module oversight & task assignments',
      icon: Briefcase,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      role: 'member' as UserRole,
      title: 'Team Member',
      name: 'Dharshan Kumar',
      desc: 'Daily tasks, progress tracking, attendance & collaboration',
      icon: UserCheck,
      color: 'from-emerald-500 to-teal-600',
    },
  ];

  return (
    <div className="min-h-screen w-full flex bg-[var(--color-background)] text-[var(--color-foreground)] transition-colors">
      {/* Left panel: Branding & Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-zinc-950 text-white border-r border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.2),transparent_50%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-zinc-300">
              Hyna Studio
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-md my-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Enterprise Project & Team Orchestration
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Streamlined Management for High-Impact Teams.
          </h1>
          <p className="text-zinc-300 text-base leading-relaxed">
            Unify sprints, real-time attendance, deliverables, client projects, and cross-functional collaboration into one cohesive command center.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
            <div>
              <p className="text-2xl font-bold text-white">99.8%</p>
              <p className="text-xs text-zinc-400">On-time Delivery</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">4.9 / 5</p>
              <p className="text-xs text-zinc-400">Team Satisfaction</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-400">
          <span>&copy; {new Date().getFullYear()} Hyna Studio Technologies</span>
          <span>Security & ISO 27001 Certified</span>
        </div>
      </div>

      {/* Right panel: Login Form & Role switcher */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 max-w-2xl mx-auto w-full">
        <div className="w-full space-y-8">
          {/* Header */}
          <div>
            <div className="lg:hidden flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">Hyna Studio</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Select your role profile below to preview the platform with demo accounts.
            </p>
          </div>

          {/* Quick Role selector cards */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
              Select Quick Role
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {demoAccounts.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleRoleSelect(item.role)}
                    className={`relative text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-[var(--color-muted)]'
                        : 'border-[var(--color-border)] hover:border-zinc-400 dark:hover:border-zinc-600 bg-[var(--color-card)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${item.color} flex items-center justify-center text-white shadow-sm`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />
                      )}
                    </div>
                    <div className="font-semibold text-sm">{item.title}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">{item.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--color-foreground)]">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-muted-foreground)]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[var(--color-foreground)]">
                  Password
                </label>
                <span className="text-xs text-[var(--color-muted-foreground)] hover:underline cursor-pointer">
                  Demo password filled
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-muted-foreground)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[var(--color-primary)] hover:opacity-95 text-[var(--color-primary-foreground)] font-medium text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign in as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick info footer */}
          <div className="rounded-lg bg-[var(--color-muted)] p-3 text-xs text-[var(--color-muted-foreground)] border border-[var(--color-border)] flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Mock Authentication Mode: Choose any role profile above to explore the respective permissions and views.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
