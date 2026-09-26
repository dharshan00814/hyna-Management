import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FolderKanban, CheckSquare, CalendarClock, Clock, Video,
  ArrowRight, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { StatCard, Avatar, AvatarGroup, Badge, ProgressBar, Button, LoadingState } from '@/components/ui';
import { cn, getGreeting, formatDate, formatTime, getStatusColor } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import {
  getProjects, getTasks, getMeetings, getUsers, getAttendance, getUserById,
} from '@/services/api';
import type { Project, Task, Meeting, User, AttendanceRecord } from '@/types';

const weeklyTaskData = [
  { day: 'Mon', completed: 8, created: 5 },
  { day: 'Tue', completed: 12, created: 7 },
  { day: 'Wed', completed: 6, created: 10 },
  { day: 'Thu', completed: 15, created: 8 },
  { day: 'Fri', completed: 10, created: 4 },
];

export function AdminDashboard() {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [u, p, t, m, a] = await Promise.all([
          getUsers(),
          getProjects(),
          getTasks(),
          getMeetings(),
          getAttendance(),
        ]);
        if (isMounted) {
          setUsers(u);
          setProjects(p);
          setTasks(t);
          setMeetings(m);
          setAttendance(a);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  if (isLoading) return <LoadingState />;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const presentCount = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const lateCount = todayAttendance.filter(a => a.status === 'late').length;
  const absentCount = todayAttendance.filter(a => a.status === 'absent').length;
  const leaveCount = todayAttendance.filter(a => a.status === 'leave').length;

  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'backlog').length;
  const activeProjects = projects.filter(p => p.status === 'active').length;

  const upcomingMeetings = meetings
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 3);

  const pendingReviews = tasks.filter(t => t.status === 'in-review' && t.submission?.reviewStatus === 'pending');

  const taskStatusData = [
    { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length || 1, color: '#10b981' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length || 1, color: '#6366f1' },
    { name: 'In Review', value: tasks.filter(t => t.status === 'in-review').length || 1, color: '#8b5cf6' },
    { name: 'Blocked', value: tasks.filter(t => t.status === 'blocked').length || 1, color: '#ef4444' },
    { name: 'Todo', value: tasks.filter(t => t.status === 'todo').length || 1, color: '#3b82f6' },
    { name: 'Backlog', value: tasks.filter(t => t.status === 'backlog').length || 1, color: '#a1a1aa' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{getGreeting()}, {currentUser?.name?.split(' ')[0] || 'Team Lead'} 👋</h1>
        <p className="page-description">Here's what's happening at Hyna Studio today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Members" value={users.filter(u => u.status === 'active').length} change={8} icon={Users} iconColor="text-blue-500" />
        <StatCard label="Active Projects" value={activeProjects} change={12} icon={FolderKanban} iconColor="text-violet-500" className="stagger-1" />
        <StatCard label="Pending Tasks" value={pendingTasks} change={-5} icon={CheckSquare} iconColor="text-amber-500" className="stagger-2" />
        <StatCard label="Today's Attendance" value={`${presentCount}/${users.filter(u => u.status === 'active').length || 1}`} change={2} icon={CalendarClock} iconColor="text-emerald-500" className="stagger-3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project overview */}
          <div className="card p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Project Overview</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/projects')}>
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="space-y-4">
              {projects.filter(p => p.status === 'active').map((project, idx) => (
                <div
                  key={`${project.id}-${idx}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--color-muted)] transition-colors cursor-pointer group"
                  onClick={() => navigate(`/admin/projects/${project.id}`)}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <ProgressBar value={project.progress} showLabel className="mt-2" />
                  </div>
                  <AvatarGroup
                    names={project.memberIds.map(id => getUserById(id)?.name || '').filter(Boolean)}
                    max={3}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Task & Activity charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Weekly task chart */}
            <div className="card p-6 animate-slide-up stagger-1">
              <h2 className="text-base font-semibold mb-4">Weekly Tasks</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyTaskData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="created" fill="#e4e4e7" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#6366f1]" />
                  <span className="text-xs text-[var(--color-muted-foreground)]">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#e4e4e7]" />
                  <span className="text-xs text-[var(--color-muted-foreground)]">Created</span>
                </div>
              </div>
            </div>

            {/* Task status pie */}
            <div className="card p-6 animate-slide-up stagger-2">
              <h2 className="text-base font-semibold mb-4">Task Overview</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {taskStatusData.map(item => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] text-[var(--color-muted-foreground)]">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending reviews */}
          {pendingReviews.length > 0 && (
            <div className="card p-6 animate-slide-up stagger-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Pending Reviews</h2>
                <span className="text-xs text-[var(--color-muted-foreground)]">{pendingReviews.length} tasks</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--color-muted-foreground)]">
                      <th className="pb-3 font-medium">Task</th>
                      <th className="pb-3 font-medium hidden sm:table-cell">Member</th>
                      <th className="pb-3 font-medium hidden md:table-cell">Project</th>
                      <th className="pb-3 font-medium">Submitted</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {pendingReviews.map(task => {
                      const member = getUserById(task.assigneeId);
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <tr key={task.id} className="hover:bg-[var(--color-muted)] transition-colors">
                          <td className="py-3 pr-4">
                            <p className="font-medium truncate max-w-[200px]">{task.title}</p>
                          </td>
                          <td className="py-3 pr-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <Avatar name={member?.name || ''} size="xs" />
                              <span className="truncate">{member?.name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 hidden md:table-cell text-[var(--color-muted-foreground)]">{project?.name}</td>
                          <td className="py-3 pr-4 text-[var(--color-muted-foreground)]">{task.submission ? formatDate(task.submission.submittedAt) : '-'}</td>
                          <td className="py-3 text-right">
                            <Button variant="outline" size="sm" onClick={() => navigate('/admin/tasks')}>
                              <Eye className="w-3.5 h-3.5 mr-1" /> Review
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Today's attendance */}
          <div className="card p-6 animate-slide-in-right">
            <h2 className="text-base font-semibold mb-4">Today's Attendance</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Present', value: presentCount, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Late', value: lateCount, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                { label: 'Absent', value: absentCount, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
                { label: 'On Leave', value: leaveCount, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
              ].map(item => (
                <div key={item.label} className={cn('rounded-xl p-3 text-center', item.bg)}>
                  <p className={cn('text-2xl font-semibold', item.color)}>{item.value}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming meetings */}
          <div className="card p-6 animate-slide-in-right stagger-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Upcoming Meetings</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/meetings')}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingMeetings.map(meeting => (
                <div key={meeting.id} className="p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-muted-foreground)] transition-colors">
                  <p className="text-sm font-medium">{meeting.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--color-muted-foreground)]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(meeting.date)} • {formatTime(meeting.startTime)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <AvatarGroup
                      names={meeting.participantIds.slice(0, 6).map(id => getUserById(id)?.name || '').filter(Boolean)}
                      max={4}
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
              ))}
            </div>
          </div>

          {/* Recent members */}
          <div className="card p-6 animate-slide-in-right stagger-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Team Members</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/members')}>
                View all
              </Button>
            </div>
            <div className="space-y-2">
              {users.slice(0, 6).map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/members/${user.id}`)}
                >
                  <Avatar name={user.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] truncate">{user.designation}</p>
                  </div>
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    user.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300',
                  )} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
