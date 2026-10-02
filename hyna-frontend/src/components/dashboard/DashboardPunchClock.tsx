import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, LogIn, LogOut, CheckCircle2, AlertCircle,
  Timer, RotateCcw, ArrowRight, Sparkles, Zap, Flame,
  ShieldCheck, HelpCircle
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { checkIn, checkOut, resetTodayAttendance, getUserAttendance } from '@/services/api';
import {
  getPunchInStatus,
  getPunchOutStatus,
  calculateRecordPoints,
  calculateUserStreakAndPoints,
  POINTS_ON_TIME,
  POINTS_GRACE,
} from '@/lib/attendanceRules';
import { toast } from 'sonner';
import type { AttendanceRecord } from '@/types';

interface DashboardPunchClockProps {
  onAttendanceChanged?: () => void;
  className?: string;
  todayRecord?: AttendanceRecord;
  attendanceRecords?: AttendanceRecord[];
}

function getElapsedDuration(checkInStr?: string, now = new Date()): string {
  if (!checkInStr) return '00:00:00';
  const cleaned = checkInStr.trim();
  const isPM = /pm/i.test(cleaned);
  const isAM = /am/i.test(cleaned);
  const digits = cleaned.replace(/[^0-9:]/g, '');
  const [hRaw, mRaw] = digits.split(':');
  let h = parseInt(hRaw || '0', 10);
  const m = parseInt(mRaw || '0', 10);
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  const checkInDate = new Date();
  checkInDate.setHours(h, m, 0, 0);

  const diffMs = Math.max(0, now.getTime() - checkInDate.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function DashboardPunchClock({
  onAttendanceChanged,
  className,
  todayRecord: propTodayRecord,
  attendanceRecords: propAttendanceRecords,
}: DashboardPunchClockProps) {
  const navigate = useNavigate();
  const { currentUser, effectiveRole } = useAuthStore();
  const userId = currentUser?.id || '';
  const rolePrefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
  const [showSimMenu, setShowSimMenu] = useState(false);

  // Local fallback record if prop not passed
  const [fetchedTodayRecord, setFetchedTodayRecord] = useState<AttendanceRecord | null>(null);
  const [fetchedAllRecords, setFetchedAllRecords] = useState<AttendanceRecord[]>([]);

  // Effective time (real or simulated for test mode)
  const effectiveTime = simulatedTime || currentTime;

  // Real-time clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch user attendance if records not supplied via props
  useEffect(() => {
    if (propTodayRecord || (propAttendanceRecords && propAttendanceRecords.length > 0) || !userId) return;

    let isMounted = true;
    getUserAttendance(userId)
      .then(records => {
        if (!isMounted) return;
        setFetchedAllRecords(records);
        const todayStr = new Date().toISOString().split('T')[0];
        const match = records.find(r => r.date === todayStr);
        if (match) setFetchedTodayRecord(match);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [userId, propTodayRecord, propAttendanceRecords]);

  const todayStr = effectiveTime.toISOString().split('T')[0];
  const allRecords = propAttendanceRecords || fetchedAllRecords;
  const todayRecord = propTodayRecord || fetchedTodayRecord || allRecords.find(r => r.date === todayStr && (r.userId === userId || !r.userId));

  const isClockedIn = Boolean(todayRecord && todayRecord.checkIn && !todayRecord.checkOut);
  const isClockedOut = Boolean(todayRecord && todayRecord.checkOut);
  const notClockedIn = !isClockedIn && !isClockedOut;

  const punchInStatus = getPunchInStatus(effectiveTime);
  const punchOutStatus = getPunchOutStatus(effectiveTime, todayRecord?.checkIn);
  const pointEval = todayRecord ? calculateRecordPoints(todayRecord, effectiveTime) : null;
  const streakInfo = calculateUserStreakAndPoints(allRecords, userId, effectiveTime);

  // Formatted date and time strings
  const formattedTime = effectiveTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = effectiveTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Action: Punch In
  const handlePunchIn = async (overrideDate?: Date) => {
    if (!userId) {
      toast.error('User session not found.');
      return;
    }
    const timeToUse = overrideDate || effectiveTime;
    const status = getPunchInStatus(timeToUse);

    if (!status.canPunchIn && !overrideDate) {
      toast.error(status.tooltip);
      return;
    }

    try {
      setIsSubmitting(true);
      const record = await checkIn(userId, timeToUse);
      setFetchedTodayRecord(record);
      setFetchedAllRecords(prev => [record, ...prev.filter(r => r.date !== todayStr)]);

      toast.success(
        status.phase === 'on_time'
          ? `🎉 Punched In on-time at ${record.checkIn}! +10 Points earned! 🎯`
          : `⏱️ Punched In during grace window at ${record.checkIn}! +5 Points earned! ⏱️`
      );

      if (onAttendanceChanged) {
        onAttendanceChanged();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Check-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Punch Out
  const handlePunchOut = async (overrideDate?: Date) => {
    if (!userId) {
      toast.error('User session not found.');
      return;
    }
    const timeToUse = overrideDate || effectiveTime;
    const status = getPunchOutStatus(timeToUse, todayRecord?.checkIn);

    if (!status.canPunchOut && !overrideDate) {
      toast.error(status.tooltip);
      return;
    }

    try {
      setIsSubmitting(true);
      const record = await checkOut(userId, timeToUse);
      setFetchedTodayRecord(record);
      setFetchedAllRecords(prev => [record, ...prev.filter(r => r.date !== todayStr)]);

      toast.success(`🎉 Punched Out at ${record.checkOut}! Full shift points preserved.`);

      if (onAttendanceChanged) {
        onAttendanceChanged();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Check-out failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset shift for testing / demo
  const handleReset = async () => {
    if (!userId) return;
    try {
      setIsSubmitting(true);
      await resetTodayAttendance(userId);
      setFetchedTodayRecord(null);
      setFetchedAllRecords(prev => prev.filter(r => r.date !== todayStr));
      setSimulatedTime(null);
      toast.success("Today's shift record has been reset!");
      if (onAttendanceChanged) {
        onAttendanceChanged();
      }
    } catch (err) {
      toast.error('Failed to reset attendance record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick simulation helper
  const handleSimulate = (hours: number, minutes: number) => {
    const sim = new Date();
    sim.setHours(hours, minutes, 0, 0);
    setSimulatedTime(sim);
    setShowSimMenu(false);
    toast.info(`Clock simulated to ${sim.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`);
  };

  const handleClearSimulation = () => {
    setSimulatedTime(null);
    setShowSimMenu(false);
    toast.success('Live clock restored.');
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all mb-6',
        isClockedIn && 'border-emerald-500/30 bg-gradient-to-r from-card via-emerald-500/[0.03] to-emerald-500/10',
        isClockedOut && 'border-blue-500/30 bg-gradient-to-r from-card via-blue-500/[0.03] to-blue-500/10',
        className
      )}
    >
      {/* Ambient background glow */}
      {isClockedIn && (
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      )}
      {isClockedOut && (
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Simulation Active Indicator Banner */}
      {simulatedTime && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 animate-spin" />
            <span className="font-semibold">
              Simulation Clock Active: {formattedTime} ({formattedDate})
            </span>
          </div>
          <button
            onClick={handleClearSimulation}
            className="hover:underline font-bold text-[11px] text-violet-600 dark:text-violet-400"
          >
            Reset to Real Clock ✕
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Section: Live Clock & Date */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-colors',
              isClockedIn
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : isClockedOut
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
                : 'bg-primary/10 border-primary/20 text-primary'
            )}
          >
            {isClockedIn ? (
              <Zap className="w-6 h-6 animate-pulse" />
            ) : isClockedOut ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <Clock className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-[var(--color-foreground)]">
                {formattedTime}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 border flex items-center gap-1.5',
                  isClockedIn
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : isClockedOut
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                    : punchInStatus.canPunchIn
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isClockedIn
                      ? 'bg-emerald-500 animate-ping'
                      : isClockedOut
                      ? 'bg-blue-500'
                      : punchInStatus.canPunchIn
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-muted-foreground'
                  )}
                />
                {isClockedIn
                  ? 'Shift In Progress'
                  : isClockedOut
                  ? 'Shift Completed'
                  : punchInStatus.badgeText}
              </Badge>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 flex items-center gap-2">
              <span>{formattedDate}</span>
              <span>•</span>
              <span>Standard Shift: 9:00 AM – 10:00 PM</span>
            </p>
          </div>
        </div>

        {/* Center Section: Live Shift / Attendance Metrics */}
        <div className="flex items-center gap-4 sm:gap-6 py-2 px-3 sm:px-4 rounded-xl bg-background/60 border border-border/50 text-xs">
          {isClockedIn ? (
            <>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                  Punched In At
                </span>
                <span className="font-mono font-bold text-sm text-[var(--color-foreground)]">
                  {todayRecord?.checkIn}
                </span>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                  Elapsed Time
                </span>
                <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 animate-spin" />
                  {getElapsedDuration(todayRecord?.checkIn, effectiveTime)}
                </span>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                  Points
                </span>
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {pointEval?.finalPoints || 10} Pts
                </span>
              </div>
            </>
          ) : isClockedOut ? (
            <>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                  Shift Duration
                </span>
                <span className="font-mono font-bold text-sm text-[var(--color-foreground)]">
                  {todayRecord?.workingHours || 'Logged'}
                </span>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                  Time Window
                </span>
                <span className="font-mono font-bold text-xs text-[var(--color-muted-foreground)]">
                  {todayRecord?.checkIn} → {todayRecord?.checkOut}
                </span>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                  Earned
                </span>
                <span className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  +{pointEval?.finalPoints || 10} Pts
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                  On-Time Window
                </span>
                <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  9:00 – 10:00 AM (+10 Pts)
                </span>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                  Grace Window
                </span>
                <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                  10:00 – 10:15 AM (+5 Pts)
                </span>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                  Punch Out
                </span>
                <span className="font-mono font-bold text-xs text-[var(--color-muted-foreground)]">
                  9:00 – 10:00 PM
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Section: Primary Punch In / Punch Out Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {notClockedIn && (
            <>
              {punchInStatus.canPunchIn ? (
                <Button
                  size="lg"
                  onClick={() => handlePunchIn()}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  title={punchInStatus.tooltip}
                >
                  <LogIn className="w-5 h-5" />
                  <span>
                    {punchInStatus.phase === 'on_time'
                      ? '⚡ Punch In (+10 Pts)'
                      : '⏱️ Punch In (+5 Pts Grace)'}
                  </span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="lg"
                    disabled={isSubmitting}
                    onClick={() => {
                      toast.info(punchInStatus.tooltip);
                      setShowSimMenu(true);
                    }}
                    variant="outline"
                    className="border-dashed font-semibold px-5 py-2.5 rounded-xl opacity-80 hover:opacity-100 flex items-center gap-2"
                    title={punchInStatus.tooltip}
                  >
                    <LogIn className="w-5 h-5 text-muted-foreground" />
                    <span>{punchInStatus.label}</span>
                  </Button>
                </div>
              )}
            </>
          )}

          {isClockedIn && (
            <>
              {punchOutStatus.canPunchOut ? (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => handlePunchOut()}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-rose-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  title={punchOutStatus.tooltip}
                >
                  <LogOut className="w-5 h-5" />
                  <span>Punch Out (Keep 10 Pts)</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="lg"
                    disabled={isSubmitting}
                    onClick={() => {
                      toast.info(punchOutStatus.tooltip);
                      setShowSimMenu(true);
                    }}
                    variant="outline"
                    className="border-dashed font-semibold px-5 py-2.5 rounded-xl opacity-80 hover:opacity-100 flex items-center gap-2"
                    title={punchOutStatus.tooltip}
                  >
                    <LogOut className="w-5 h-5 text-amber-500" />
                    <span>{punchOutStatus.label}</span>
                  </Button>
                </div>
              )}
            </>
          )}

          {isClockedOut && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate(`${rolePrefix}/attendance`)}
              className="font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 bg-background/50 hover:bg-background"
            >
              <span>View Attendance Log</span>
              <ArrowRight className="w-4 h-4 text-primary" />
            </Button>
          )}

          {/* Quick Simulation / Testing Helper Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSimMenu(!showSimMenu)}
              className="p-2.5 rounded-xl border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Test Shift Windows & Simulation"
            >
              <Timer className="w-4 h-4" />
            </button>

            {showSimMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <span className="font-bold flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-primary" /> Test Shift Window
                  </span>
                  <button
                    onClick={() => setShowSimMenu(false)}
                    className="text-muted-foreground hover:text-foreground p-0.5"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Simulate clock times to test Punch In / Punch Out during any hour of the day:
                </p>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => handleSimulate(9, 15)}
                    className="p-1.5 text-left rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium"
                  >
                    9:15 AM (+10 Pts)
                  </button>
                  <button
                    onClick={() => handleSimulate(10, 8)}
                    className="p-1.5 text-left rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium"
                  >
                    10:08 AM (+5 Pts)
                  </button>
                  <button
                    onClick={() => handleSimulate(21, 30)}
                    className="p-1.5 text-left rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-medium"
                  >
                    9:30 PM (Punch Out)
                  </button>
                  <button
                    onClick={() => handleSimulate(22, 15)}
                    className="p-1.5 text-left rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-medium"
                  >
                    10:15 PM (Cut-off)
                  </button>
                </div>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <button
                    onClick={handleReset}
                    className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1"
                    title="Reset today's attendance record"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Today
                  </button>
                  <button
                    onClick={handleClearSimulation}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Restore Live Clock
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
