import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, LogIn, LogOut, CheckCircle2, Timer, ArrowRight, Zap
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore, isExecutiveLeadership } from '@/stores';
import { checkIn, checkOut, getUserAttendance } from '@/services/api';
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

  // Do not render punch clock for executive leadership (CEO, CTO, COO, Executive dept)
  const isExec = isExecutiveLeadership(currentUser) || currentUser?.department === 'Executive';
  if (isExec) {
    return null;
  }

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local fallback record if prop not passed
  const [fetchedTodayRecord, setFetchedTodayRecord] = useState<AttendanceRecord | null>(null);
  const [fetchedAllRecords, setFetchedAllRecords] = useState<AttendanceRecord[]>([]);

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

  const todayStr = currentTime.toISOString().split('T')[0];
  const allRecords = propAttendanceRecords || fetchedAllRecords;
  const todayRecord = propTodayRecord || fetchedTodayRecord || allRecords.find(r => r.date === todayStr && (r.userId === userId || !r.userId));

  const isClockedIn = Boolean(todayRecord && todayRecord.checkIn && !todayRecord.checkOut);
  const isClockedOut = Boolean(todayRecord && todayRecord.checkOut);
  const notClockedIn = !isClockedIn && !isClockedOut;

  // Formatted date and time strings
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Action: Punch In
  const handlePunchIn = async () => {
    if (!userId) {
      toast.error('User session not found.');
      return;
    }

    try {
      setIsSubmitting(true);
      const record = await checkIn(userId, currentTime);
      setFetchedTodayRecord(record);
      setFetchedAllRecords(prev => [record, ...prev.filter(r => r.date !== todayStr)]);

      toast.success(`🎉 Punched In at ${record.checkIn}!`);

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
  const handlePunchOut = async () => {
    if (!userId) {
      toast.error('User session not found.');
      return;
    }

    try {
      setIsSubmitting(true);
      const record = await checkOut(userId, currentTime);
      setFetchedTodayRecord(record);
      setFetchedAllRecords(prev => [record, ...prev.filter(r => r.date !== todayStr)]);

      toast.success(`🎉 Punched Out at ${record.checkOut}! Duration: ${record.workingHours}`);

      if (onAttendanceChanged) {
        onAttendanceChanged();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Check-out failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white dark:bg-[#151821] p-4 sm:p-5 shadow-xs hover:shadow-md transition-all mb-6',
        isClockedIn && 'border-emerald-500/30 ring-1 ring-emerald-500/20',
        isClockedOut && 'border-blue-500/30',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Left Side: Clock & Running Time */}
        <div className="flex items-center gap-3.5">
          {/* Status Icon */}
          <div
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs transition-colors',
              isClockedIn
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : isClockedOut
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
                : 'bg-[var(--color-muted)] border-[var(--color-border)] text-[var(--color-foreground)]'
            )}
          >
            {isClockedIn ? (
              <Zap className="w-5 h-5 animate-pulse text-emerald-600 dark:text-emerald-400" />
            ) : isClockedOut ? (
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>

          {/* Time Display */}
          <div className="min-w-0">
            {isClockedIn ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl sm:text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {getElapsedDuration(todayRecord?.checkIn, currentTime)}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 flex items-center gap-1.5 rounded-full"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Shift Active
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 font-medium">
                  Punched In at <span className="font-semibold text-[var(--color-foreground)]">{todayRecord?.checkIn}</span>
                </p>
              </div>
            ) : isClockedOut ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)] whitespace-nowrap">
                    {todayRecord?.workingHours || 'Logged'}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[11px] font-bold px-2 py-0.5 flex items-center gap-1.5 rounded-full"
                  >
                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                    Shift Completed
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 font-medium">
                  {todayRecord?.checkIn} → {todayRecord?.checkOut}
                </p>
              </div>
            ) : (
              <div>
                <span className="font-mono text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)] whitespace-nowrap block">
                  {formattedTime}
                </span>
                <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 font-medium">
                  {formattedDate}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Punch In / Punch Out Action */}
        <div className="flex items-center gap-2 shrink-0">
          {notClockedIn && (
            <Button
              size="md"
              onClick={handlePunchIn}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer h-10"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">
                {isSubmitting ? 'Punching In...' : 'Punch In'}
              </span>
            </Button>
          )}

          {isClockedIn && (
            <Button
              size="md"
              variant="destructive"
              onClick={handlePunchOut}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-rose-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer h-10"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">
                {isSubmitting ? 'Punching Out...' : 'Punch Out'}
              </span>
            </Button>
          )}

          {isClockedOut && (
            <Button
              size="md"
              variant="outline"
              onClick={() => navigate(`${rolePrefix}/attendance`)}
              className="w-full sm:w-auto font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-background/60 hover:bg-background h-10"
            >
              <span className="whitespace-nowrap">Attendance Log</span>
              <ArrowRight className="w-4 h-4 text-primary shrink-0" />
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
