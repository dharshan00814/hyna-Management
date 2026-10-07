import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Clock, CheckCircle2, Send, Video, ArrowRight,
  Check, Edit3, Calendar, Sparkles, TrendingUp, Heart,
  Flame, Award, Shield, FileText, Zap, Layers, RefreshCw
} from 'lucide-react';
import { DotMatrixNumber, Badge, Button, Textarea, LoadingState, AvatarGroup } from '@/components/ui';
import { cn, getGreeting, formatDate, formatTime, getStatusColor, getPriorityColor } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import {
  getUserTasks, getUserMeetings, getUserAttendance,
  submitDailyReport, checkIn, checkOut, getUserById, getUsers,
} from '@/services/api';
import { DashboardPunchClock } from '@/components/dashboard/DashboardPunchClock';
import {
  getPunchInStatus,
  getPunchOutStatus,
  calculateRecordPoints,
  calculateUserStreakAndPoints,
} from '@/lib/attendanceRules';
import { toast } from 'sonner';
import type { Task, Meeting, AttendanceRecord } from '@/types';

export function MemberDashboard() {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [dailyReport, setDailyReport] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('All Data');

  const userId = currentUser?.id || '';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!userId) return;
    try {
      await getUsers();
      const [t, m, a] = await Promise.all([
        getUserTasks(userId),
        getUserMeetings(userId),
        getUserAttendance(userId),
      ]);
      setTasks(t);
      setMeetings(m);
      setAttendance(a);
      const todayRecord = a.find(record => record.date === todayStr);
      if (todayRecord && todayRecord.checkIn && !todayRecord.checkOut) {
        setIsCheckedIn(true);
      } else {
        setIsCheckedIn(false);
      }
    } catch (err) {
      console.error('Error loading member dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, todayStr]);

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inReviewTasks = tasks.filter(t => t.status === 'in-review');
  const todayTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'backlog');
  const todayAttendance = attendance.find(a => a.date === todayStr);

  const upcomingMeetings = meetings
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 2);

  const streakData = calculateUserStreakAndPoints(attendance, userId, currentTime);
  const todayPointEval = todayAttendance ? calculateRecordPoints(todayAttendance, currentTime) : null;

  const handleSubmitReport = async () => {
    if (!dailyReport.trim()) {
      toast.error('Please write your daily report before submitting.');
      return;
    }
    try {
      await submitDailyReport({
        userId,
        date: todayStr,
        content: dailyReport,
        hoursWorked: 8,
      });
      toast.success('Daily report submitted successfully!');
      setDailyReport('');
    } catch (err) {
      toast.error('Failed to submit report');
    }
  };

  if (isLoading) return <LoadingState />;

  const displayName = currentUser?.name || 'Sophia Caldwell';

  return (
    <div className="page-container py-6 space-y-8 animate-fade-in max-w-[1560px]">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER & METRIC PILL COUNTERS (Superpower Style) */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-4">
          {/* Large Clean User Heading */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#11141A] dark:text-white">
              {displayName}
            </h1>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1 font-medium">
              {getGreeting()} • Performance & Productivity Overview
            </p>
          </div>

          {/* Metric Pills Row with LED Dot Matrix numbers */}
          <div className="flex items-center gap-5 sm:gap-7 flex-wrap pt-1">
            {/* Total */}
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#11141A] dark:text-white">
                <DotMatrixNumber value={tasks.length || 106} size="sm" />
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#D4F82C] text-[#11141A]">
                Total
              </span>
            </div>

            {/* Optimal / Completed */}
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#11141A] dark:text-white">
                <DotMatrixNumber value={completedTasks.length || 80} size="sm" />
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white dark:bg-[#151821] border border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                Optimal
              </span>
            </div>

            {/* In range / In review */}
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#11141A] dark:text-white">
                <DotMatrixNumber value={inReviewTasks.length || 21} size="sm" />
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white dark:bg-[#151821] border border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                In range
              </span>
            </div>

            {/* Out of range / Pending */}
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#11141A] dark:text-white">
                <DotMatrixNumber value={todayTasks.length || 5} size="sm" />
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white dark:bg-[#151821] border border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                Out of range
              </span>
            </div>
          </div>
        </div>

        {/* Top Right: Upload / Report Pill Card */}
        <div className="w-full lg:w-72 bg-white dark:bg-[#151821] rounded-[28px] p-4 border border-[var(--color-border)] shadow-xs flex flex-col justify-between shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-[#11141A] dark:text-white">Submit Work Report</p>
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">Log daily achievements</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-foreground)]">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-2xl bg-[var(--color-muted)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-foreground)]">Active Reports</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-[#11141A] text-[var(--color-foreground)] shadow-2xs">
              2 files
            </span>
          </div>
        </div>
      </div>

      {/* Floating Timeline Health / Streak Indicator Pill */}
      <div className="bg-white/80 dark:bg-[#151821]/80 backdrop-blur-md rounded-full px-5 py-3 border border-[var(--color-border)] shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#11141A] dark:text-white uppercase tracking-wider">
            {new Date().toLocaleString('default', { month: 'long' })}
          </span>
          {/* Visual Dot Sequence */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <span
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  i <= 8 ? 'bg-emerald-500' : i === 9 ? 'bg-[#D4F82C] ring-2 ring-black/10 dark:ring-white/20' : 'bg-gray-300 dark:bg-gray-700'
                )}
              />
            ))}
          </div>
        </div>

        {/* Floating Health Improving Badge */}
        <div className="bg-white dark:bg-[#191D28] rounded-full px-4 py-1.5 border border-[var(--color-border)] shadow-xs flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-[#11141A] dark:text-white">Output Improving</span>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">+3.2 last 30 days</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. HERO BENTO CARDS: AURA GREEN & AURA ORANGE/LILAC      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: SUPERPOWER SCORE (Lush Green & Honey Aura) */}
        <div className="aura-green-amber p-7 sm:p-8 min-h-[260px] flex flex-col justify-between shadow-lg relative group">
          {/* Title & Badge */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-semibold text-white/90 tracking-wide">
              Superpower Score
            </span>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          </div>

          {/* Center Metric: LED Dot Matrix Number + Status */}
          <div className="text-center my-3 relative z-10">
            <div className="inline-block drop-shadow-md text-white">
              <DotMatrixNumber value="70" size="2xl" dotColor="#FFFFFF" />
            </div>
            <p className="text-xs font-bold text-white/95 mt-1 tracking-wide">On Track</p>
          </div>

          {/* Bottom Dot-Matrix Equalizer Chart */}
          <div className="relative z-10 flex items-end justify-center gap-1 h-8 opacity-80 pt-2">
            {[3, 4, 3, 5, 4, 6, 7, 8, 9, 7, 6, 5, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 3, 4].map((h, idx) => (
              <div key={idx} className="flex flex-col gap-1 items-center">
                {Array.from({ length: Math.min(5, Math.ceil(h / 2)) }).map((_, dIdx) => (
                  <span key={dIdx} className="w-1 h-1 rounded-full bg-white/90" />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* CARD 2: BIOLOGICAL AGE / VELOCITY (Sunset Orange & Lilac Aura) */}
        <div className="aura-orange-lilac p-7 sm:p-8 min-h-[260px] flex flex-col justify-between shadow-lg relative group">
          {/* Title & Badge */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-semibold text-white/90 tracking-wide">
              Biological age
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-xs text-white">
              Peak
            </span>
          </div>

          {/* Center Metric: LED Dot Matrix Number + Subtitle */}
          <div className="text-center my-3 relative z-10">
            <div className="inline-block drop-shadow-md text-white">
              <DotMatrixNumber value="25" size="2xl" dotColor="#FFFFFF" />
            </div>
            <p className="text-xs font-bold text-white/95 mt-1 tracking-wide">2.5 years younger</p>
          </div>

          {/* Bottom Digital Scale / Ruler Tick Marks with Illuminated Needle */}
          <div className="relative z-10 pt-2">
            <div className="flex items-end justify-between px-6 h-6 border-b border-white/20 relative">
              {Array.from({ length: 29 }).map((_, i) => {
                const isCenter = i === 14;
                return (
                  <div
                    key={i}
                    className={cn(
                      'w-0.5 transition-all',
                      isCenter
                        ? 'h-5 bg-white shadow-[0_0_8px_#fff] rounded-full'
                        : i % 4 === 0
                        ? 'h-3 bg-white/70'
                        : 'h-1.5 bg-white/40'
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Punch Clock Attendance Bar */}
      <DashboardPunchClock
        todayRecord={todayAttendance}
        attendanceRecords={attendance}
        onAttendanceChanged={loadData}
      />

      {/* ======================================================== */}
      {/* 3. BIOMARKERS & TOP SUPPLEMENTS / WORK FOCUS (Screenshot) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
        
        {/* LEFT COLUMN: Biomarkers */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#11141A] dark:text-white">Biomarkers</h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">A snapshot of what's happening inside your body & workflow.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Card 1: Heart Health */}
            <div className="bg-white dark:bg-[#151821] rounded-[28px] p-5 border border-[var(--color-border)] shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">Heart Health</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#11141A] dark:text-white">
                  <DotMatrixNumber value="103" size="sm" />
                </span>
                <span className="text-[11px] text-[var(--color-muted-foreground)] font-medium">mg/dl</span>
              </div>
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1 font-medium">LDL Cholesterol</p>
            </div>

            {/* Card 2: Nutrients */}
            <div className="bg-white dark:bg-[#151821] rounded-[28px] p-5 border border-[var(--color-border)] shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">Nutrients</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#11141A] dark:text-white">
                  <DotMatrixNumber value="43" size="sm" />
                </span>
                <span className="text-[11px] text-[var(--color-muted-foreground)] font-medium">ng/dL</span>
              </div>
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1 font-medium">Vitamin D</p>
            </div>
          </div>

          {/* Today's Tasks in Superpower Card */}
          <div className="bg-white dark:bg-[#151821] rounded-[28px] p-6 border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#11141A] dark:text-white">Today's Assigned Tasks</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/member/tasks')}>
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="space-y-2">
              {todayTasks.length === 0 ? (
                <p className="text-xs text-[var(--color-muted-foreground)] py-4 text-center">
                  All tasks completed for today ✨
                </p>
              ) : (
                todayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/member/tasks')}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-muted)]/50 hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      task.status === 'completed' ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--color-border)]',
                    )}>
                      {task.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-[#11141A] dark:text-white">{task.title}</p>
                      <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Priority: {task.priority}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-[#11141A] border border-[var(--color-border)] text-[var(--color-foreground)]">
                      {task.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Top Supplements & Meetings */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#11141A] dark:text-white">Top Supplements for You</h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">Support your balance with supplements picked for you.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Supplement 1: Green Glass Orb */}
            <div className="bg-white dark:bg-[#151821] rounded-[28px] p-5 border border-[var(--color-border)] shadow-xs flex flex-col items-center text-center relative overflow-hidden group">
              <span className="self-start px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#D4F82C] text-[#11141A] uppercase tracking-wider">
                Best Seller
              </span>
              <div className="w-16 h-16 my-4 glass-orb-green group-hover:scale-110 transition-transform duration-300" />
              <p className="text-xs font-bold text-[#11141A] dark:text-white">Omega-3 Pure</p>
              <p className="text-[10px] text-[var(--color-muted-foreground)]">Cellular Health</p>
            </div>

            {/* Supplement 2: Blue Glass Orb */}
            <div className="bg-white dark:bg-[#151821] rounded-[28px] p-5 border border-[var(--color-border)] shadow-xs flex flex-col items-center text-center relative overflow-hidden group">
              <span className="self-start px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#D4F82C] text-[#11141A] uppercase tracking-wider">
                Best Seller
              </span>
              <div className="w-16 h-16 my-4 glass-orb-blue group-hover:scale-110 transition-transform duration-300" />
              <p className="text-xs font-bold text-[#11141A] dark:text-white">Magnesium Glycinate</p>
              <p className="text-[10px] text-[var(--color-muted-foreground)]">Recovery & Sleep</p>
            </div>
          </div>

          {/* Daily Work Report in Superpower Card */}
          <div className="bg-white dark:bg-[#151821] rounded-[28px] p-6 border border-[var(--color-border)] shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#11141A] dark:text-white" />
              <h3 className="text-sm font-bold text-[#11141A] dark:text-white">Submit Work Log</h3>
            </div>
            <Textarea
              placeholder="What did you achieve today? Outline deliverables, PRs, and tomorrow's goals..."
              value={dailyReport}
              onChange={(e) => setDailyReport(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmitReport} size="sm" variant="neon">
                <Send className="w-3.5 h-3.5 mr-1" /> Submit Report
              </Button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
