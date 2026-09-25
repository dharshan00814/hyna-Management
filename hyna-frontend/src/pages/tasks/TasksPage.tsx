import { useState } from 'react';
import { Plus, Search, List, LayoutGrid, Calendar as CalendarIcon, Filter, MoreHorizontal, Paperclip, MessageSquare, ExternalLink, Clock } from 'lucide-react';
import { Button, Badge, Avatar, Tabs, Modal, Input, Textarea, Select, EmptyState } from '@/components/ui';
import { cn, getStatusColor, getPriorityColor, getPriorityDot, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { mockTasks, mockProjects, mockModules, getUserById } from '@/mock/data';
import { toast } from 'sonner';
import type { TaskStatus, TaskPriority } from '@/types';

const statusColumns: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'backlog', label: 'Backlog', color: 'bg-zinc-400' },
  { status: 'todo', label: 'To Do', color: 'bg-blue-500' },
  { status: 'in-progress', label: 'In Progress', color: 'bg-indigo-500' },
  { status: 'in-review', label: 'In Review', color: 'bg-purple-500' },
  { status: 'completed', label: 'Completed', color: 'bg-emerald-500' },
  { status: 'blocked', label: 'Blocked', color: 'bg-red-500' },
];

export function TasksPage() {
  const { currentRole, currentUser } = useAuthStore();
  const [view, setView] = useState<'list' | 'board'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState<string | null>(null);

  const allTasks = currentRole === 'member'
    ? mockTasks.filter(t => t.assigneeId === currentUser?.id)
    : mockTasks;

  const filtered = allTasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const detailTask = showDetail ? mockTasks.find(t => t.id === showDetail) : null;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-description">{filtered.length} tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-muted)]">
            <button onClick={() => setView('list')} className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-[var(--color-card)] shadow-sm' : '')}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('board')} className={cn('p-1.5 rounded-md transition-colors', view === 'board' ? 'bg-[var(--color-card)] shadow-sm' : '')}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input type="text" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-sm">
          <option value="all">All Status</option>
          {statusColumns.map(s => <option key={s.status} value={s.status}>{s.label}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-sm">
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-1.5 animate-fade-in">
          {filtered.length === 0 ? (
            <EmptyState title="No tasks found" description="Try adjusting your filters or create a new task." />
          ) : (
            filtered.map(task => {
              const assignee = getUserById(task.assigneeId);
              const project = mockProjects.find(p => p.id === task.projectId);
              return (
                <div key={task.id} className="card p-3 sm:p-4 card-hover flex items-center gap-3 sm:gap-4 cursor-pointer" onClick={() => setShowDetail(task.id)}>
                  <div className={cn('w-2 h-2 rounded-full shrink-0', getPriorityDot(task.priority))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={getStatusColor(task.status)}>{task.status.replace(/-/g, ' ')}</Badge>
                      {project && <span className="text-xs text-[var(--color-muted-foreground)]">{project.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {task.attachments > 0 && <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]"><Paperclip className="w-3 h-3" />{task.attachments}</span>}
                    {task.comments > 0 && <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]"><MessageSquare className="w-3 h-3" />{task.comments}</span>}
                    <span className="text-xs text-[var(--color-muted-foreground)] hidden md:inline">{formatDate(task.deadline)}</span>
                    {assignee && <Avatar name={assignee.name} size="xs" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Board view */}
      {view === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4 animate-fade-in">
          {statusColumns.map(col => {
            const colTasks = filtered.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="flex-shrink-0 w-72">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={cn('w-2 h-2 rounded-full', col.color)} />
                  <span className="text-sm font-medium">{col.label}</span>
                  <span className="text-xs text-[var(--color-muted-foreground)] ml-auto">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => {
                    const assignee = getUserById(task.assigneeId);
                    return (
                      <div key={task.id} className="card p-3 card-hover cursor-pointer" onClick={() => setShowDetail(task.id)}>
                        <p className="text-sm font-medium mb-2">{task.title}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          {assignee && <Avatar name={assignee.name} size="xs" />}
                          <span className="text-[11px] text-[var(--color-muted-foreground)]">{formatDate(task.deadline)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task detail modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title={detailTask?.title || 'Task'} size="lg"
        footer={
          currentRole === 'member' && detailTask?.assigneeId === currentUser?.id && detailTask?.status === 'in-progress' ? (
            <Button onClick={() => { setShowDetail(null); setShowSubmit(detailTask?.id || null); }}>Submit for Review</Button>
          ) : currentRole !== 'member' && detailTask?.submission?.reviewStatus === 'pending' ? (
            <>
              <Button variant="outline" onClick={() => { toast.info('Changes requested'); setShowDetail(null); }}>Request Changes</Button>
              <Button onClick={() => { toast.success('Task approved!'); setShowDetail(null); }}>Approve</Button>
            </>
          ) : undefined
        }>
        {detailTask && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">{detailTask.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-[var(--color-muted-foreground)]">Status</span><br /><Badge className={getStatusColor(detailTask.status)}>{detailTask.status.replace(/-/g, ' ')}</Badge></div>
              <div><span className="text-[var(--color-muted-foreground)]">Priority</span><br /><Badge className={getPriorityColor(detailTask.priority)}>{detailTask.priority}</Badge></div>
              <div><span className="text-[var(--color-muted-foreground)]">Assignee</span><br /><div className="flex items-center gap-2 mt-1"><Avatar name={getUserById(detailTask.assigneeId)?.name || ''} size="xs" /><span>{getUserById(detailTask.assigneeId)?.name}</span></div></div>
              <div><span className="text-[var(--color-muted-foreground)]">Deadline</span><br /><span className="font-medium">{formatDate(detailTask.deadline)}</span></div>
              <div><span className="text-[var(--color-muted-foreground)]">Project</span><br /><span className="font-medium">{mockProjects.find(p => p.id === detailTask.projectId)?.name}</span></div>
              <div><span className="text-[var(--color-muted-foreground)]">Module</span><br /><span className="font-medium">{mockModules.find(m => m.id === detailTask.moduleId)?.name}</span></div>
            </div>
            {detailTask.checklist && detailTask.checklist.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Checklist</p>
                <div className="space-y-1.5">
                  {detailTask.checklist.map(item => (
                    <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={item.completed} readOnly className="rounded" />
                      <span className={item.completed ? 'line-through text-[var(--color-muted-foreground)]' : ''}>{item.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {detailTask.submission && (
              <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <p className="text-sm font-semibold mb-2">Submission</p>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-2">{detailTask.submission.description}</p>
                <div className="flex flex-wrap gap-2">
                  {detailTask.submission.githubUrl && (
                    <a href={detailTask.submission.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
                      <ExternalLink className="w-3 h-3" /> GitHub
                    </a>
                  )}
                  {detailTask.submission.deploymentUrl && (
                    <a href={detailTask.submission.deploymentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
                      <ExternalLink className="w-3 h-3" /> Deployment
                    </a>
                  )}
                </div>
                <Badge className={cn('mt-2', getStatusColor(detailTask.submission.reviewStatus === 'approved' ? 'completed' : detailTask.submission.reviewStatus === 'changes-requested' ? 'blocked' : 'in-review'))}>
                  {detailTask.submission.reviewStatus.replace(/-/g, ' ')}
                </Badge>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Submit task modal */}
      <Modal isOpen={!!showSubmit} onClose={() => setShowSubmit(null)} title="Submit Task for Review"
        footer={<><Button variant="outline" onClick={() => setShowSubmit(null)}>Cancel</Button><Button onClick={() => { setShowSubmit(null); toast.success('Task submitted for review!'); }}>Submit for Review</Button></>}>
        <div className="space-y-4">
          <Textarea label="Description" placeholder="Describe what you've completed..." rows={3} />
          <Input label="GitHub URL" placeholder="https://github.com/..." />
          <Input label="Deployment URL" placeholder="https://staging..." />
          <Textarea label="Notes" placeholder="Any additional notes..." rows={2} />
        </div>
      </Modal>

      {/* Create task modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Task"
        footer={<><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => { setShowCreate(false); toast.success('Task created successfully!'); }}>Create Task</Button></>}>
        <div className="space-y-4">
          <Input label="Task Title" placeholder="Enter task title" />
          <Textarea label="Description" placeholder="Task description..." rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
            <Select label="Status" options={[{ value: 'backlog', label: 'Backlog' }, { value: 'todo', label: 'To Do' }, { value: 'in-progress', label: 'In Progress' }]} />
          </div>
          <Input label="Deadline" type="date" />
          <Select label="Project" options={mockProjects.map(p => ({ value: p.id, label: p.name }))} />
        </div>
      </Modal>
    </div>
  );
}
