import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button, Badge, ProgressBar, Avatar, AvatarGroup, Modal, Input, Textarea, Select, EmptyState, LoadingState } from '@/components/ui';
import { cn, getStatusColor, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getProjects, createProject, getUsers, getUserById } from '@/services/api';
import { toast } from 'sonner';
import type { Project, ProjectStatus } from '@/types';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { currentRole, currentUser, effectiveRole } = useAuthStore();
  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New project form state
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'planning' as ProjectStatus,
  });

  const loadData = async () => {
    try {
      await getUsers(); // populates user cache
      const projs = await getProjects();
      setProjects(projs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      const created = await createProject({
        name: newProject.name,
        description: newProject.description,
        startDate: newProject.startDate,
        deadline: newProject.deadline,
        status: newProject.status,
        managerId: currentUser?.id || 'u1',
        memberIds: [currentUser?.id || 'u1'],
      });
      setProjects(prev => [created, ...prev]);
      setShowCreate(false);
      setNewProject({
        name: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        deadline: '',
        status: 'planning',
      });
      toast.success('Project created successfully!');
    } catch (err) {
      toast.error('Failed to create project');
      console.error(err);
    }
  };

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-description">{projects.length} total projects</p>
        </div>
        {currentRole !== 'member' && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'planning', 'on-hold', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                statusFilter === status
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Project grid */}
      {filtered.length === 0 ? (
        <EmptyState title="No projects found" description="Try adjusting your filters or create a new project." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project, idx) => {
            const manager = getUserById(project.managerId);
            return (
              <div
                key={project.id}
                className={cn('card card-hover p-5 cursor-pointer animate-slide-up', `stagger-${Math.min(idx + 1, 5)}`)}
                onClick={() => navigate(`${prefix}/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                    <h3 className="text-base font-semibold">{project.name}</h3>
                  </div>
                  <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-2 mb-4">{project.description}</p>
                
                <ProgressBar value={project.progress} showLabel size="md" className="mb-4" />
                
                <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                  <div className="flex items-center gap-2">
                    {manager && <Avatar name={manager.name} size="xs" />}
                    <span>{manager?.name || 'Unassigned'}</span>
                  </div>
                  <span>Due {formatDate(project.deadline)}</span>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
                  <AvatarGroup
                    names={project.memberIds.map(id => getUserById(id)?.name || '').filter(Boolean)}
                    max={4}
                  />
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {project.memberIds.length} members
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create project modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New Project"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateProject}>Create Project</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            placeholder="Enter project name"
            value={newProject.name}
            onChange={(e) => setNewProject(p => ({ ...p, name: e.target.value }))}
          />
          <Textarea
            label="Description"
            placeholder="Project description..."
            rows={3}
            value={newProject.description}
            onChange={(e) => setNewProject(p => ({ ...p, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={newProject.startDate}
              onChange={(e) => setNewProject(p => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="Deadline"
              type="date"
              value={newProject.deadline}
              onChange={(e) => setNewProject(p => ({ ...p, deadline: e.target.value }))}
            />
          </div>
          <Select
            label="Status"
            value={newProject.status}
            onChange={(val) => setNewProject(p => ({ ...p, status: val as ProjectStatus }))}
            options={[
              { value: 'planning', label: 'Planning' },
              { value: 'active', label: 'Active' },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
