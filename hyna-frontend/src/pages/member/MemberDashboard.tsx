import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Clock, CheckCircle2, Send, Video, ArrowRight,
  Check, Edit3, Calendar,
} from 'lucide-react';
import { StatCard, AvatarGroup, Badge, Button, Textarea, LoadingState } from '@/components/ui';
import { cn, getGreeting, formatDate, formatTime, getStatusColor, getPriorityColor } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import {
  getUserTasks, getUserMeetings, getUserAttendance,
  submitDailyReport, checkIn, checkOut, getUserById, getUsers,
} from '@/services/api';
import { toast } from 'sonner';
import type { Task, Meeting, AttendanceRecord } from '@/types';

export function MemberDashboard() {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [dailyReport, setDailyReport] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const userId = currentUser?.id || 'u2';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        await getUsers();
        const [t, m, a] = await Promise.all([
          getUserTasks(userId),
          getUserMeetings(userId),
          getUserAttendance(userId),
        ]);
        if (isMounted) {
          setTasks(t);
          setMeetings(m);
          setAttendance(a);
          const todayRecord = a.find(record => record.date === todayStr);
          if (todayRecord && todayRecord.status === 'present' && !todayRecord.checkOut) {
            setIsCheckedIn(true);
          }
        }
      } catch (err) {
        console.error('Error loading member dashboard data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [userId, todayStr]);

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inReviewTasks = tasks.filter(t => t.status === 'in-review');
  const todayTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'backlog');
  const todayAttendance = attendance.find(a => a.date === todayStr);

  const upcomingMeetings = meetings
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 2);

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

  const handleCheckIn = async () => {
    try {
      const record = await checkIn(userId);
      setAttendance(prev => [record, ...prev.filter(a => a.date !== todayStr)]);
      setIsCheckedIn(true);
      toast.success('Checked in successfully!');
    } catch (err) {
      toast.error('Check in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      const record = await checkOut(userId);
      setAttendance(prev => [record, ...prev.filter(a => a.date !== todayStr)]);
      setIsCheckedIn(false);
      toast.success('Checked out successfully!');
    } catch (err) {
      toast.error('Check out failed');
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{getGreeting()}, {currentUser?.name?.split(' ')[0] || 'Team Member'} 👋</h1>
        <p className="page-description">Here's your work overview for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="My Tasks" value={tasks.length} change={5} icon={CheckSquare} iconColor="text-blue-500" />
        <StatCard label="Completed" value={completedTasks.length} change={15} icon={CheckCircle2} iconColor="text-emerald-500" className="stagger-1" />
        <StatCard label="In Review" value={inReviewTasks.length} icon={Send} iconColor="text-violet-500" className="stagger-2" />
        <StatCard label="Working Hours" value={todayAttendance?.workingHours || '0h 0m'} icon={Clock} iconColor="text-amber-500" className="stagger-3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's tasks */}
          <div className="card p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Today's Tasks</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/member/tasks')}>
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="space-y-1">
              {todayTasks.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)] py-4 text-center">No tasks for today 🎉</p>
              ) : (
                todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-muted)] transition-colors cursor-pointer group"
                    onClick={() => navigate('/member/tasks')}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      task.status === 'completed' ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--color-border)] group-hover:border-[var(--color-primary)]',
                    )}>
                      {task.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium truncate',
                        task.status === 'completed' && 'line-through text-[var(--color-muted-foreground)]',
                      )}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        {task.deadline && (
                          <span className="text-xs text-[var(--color-muted-foreground)]">
                            Due {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace('-', ' ')}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Daily work report */}
          <div className="card p-6 animate-slide-up stagger-1">
            <div className="flex items-center gap-2 mb-4">
              <Edit3 className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-base font-semibold">Today's Work Report</h2>
            </div>
            <Textarea
              placeholder="What did you work on today? Describe your achievements, challenges, and tomorrow's plan..."
              value={dailyReport}
              onChange={(e) => setDailyReport(e.target.value)}
              rows={4}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmitReport}>
                <Send className="w-3.5 h-3.5 mr-1" /> Submit Report
              </Button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Daily check-in */}
          <div className="card p-6 animate-slide-in-right">
            <h2 className="text-base font-semibold mb-4">Today's Attendance</h2>
            <div className="text-center py-4">
              {isCheckedIn ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-lg font-semibold">{todayAttendance?.checkIn || '09:12'} AM</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">Checked In</p>
                  <div className="flex items-center justify-center gap-2 mt-3 text-sm">
                    <Clock className="w-4 h-4 text-[var(--color-muted-foreground)]" />
                    <span className="font-medium">Working: {todayAttendance?.workingHours || '6h 24m'}</span>
                  </div>
                  <Button variant="outline" className="mt-4 w-full" onClick={handleCheckOut}>
                    Check Out
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8 text-[var(--color-muted-foreground)]" />
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">You haven't checked in yet</p>
                  <Button className="mt-4 w-full" onClick={handleCheckIn}>Check In</Button>
                </>
              )}
            </div>
          </div>

          {/* Upcoming meetings */}
          <div className="card p-6 animate-slide-in-right stagger-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Upcoming Meetings</h2>
            </div>
            <div className="space-y-3">
              {upcomingMeetings.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">No upcoming meetings</p>
              ) : (
                upcomingMeetings.map(meeting => (
                  <div key={meeting.id} className="p-3 rounded-xl border border-[var(--color-border)]">
                    <p className="text-sm font-medium">{meeting.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--color-muted-foreground)]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(meeting.date)} • {formatTime(meeting.startTime)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <AvatarGroup
                        names={meeting.participantIds.slice(0, 4).map(id => getUserById(id)?.name || '').filter(Boolean)}
                        max={3}
                      />
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {meeting.participantIds.length} participants
                      </span>
                    </div>
                    {meeting.meetingLink && (
                      <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => window.open(meeting.meetingLink, '_blank')}>
                        <Video className="w-3.5 h-3.5 mr-1" /> Join Meeting
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My activity summary */}
          <div className="card p-6 animate-slide-in-right stagger-2">
            <h2 className="text-base font-semibold mb-4">Activity Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Tasks completed</span>
                <span className="text-sm font-semibold">{completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Tasks in review</span>
                <span className="text-sm font-semibold">{inReviewTasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Total assigned</span>
                <span className="text-sm font-semibold">{tasks.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
