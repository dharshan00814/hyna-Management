import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users as UsersIcon, CheckSquare, Plus } from 'lucide-react';
import { Button, Badge, ProgressBar, Avatar, AvatarGroup, Tabs, EmptyState, Modal, Input, Textarea, LoadingState } from '@/components/ui';
import { cn, getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getProject, getModules, getProjectTasks, createModule, getUsers, getUserById } from '@/services/api';
import { toast } from 'sonner';
import type { Project, Module, Task } from '@/types';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole } = useAuthStore();
  const prefix = currentRole === 'member' ? '/member' : '/admin';
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');

  const loadData = async () => {
    if (!id) return;
    try {
      await getUsers();
      const p = await getProject(id);
      if (p) setProject(p);
      const mods = await getModules(id);
      setModules(mods);
      const ts = await getProjectTasks(id);
      setTasks(ts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCreateModule = async () => {
    if (!id || !newModuleName.trim()) {
      toast.error('Please enter a module name');
      return;
    }
    try {
      const created = await createModule({
        projectId: id,
        name: newModuleName,
        description: newModuleDescription,
      });
      setModules(prev => [...prev, created]);
      setShowCreateModule(false);
      setNewModuleName('');
      setNewModuleDescription('');
      toast.success('Module created successfully!');
    } catch (err) {
      toast.error('Failed to create module');
    }
  };

  if (isLoading) return <LoadingState />;

  if (!project) {
    return (
      <div className="page-container">
        <EmptyState
          title="Project not found"
          description="The project you're looking for doesn't exist."
          action={<Button onClick={() => navigate(`${prefix}/projects`)}>Go to Projects</Button>}
        />
      </div>
    );
  }

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
              <ProgressBar value={project.progress} showLabel size="lg" className="mb-4" />
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)] text-center">
                <div>
                  <p className="text-2xl font-bold">{modules.length}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Modules</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{tasks.length}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Total Tasks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{tasks.filter(t => t.status === 'completed').length}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Completed</p>
                </div>
              </div>
            </div>

            {/* Quick Modules view */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Modules ({modules.length})</h2>
                {currentRole !== 'member' && (
                  <Button size="sm" variant="outline" onClick={() => setShowCreateModule(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Module
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {modules.map(mod => (
                  <div key={mod.id} className="p-4 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">{mod.name}</h3>
                      <span className="text-xs font-medium">{mod.progress}%</span>
                    </div>
                    <ProgressBar value={mod.progress} size="sm" className="mb-2" />
                    <p className="text-xs text-[var(--color-muted-foreground)]">{mod.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4">Project Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-[var(--color-muted-foreground)]">Manager</span>
                  <div className="flex items-center gap-2 mt-1">
                    {manager && <Avatar name={manager.name} size="xs" />}
                    <span>{manager?.name || 'Unassigned'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-muted-foreground)]">Timeline</span>
                  <p className="font-medium mt-0.5">{formatDate(project.startDate)} - {formatDate(project.deadline)}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-muted-foreground)]">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {project.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Team Members</h3>
                <span className="text-xs text-[var(--color-muted-foreground)]">{project.memberIds.length}</span>
              </div>
              <div className="space-y-2">
                {project.memberIds.map(mid => {
                  const m = getUserById(mid);
                  if (!m) return null;
                  return (
                    <div key={mid} className="flex items-center gap-2 py-1">
                      <Avatar name={m.name} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{m.name}</p>
                        <p className="text-[11px] text-[var(--color-muted-foreground)] truncate">{m.designation}</p>
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
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            {currentRole !== 'member' && (
              <Button onClick={() => setShowCreateModule(true)}>
                <Plus className="w-4 h-4 mr-1" /> New Module
              </Button>
            )}
          </div>
          {modules.map(mod => (
            <div key={mod.id} className="card p-5 card-hover">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold">{mod.name}</h3>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{mod.description}</p>
                </div>
                <Badge variant="outline">{mod.progress}%</Badge>
              </div>
              <ProgressBar value={mod.progress} showLabel size="md" className="mb-4" />
              <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                <span>{mod.completedTasks} of {mod.totalTasks} tasks completed</span>
                <div className="flex items-center gap-2">
                  <AvatarGroup names={mod.assigneeIds.map(aid => getUserById(aid)?.name || '').filter(Boolean)} max={3} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-2 animate-fade-in">
          {tasks.map(task => {
            const assignee = getUserById(task.assigneeId);
            return (
              <div key={task.id} className="card p-4 card-hover flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getStatusColor(task.status)}>{task.status.replace(/-/g, ' ')}</Badge>
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
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
          <EmptyState title="Live project activity" description="Recent task completions, module updates, and git commits appear in real time." />
        </div>
      )}

      {/* Create Module Modal */}
      <Modal
        isOpen={showCreateModule}
        onClose={() => setShowCreateModule(false)}
        title="Create Module"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateModule(false)}>Cancel</Button>
            <Button onClick={handleCreateModule}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Module Name"
            placeholder="e.g., Authentication"
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Module description..."
            rows={3}
            value={newModuleDescription}
            onChange={(e) => setNewModuleDescription(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
