import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Users as UsersIcon, FolderKanban, CheckSquare, FileText, Activity, Plus } from 'lucide-react';
import { Button, Badge, ProgressBar, Avatar, AvatarGroup, Tabs, EmptyState, Modal, Input, Textarea } from '@/components/ui';
import { cn, getStatusColor, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { mockProjects, mockModules, mockTasks, getUserById } from '@/mock/data';
import { toast } from 'sonner';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole } = useAuthStore();
  const prefix = currentRole === 'member' ? '/member' : '/admin';
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModule, setShowCreateModule] = useState(false);

  const project = mockProjects.find(p => p.id === id);
  if (!project) {
    return (
      <div className="page-container">
        <EmptyState title="Project not found" description="The project you're looking for doesn't exist." action={<Button onClick={() => navigate(`${prefix}/projects`)}>Go to Projects</Button>} />
      </div>
    );
  }

  const modules = mockModules.filter(m => m.projectId === id);
  const tasks = mockTasks.filter(t => t.projectId === id);
  const manager = getUserById(project.managerId);

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'modules', label: 'Modules', count: modules.length },
    { value: 'tasks', label: 'Tasks', count: tasks.length },
    { value: 'members', label: 'Members', count: project.memberIds.length },
    { value: 'activity', label: 'Activity' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`${prefix}/projects`)} className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <h1 className="page-title truncate">{project.name}</h1>
            <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
          </div>
          <p className="page-description mt-1 truncate">{project.description}</p>
        </div>
      </div>

      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} className="mb-6 w-fit" />

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="text-base font-semibold mb-4">Progress</h2>
              <ProgressBar value={project.progress} showLabel size="md" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-3 rounded-xl bg-[var(--color-muted)]">
                  <p className="text-2xl font-semibold">{tasks.length}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Total Tasks</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{tasks.filter(t => t.status === 'completed').length}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Completed</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{tasks.filter(t => t.status === 'in-progress').length}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">In Progress</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
                  <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{tasks.filter(t => t.status === 'blocked').length}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Blocked</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Modules</h2>
                {currentRole !== 'member' && (
                  <Button size="sm" variant="outline" onClick={() => setShowCreateModule(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Module
                  </Button>
                )}
              </div>
              {modules.length === 0 ? (
                <EmptyState title="No modules yet" description="Create modules to organize project tasks." />
              ) : (
                <div className="space-y-3">
                  {modules.map(mod => (
                    <div key={mod.id} className="p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-muted-foreground)] transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-semibold">{mod.name}</h3>
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{mod.description}</p>
                        </div>
                        <span className="text-sm font-semibold">{mod.progress}%</span>
                      </div>
                      <ProgressBar value={mod.progress} size="sm" className="mb-3" />
                      <div className="flex gap-4 text-xs text-[var(--color-muted-foreground)]">
                        <span>Tasks: {mod.totalTasks}</span>
                        <span className="text-emerald-500">Done: {mod.completedTasks}</span>
                        <span className="text-purple-500">Review: {mod.inReviewTasks}</span>
                        {mod.blockedTasks > 0 && <span className="text-red-500">Blocked: {mod.blockedTasks}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-base font-semibold mb-4">Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Manager</span><div className="flex items-center gap-2">{manager && <Avatar name={manager.name} size="xs" />}<span className="font-medium">{manager?.name}</span></div></div>
                <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Start Date</span><span className="font-medium">{formatDate(project.startDate)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Deadline</span><span className="font-medium">{formatDate(project.deadline)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Last Updated</span><span className="font-medium">{formatDate(project.lastUpdated)}</span></div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-muted-foreground)] mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map(tag => (
                    <Badge key={tag} className="bg-[var(--color-muted)] text-[var(--color-foreground)]">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-base font-semibold mb-4">Team ({project.memberIds.length})</h2>
              <div className="space-y-2">
                {project.memberIds.slice(0, 8).map(memberId => {
                  const member = getUserById(memberId);
                  if (!member) return null;
                  return (
                    <div key={memberId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors cursor-pointer">
                      <Avatar name={member.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">{member.designation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modules tab */}
      {activeTab === 'modules' && (
        <div className="animate-fade-in">
          {modules.length === 0 ? (
            <EmptyState title="No modules" description="Modules help organize tasks within the project." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map(mod => (
                <div key={mod.id} className="card p-6 card-hover">
                  <h3 className="text-base font-semibold mb-1">{mod.name}</h3>
                  <p className="text-sm text-[var(--color-muted-foreground)] mb-4">{mod.description}</p>
                  <ProgressBar value={mod.progress} showLabel size="md" className="mb-4" />
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-[var(--color-muted)]"><p className="text-lg font-semibold">{mod.totalTasks}</p><p className="text-[10px] text-[var(--color-muted-foreground)]">Total</p></div>
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30"><p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{mod.completedTasks}</p><p className="text-[10px] text-[var(--color-muted-foreground)]">Done</p></div>
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30"><p className="text-lg font-semibold text-purple-600 dark:text-purple-400">{mod.inReviewTasks}</p><p className="text-[10px] text-[var(--color-muted-foreground)]">Review</p></div>
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30"><p className="text-lg font-semibold text-red-600 dark:text-red-400">{mod.blockedTasks}</p><p className="text-[10px] text-[var(--color-muted-foreground)]">Blocked</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <div className="animate-fade-in space-y-2">
          {tasks.map(task => {
            const assignee = getUserById(task.assigneeId);
            return (
              <div key={task.id} className="card p-4 card-hover flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getStatusColor(task.status)}>{task.status.replace('-', ' ')}</Badge>
                    <Badge className={cn('badge', task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : task.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400')}>{task.priority}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {assignee && <Avatar name={assignee.name} size="xs" />}
                  <span className="text-xs text-[var(--color-muted-foreground)] hidden sm:inline">{formatDate(task.deadline)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Members tab */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {project.memberIds.map(memberId => {
            const member = getUserById(memberId);
            if (!member) return null;
            const memberTasks = tasks.filter(t => t.assigneeId === memberId);
            return (
              <div key={memberId} className="card p-5 card-hover">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={member.name} size="md" />
                  <div>
                    <p className="text-sm font-semibold">{member.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{member.designation}</p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-[var(--color-muted-foreground)]">
                  <span>{memberTasks.length} tasks</span>
                  <span>{memberTasks.filter(t => t.status === 'completed').length} completed</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <div className="card p-6 animate-fade-in">
          <EmptyState title="Activity log" description="Project activity timeline will appear here when the backend is connected." />
        </div>
      )}

      {/* Create Module Modal */}
      <Modal isOpen={showCreateModule} onClose={() => setShowCreateModule(false)} title="Create Module"
        footer={<><Button variant="outline" onClick={() => setShowCreateModule(false)}>Cancel</Button><Button onClick={() => { setShowCreateModule(false); toast.success('Module created successfully!'); }}>Create</Button></>}>
        <div className="space-y-4">
          <Input label="Module Name" placeholder="e.g., Authentication" />
          <Textarea label="Description" placeholder="Module description..." rows={3} />
        </div>
      </Modal>
    </div>
  );
}
