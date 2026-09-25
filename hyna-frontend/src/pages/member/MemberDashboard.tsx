import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Clock, CheckCircle2, Send, Video, ArrowRight,
  Circle, Check, Edit3, Calendar,
} from 'lucide-react';
import { StatCard, Avatar, AvatarGroup, Badge, ProgressBar, Button, Textarea } from '@/components/ui';
import { cn, getGreeting, formatDate, formatTime, getStatusColor, getPriorityColor, getPriorityDot } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { mockTasks, mockMeetings, mockAttendance, getUserById } from '@/mock/data';
import { toast } from 'sonner';

export function MemberDashboard() {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [dailyReport, setDailyReport] = useState('');
  const [isCheckedIn] = useState(true);

  const userId = currentUser?.id || 'u2';
  const myTasks = mockTasks.filter(t => t.assigneeId === userId);
  const completedTasks = myTasks.filter(t => t.status === 'completed');
  const inReviewTasks = myTasks.filter(t => t.status === 'in-review');
  const todayTasks = myTasks.filter(t => t.status !== 'completed' && t.status !== 'backlog');

  const todayStr = '2026-09-25';
  const todayAttendance = mockAttendance.find(a => a.userId === userId && a.date === todayStr);

  const upcomingMeetings = mockMeetings
    .filter(m => m.participantIds.includes(userId) && m.status === 'scheduled' && m.date >= todayStr)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 2);

  const handleSubmitReport = () => {
    if (!dailyReport.trim()) {
      toast.error('Please write your daily report before submitting.');
      return;
    }
    toast.success('Daily report submitted successfully!');
    setDailyReport('');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{getGreeting()}, {currentUser?.name.split(' ')[0]} 👋</h1>
        <p className="page-description">Here's your work overview for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="My Tasks" value={myTasks.length} change={5} icon={CheckSquare} iconColor="text-blue-500" />
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
                  <Button variant="outline" className="mt-4 w-full">
                    Check Out
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8 text-[var(--color-muted-foreground)]" />
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">You haven't checked in yet</p>
                  <Button className="mt-4 w-full">Check In</Button>
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
              {upcomingMeetings.map(meeting => (
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
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      <Video className="w-3.5 h-3.5 mr-1" /> Join Meeting
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* My activity summary */}
          <div className="card p-6 animate-slide-in-right stagger-2">
            <h2 className="text-base font-semibold mb-4">This Week</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Tasks completed</span>
                <span className="text-sm font-semibold">7</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Tasks in review</span>
                <span className="text-sm font-semibold">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Avg. working hours</span>
                <span className="text-sm font-semibold">7h 42m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Reports submitted</span>
                <span className="text-sm font-semibold">4/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">Attendance</span>
                <span className="text-sm font-semibold text-emerald-500">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
