import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/stores';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { effectiveRole } = useAuthStore();

  const rolePrefix =
    effectiveRole === 'admin'
      ? '/admin'
      : effectiveRole === 'manager'
      ? '/manager'
      : '/member';

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-[32px] bg-white dark:bg-[#151821] border border-[var(--color-border)] shadow-xl text-center space-y-6 animate-scale-in">
        {/* Visual Badge */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-indigo-500/15 dark:bg-indigo-400/10 blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-3xl bg-[var(--color-primary)]/10 dark:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
            <FileQuestion className="w-8 h-8" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            Error 404
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-xs mx-auto leading-relaxed">
            The page you are looking for does not exist, has been removed, or is temporarily unavailable.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`${rolePrefix}/dashboard`, { replace: true })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#11141A] text-white hover:bg-black dark:bg-white dark:text-[#11141A] dark:hover:bg-slate-100 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
