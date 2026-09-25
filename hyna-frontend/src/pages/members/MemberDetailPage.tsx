import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock } from 'lucide-react';
import { Button, Avatar, Badge, Tabs, ProgressBar, EmptyState } from '@/components/ui';
import { cn, getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getUserById, mockTasks, mockProjects, mockAttendance } from '@/mock/data';
import { useState } from 'react';

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole } = useAuthStore();
  const prefix = currentRole === 'member' ? '/member' : '/admin';
  const [activeTab, setActiveTab] = useState('profile');

  const member = getUserById(id || '');
  if (!member) return <div className="page-container"><EmptyState title="Member not found" action={<Button onClick={() => navigate(`${prefix}/members`)}>Go Back</Button>} /></div>;

  const memberTasks = mockTasks.filter(t => t.assigneeId === id);
  const memberProjects = mockProjects.filter(p => p.memberIds.includes(id || ''));

  const tabs = [
    { value: 'profile', label: 'Profile' },
    { value: 'tasks', label: 'Tasks', count: memberTasks.length },
    { value: 'projects', label: 'Projects', count: memberProjects.length },
  ];

  return (
    <div className="page-container">
      <button onClick={() => navigate(`${prefix}/members`)} className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Members
      </button>

      <div className="card p-6 mb-6 animate-slide-up">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <Avatar name={member.name} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold">{member.name}</h1>
              <div className={cn('w-2.5 h-2.5 rounded-full', member.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300')} />
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">{member.designation} • {member.department}</p>
            {member.bio && <p className="text-sm text-[var(--color-muted-foreground)] mt-2">{member.bio}</p>}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-[var(--color-muted-foreground)]">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{member.email}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{member.phone}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Joined {formatDate(member.joinDate)}</span>
            </div>
            {member.skills && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {member.skills.map(skill => <Badge key={skill} className="bg-[var(--color-muted)] text-[var(--color-foreground)]">{skill}</Badge>)}
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} className="mb-6 w-fit" />

      {activeTab === 'profile' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
          <div className="card p-4 text-center"><p className="text-2xl font-semibold">{memberProjects.length}</p><p className="text-xs text-[var(--color-muted-foreground)]">Projects</p></div>
          <div className="card p-4 text-center"><p className="text-2xl font-semibold">{memberTasks.length}</p><p className="text-xs text-[var(--color-muted-foreground)]">Total Tasks</p></div>
          <div className="card p-4 text-center"><p className="text-2xl font-semibold text-emerald-500">{memberTasks.filter(t => t.status === 'completed').length}</p><p className="text-xs text-[var(--color-muted-foreground)]">Completed</p></div>
          <div className="card p-4 text-center"><p className="text-2xl font-semibold text-blue-500">{memberTasks.filter(t => t.status === 'in-progress').length}</p><p className="text-xs text-[var(--color-muted-foreground)]">In Progress</p></div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-2 animate-fade-in">
          {memberTasks.map(task => (
            <div key={task.id} className="card p-4 card-hover flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor(task.status)}>{task.status.replace(/-/g, ' ')}</Badge>
                  <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                </div>
              </div>
              <span className="text-xs text-[var(--color-muted-foreground)] shrink-0">{formatDate(task.deadline)}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {memberProjects.map(project => (
            <div key={project.id} className="card p-5 card-hover cursor-pointer" onClick={() => navigate(`${prefix}/projects/${project.id}`)}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                <h3 className="text-sm font-semibold">{project.name}</h3>
                <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
              </div>
              <ProgressBar value={project.progress} showLabel className="mt-3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
