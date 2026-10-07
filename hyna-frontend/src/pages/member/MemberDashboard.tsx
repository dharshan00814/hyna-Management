import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Clock, CheckCircle2, Send, Video, ArrowRight,
  Check, Edit3, Calendar, FileText, Zap, Layers, AlertCircle
} from 'lucide-react';
import { Badge, Button, Textarea, LoadingState } from '@/components/ui';
import { cn, getGreeting, formatDate, formatTime, getStatusColor, getPriorityColor } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import {
  getUserTasks, getUserMeetings, getUserAttendance,
  submitDailyReport, getUsers,
} from '@/services/api';
import { DashboardPunchClock } from '@/components/dashboard/DashboardPunchClock';
import { toast } from 'sonner';
import type { Task, Meeting, AttendanceRecord } from '@/types';

export function MemberDashboard() {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [dailyReport, setDailyReport] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const userId = currentUser?.id || '';
  const todayStr = new Date().toISOString().split('T')[0];

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
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const todayTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'backlog');
  const todayAttendance = attendance.find(a => a.date === todayStr);

  const upcomingMeetings = meetings
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 3);

  const handleSubmitReport = async () => {
    if (!dailyReport.trim()) {
      toast.error('Please write your daily report before submitting.');
      return;
    }
    try {
      setIsSubmittingReport(true);
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
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (isLoading) return <LoadingState />;

  const displayName = currentUser?.name || 'Member';

  return (
    <div className="page-container py-6 space-y-6 animate-fade-in max-w-[1560px]">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#11141A] dark:text-white">
            {getGreeting()}, {displayName} 👋
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1 font-medium">
            Welcome to your workspace dashboard. Track your daily attendance, tasks, and reports.
          </p>
        </div>
      </div>

      {/* 2. PUNCH IN / PUNCH OUT CLOCK BAR */}
      <DashboardPunchClock
        todayRecord={todayAttendance}
        attendanceRecords={attendance}
        onAttendanceChanged={loadData}
      />

      {/* 3. WORK STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#151821] rounded-2xl p-4 border border-[var(--color-border)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">Assigned Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#11141A] dark:text-white">{tasks.length}</p>
          <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">Total across projects</p>
        </div>

        <div className="bg-white dark:bg-[#151821] rounded-2xl p-4 border border-[var(--color-border)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#11141A] dark:text-white">{inProgressTasks.length}</p>
          <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">Active sprint items</p>
        </div>

        <div className="bg-white dark:bg-[#151821] rounded-2xl p-4 border border-[var(--color-border)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#11141A] dark:text-white">{completedTasks.length}</p>
          <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">Delivered tasks</p>
        </div>

        <div className="bg-white dark:bg-[#151821] rounded-2xl p-4 border border-[var(--color-border)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">Upcoming Meetings</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#11141A] dark:text-white">{upcomingMeetings.length}</p>
          <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">Scheduled calls</p>
        </div>
      </div>

      {/* 4. MAIN CONTENT GRID: TASKS & WORK LOG / MEETINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT 2 COLS: ASSIGNED TASKS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#151821] rounded-[24px] p-5 sm:p-6 border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#11141A] dark:text-white">Today's Assigned Tasks</h2>
                <p className="text-xs text-[var(--color-muted-foreground)]">Your active deliverables and priority items</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/member/tasks')}>
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="space-y-2.5">
              {todayTasks.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#11141A] dark:text-white">All caught up!</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">No pending tasks assigned for today.</p>
                </div>
              ) : (
                todayTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/member/tasks')}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-muted)]/50 hover:bg-[var(--color-muted)] transition-colors cursor-pointer border border-transparent hover:border-[var(--color-border)]"
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      task.status === 'completed' ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--color-border)]',
                    )}>
                      {task.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-[#11141A] dark:text-white">{task.title}</p>
                      <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
                        {task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}
                      </p>
                    </div>
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider',
                      task.priority === 'urgent' || task.priority === 'high'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : task.priority === 'medium'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                    )}>
                      {task.priority}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white dark:bg-[#11141A] border border-[var(--color-border)] text-[var(--color-foreground)] capitalize">
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COL: WORK LOG & MEETINGS */}
        <div className="space-y-6">
          
          {/* Daily Work Log Report */}
          <div className="bg-white dark:bg-[#151821] rounded-[24px] p-5 sm:p-6 border border-[var(--color-border)] shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#11141A] dark:text-white">Submit Work Log</h3>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">Log today's accomplishments & progress</p>
              </div>
            </div>
            
            <Textarea
              placeholder="Outline deliverables completed, PRs merged, and next priorities..."
              value={dailyReport}
              onChange={(e) => setDailyReport(e.target.value)}
              rows={3}
              className="text-xs"
            />

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleSubmitReport}
                size="sm"
                disabled={isSubmittingReport}
                className="bg-primary text-primary-foreground font-semibold text-xs"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>

          {/* Upcoming Meetings Card */}
          <div className="bg-white dark:bg-[#151821] rounded-[24px] p-5 sm:p-6 border border-[var(--color-border)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#11141A] dark:text-white">Upcoming Meetings</h3>
                  <p className="text-[11px] text-[var(--color-muted-foreground)]">Calls & sync sessions</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/member/meetings')}>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-2">
              {upcomingMeetings.length === 0 ? (
                <p className="text-xs text-[var(--color-muted-foreground)] py-4 text-center">
                  No upcoming meetings scheduled.
                </p>
              ) : (
                upcomingMeetings.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/member/meetings/${m.id}`)}
                    className="p-3 rounded-xl bg-[var(--color-muted)]/50 hover:bg-[var(--color-muted)] transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#11141A] dark:text-white truncate">{m.title}</p>
                      <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
                        {formatDate(m.date)} • {m.startTime}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="text-[11px] h-7 px-2.5 shrink-0">
                      <Video className="w-3 h-3 mr-1 text-violet-600" /> Join
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
