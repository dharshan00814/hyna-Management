import { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  LogIn,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Timer,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { Avatar, Badge, Button, LoadingState } from '@/components/ui';
import { getStatusColor, formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getUsers, getAttendance, getUserById, checkIn, checkOut } from '@/services/api';
import { toast } from 'sonner';
import type { AttendanceRecord } from '@/types';

function getElapsedDuration(checkInStr?: string): string {
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

  const now = new Date();
  const checkInDate = new Date();
  checkInDate.setHours(h, m, 0, 0);

  const diffMs = Math.max(0, now.getTime() - checkInDate.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
}

export function AttendancePage() {
  const { currentRole, currentUser } = useAuthStore();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPunching, setIsPunching] = useState(false);
  const [activeTab, setActiveTab] = useState<'team' | 'personal'>('team');

  // Real-time ticking clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const isAdminOrManager = currentRole === 'admin' || currentRole === 'manager';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = async () => {
    try {
      await getUsers();
      const records = await getAttendance();
      setAttendance(records);
    } catch (err) {
      console.error('Error loading attendance records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  if (isLoading) return <LoadingState message="Loading attendance records..." />;

  // User's own today attendance
  const myTodayRecord = attendance.find(
    a => a.userId === currentUser?.id && a.date === todayStr
  );
  const isClockedIn = Boolean(myTodayRecord && myTodayRecord.checkIn && !myTodayRecord.checkOut);
  const isClockedOut = Boolean(myTodayRecord && myTodayRecord.checkOut);

  // Handlers for Punch In / Out
  const handlePunchIn = async () => {
    if (!currentUser?.id) {
      toast.error('User session not found.');
      return;
    }
    try {
      setIsPunching(true);
      const record = await checkIn(currentUser.id);
      setAttendance(prev => [record, ...prev.filter(a => !(a.userId === currentUser.id && a.date === todayStr))]);
      toast.success(`Clocked in successfully at ${record.checkIn}! Have a productive day!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record check-in');
    } finally {
      setIsPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!currentUser?.id) {
      toast.error('User session not found.');
      return;
    }
    try {
      setIsPunching(true);
      const record = await checkOut(currentUser.id);
      setAttendance(prev => [record, ...prev.filter(a => !(a.userId === currentUser.id && a.date === todayStr))]);
      toast.success(`Clocked out successfully at ${record.checkOut}! Logged: ${record.workingHours || 'today'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record check-out');
    } finally {
      setIsPunching(false);
    }
  };

  // Team records for selected date
  const teamRecords = attendance.filter(a => a.date === selectedDate);
  const filteredTeamRecords = teamRecords.filter(r => {
    const user = getUserById(r.userId);
    return (
      !search ||
      (user?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (user?.employeeId?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );
  });

  // Team stats on selected date
  const teamPresent = teamRecords.filter(r => r.status === 'present').length;
  const teamLate = teamRecords.filter(r => r.status === 'late').length;
  const teamAbsent = teamRecords.filter(r => r.status === 'absent').length;
  const teamLeave = teamRecords.filter(r => r.status === 'leave').length;

  // Personal user records
  const myRecords = attendance.filter(a => a.userId === currentUser?.id);
  const myPresent = myRecords.filter(r => r.status === 'present').length;
  const myLate = myRecords.filter(r => r.status === 'late').length;
  const myLeave = myRecords.filter(r => r.status === 'leave').length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">
            {isAdminOrManager ? 'Attendance Management' : 'My Attendance & Hours'}
          </h1>
          <p className="page-description">
            {isAdminOrManager
              ? 'Real-time team punch tracking, working hours and personal attendance'
              : 'Punch in and out daily, monitor active shift duration and view attendance history'}
          </p>
        </div>

        {/* Tab switch for Admin & Manager */}
        {isAdminOrManager && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-muted)] self-start sm:self-auto border border-[var(--color-border)]">
            <button
              onClick={() => setActiveTab('team')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'team'
                  ? 'bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Team Overview
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'personal'
                  ? 'bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              My History
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* REAL-TIME LIVE ATTENDANCE PUNCH CARD (FOR ALL MEMBERS & ADMINS) */}
      {/* ============================================================ */}
      <div className="card p-6 mb-8 border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-background)] via-[var(--color-card)] to-[var(--color-muted)]/30 shadow-md">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Digital Clock & Date */}
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]/20 shadow-sm">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-3xl font-extrabold tracking-tight font-mono text-[var(--color-foreground)]">
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                <Calendar className="w-3.5 h-3.5" />
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Status Details */}
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 px-4 py-3 rounded-xl bg-[var(--color-muted)]/50 border border-[var(--color-border)]/50 w-full lg:w-auto">
            <div className="text-center sm:text-left">
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium">Shift Status</p>
              <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                {isClockedIn ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active Shift
                  </span>
                ) : isClockedOut ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Shift Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    Not Clocked In
                  </span>
                )}
              </div>
            </div>

            <div className="h-8 w-px bg-[var(--color-border)] hidden sm:block" />

            <div className="text-center sm:text-left">
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium">
                {isClockedIn ? 'Running Duration' : isClockedOut ? 'Total Logged' : 'Today Check In'}
              </p>
              <p className="text-sm font-bold font-mono text-[var(--color-foreground)] mt-0.5">
                {isClockedIn
                  ? getElapsedDuration(myTodayRecord?.checkIn)
                  : isClockedOut
                  ? myTodayRecord?.workingHours || 'Completed'
                  : 'Pending Punch'}
              </p>
            </div>

            {myTodayRecord?.checkIn && (
              <>
                <div className="h-8 w-px bg-[var(--color-border)] hidden sm:block" />
                <div className="text-center sm:text-left">
                  <p className="text-xs text-[var(--color-muted-foreground)] font-medium">Checked In At</p>
                  <p className="text-sm font-semibold text-[var(--color-foreground)] mt-0.5">
                    {myTodayRecord.checkIn}
                  </p>
                </div>
              </>
            )}

            {myTodayRecord?.checkOut && (
              <>
                <div className="h-8 w-px bg-[var(--color-border)] hidden sm:block" />
                <div className="text-center sm:text-left">
                  <p className="text-xs text-[var(--color-muted-foreground)] font-medium">Checked Out At</p>
                  <p className="text-sm font-semibold text-[var(--color-foreground)] mt-0.5">
                    {myTodayRecord.checkOut}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Action Button: Check In / Check Out */}
          <div className="shrink-0 w-full sm:w-auto flex justify-center">
            {isClockedIn ? (
              <Button
                variant="destructive"
                size="lg"
                onClick={handlePunchOut}
                disabled={isPunching}
                className="w-full sm:w-auto px-6 py-6 shadow-md hover:shadow-lg transition-all rounded-xl font-semibold gap-2"
              >
                <LogOut className="w-5 h-5" />
                {isPunching ? 'Clocking Out...' : 'Punch Out (Clock Out)'}
              </Button>
            ) : isClockedOut ? (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="lg"
                  disabled
                  className="w-full sm:w-auto px-6 py-6 rounded-xl font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 cursor-default"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Day Completed
                </Button>
                <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1">
                  Recorded {myTodayRecord?.workingHours || ''}
                </p>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handlePunchIn}
                disabled={isPunching}
                className="w-full sm:w-auto px-8 py-6 shadow-lg hover:shadow-xl transition-all rounded-xl font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <LogIn className="w-5 h-5" />
                {isPunching ? 'Recording Check In...' : 'Punch In (Clock In)'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW: ADMIN TEAM ATTENDANCE OVERVIEW                         */}
      {/* ============================================================ */}
      {isAdminOrManager && activeTab === 'team' ? (
        <>
          {/* Team Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="card p-4 text-center animate-slide-up border-emerald-500/20">
              <p className="text-2xl font-bold text-emerald-500">{teamPresent}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">Present Today</p>
            </div>
            <div className="card p-4 text-center animate-slide-up stagger-1 border-amber-500/20">
              <p className="text-2xl font-bold text-amber-500">{teamLate}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">Late Check-ins</p>
            </div>
            <div className="card p-4 text-center animate-slide-up stagger-2 border-red-500/20">
              <p className="text-2xl font-bold text-red-500">{teamAbsent}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">Absent</p>
            </div>
            <div className="card p-4 text-center animate-slide-up stagger-3 border-blue-500/20">
              <p className="text-2xl font-bold text-blue-500">{teamLeave}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">On Leave</p>
            </div>
          </div>

          {/* Date Picker & Search Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-sm font-medium focus:ring-2 focus:ring-[var(--color-ring)]"
              />
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  Jump to Today
                </button>
              )}
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
              <input
                type="text"
                placeholder="Search by team member or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
            </div>
          </div>

          {/* Team Attendance Table */}
          <div className="card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
                    <th className="px-4 py-3.5 font-semibold">Team Member</th>
                    <th className="px-4 py-3.5 font-semibold">Department</th>
                    <th className="px-4 py-3.5 font-semibold">Date</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                    <th className="px-4 py-3.5 font-semibold">Clock In</th>
                    <th className="px-4 py-3.5 font-semibold">Clock Out</th>
                    <th className="px-4 py-3.5 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredTeamRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-muted-foreground)]">
                        No team check-in records found for this date.
                      </td>
                    </tr>
                  ) : (
                    filteredTeamRecords.map(record => {
                      const user = getUserById(record.userId);
                      return (
                        <tr key={record.id} className="hover:bg-[var(--color-muted)]/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={user?.name || ''} size="sm" />
                              <div>
                                <p className="font-semibold text-[var(--color-foreground)] leading-snug">
                                  {user?.name || 'Member'}
                                </p>
                                <p className="text-xs text-[var(--color-muted-foreground)]">
                                  {user?.designation || 'Staff'} {user?.employeeId ? `• ${user.employeeId}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                            {user?.department || 'Engineering'}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getStatusColor(record.status)}>{record.status}</Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{record.checkIn || '-'}</td>
                          <td className="px-4 py-3 font-mono text-xs">{record.checkOut || '-'}</td>
                          <td className="px-4 py-3 font-semibold text-xs text-[var(--color-foreground)]">
                            {record.workingHours || (record.checkIn && !record.checkOut ? 'Active' : '-')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ============================================================ */
        /* VIEW: PERSONAL ATTENDANCE HISTORY (MEMBERS & ADMIN PERSONAL)  */
        /* ============================================================ */
        <>
          {/* Member Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="card p-4 text-center animate-slide-up border-emerald-500/20">
              <p className="text-2xl font-bold text-emerald-500">{myPresent}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">Days Present</p>
            </div>
            <div className="card p-4 text-center animate-slide-up stagger-1 border-amber-500/20">
              <p className="text-2xl font-bold text-amber-500">{myLate}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">Late Days</p>
            </div>
            <div className="card p-4 text-center animate-slide-up stagger-2 border-blue-500/20">
              <p className="text-2xl font-bold text-blue-500">{myLeave}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">Approved Leaves</p>
            </div>
            <div className="card p-4 text-center animate-slide-up stagger-3 border-violet-500/20">
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {myTodayRecord?.workingHours || (isClockedIn ? 'In Progress' : '0h 0m')}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">Today Logged</p>
            </div>
          </div>

          {/* Member Attendance Records Table */}
          <div className="card overflow-hidden shadow-sm">
            <div className="px-4 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-sm font-semibold">Attendance Log History</h2>
              <span className="text-xs text-[var(--color-muted-foreground)]">{myRecords.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Check In</th>
                    <th className="px-4 py-3 font-semibold">Check Out</th>
                    <th className="px-4 py-3 font-semibold">Working Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {myRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-muted-foreground)]">
                        No attendance history found. Punch in above to record your first shift!
                      </td>
                    </tr>
                  ) : (
                    myRecords.map(record => (
                      <tr key={record.id} className="hover:bg-[var(--color-muted)]/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(record.status)}>{record.status}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{record.checkIn || '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{record.checkOut || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-xs text-[var(--color-foreground)]">
                          {record.workingHours || (record.checkIn && !record.checkOut ? 'Active' : '-')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
