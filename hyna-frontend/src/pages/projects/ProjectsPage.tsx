import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Crown, Users, Check, X, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react';
import {
  Button,
  Badge,
  ProgressBar,
  Avatar,
  AvatarGroup,
  Modal,
  Input,
  Textarea,
  Select,
  EmptyState,
  LoadingState,
} from '@/components/ui';
import { cn, getStatusColor, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getProjects, createProject, deleteProject, getUsers, getUserById } from '@/services/api';
import { toast } from 'sonner';
import type { Project, ProjectStatus, User } from '@/types';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { currentRole, currentUser, effectiveRole } = useAuthStore();
  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // CEO Project Deletion state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New project form state
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'planning' as ProjectStatus,
  });

  // Project Head & Team Members selection states
  const [projectHeadId, setProjectHeadId] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberDeptFilter, setMemberDeptFilter] = useState('All');

  // CEO Authority Check
  const isCEO = Boolean(
    currentUser?.designation?.toUpperCase().includes('CEO') ||
    currentUser?.name?.toLowerCase().includes('vignesh') ||
    currentUser?.email?.toLowerCase().includes('vignesh') ||
    (currentUser as any)?.employeeId?.toUpperCase() === 'EMP-001' ||
    (effectiveRole === 'admin' && currentUser?.designation?.toUpperCase().includes('CEO'))
  );

  // Executive Authority Check: CEO, CTO, COO, CPO, or Admin
  const isExecutive = Boolean(
    effectiveRole === 'admin' ||
    currentRole === 'admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.designation?.toUpperCase().includes('CEO') ||
    currentUser?.designation?.toUpperCase().includes('CTO') ||
    currentUser?.designation?.toUpperCase().includes('COO') ||
    currentUser?.designation?.toUpperCase().includes('CPO') ||
    currentUser?.name?.toLowerCase().includes('vignesh') ||
    currentUser?.name?.toLowerCase().includes('jashwin') ||
    currentUser?.name?.toLowerCase().includes('dharshan') ||
    (currentUser as any)?.employeeId?.toUpperCase() === 'EMP-001' ||
    (currentUser as any)?.employeeId?.toUpperCase() === 'EMP-002' ||
    (currentUser as any)?.employeeId?.toUpperCase() === 'EMP-003'
  );

  const loadData = async () => {
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);
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

  const openCreateModal = () => {
    const defaultHead = currentUser?.id || (users[0]?.id ?? '');
    setProjectHeadId(defaultHead);
    if (defaultHead && selectedMemberIds.length === 0) {
      setSelectedMemberIds([defaultHead]);
    }
    setShowCreate(true);
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    const headId = projectHeadId || currentUser?.id || 'u1';
    // Ensure project head is included in members
    const finalMemberIds = Array.from(new Set([headId, ...selectedMemberIds]));

    try {
      const created = await createProject({
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        startDate: newProject.startDate,
        deadline: newProject.deadline,
        status: newProject.status,
        managerId: headId,
        memberIds: finalMemberIds,
      });

      setProjects((prev) => [created, ...prev]);
      setShowCreate(false);
      setNewProject({
        name: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        deadline: '',
        status: 'planning',
      });
      setSelectedMemberIds([]);
      toast.success('Project created successfully with assigned Project Head and Team Members!');
    } catch (err) {
      toast.error('Failed to create project');
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      toast.success(`Project "${projectToDelete.name}" deleted successfully by CEO.`);
      setProjectToDelete(null);
    } catch (err: any) {
      toast.error('Failed to delete project: ' + (err?.message || 'Database error'));
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredMembersList = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (u.designation && u.designation.toLowerCase().includes(memberSearch.toLowerCase())) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(memberSearch.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(memberSearch.toLowerCase()));
    const matchesDept = memberDeptFilter === 'All' || u.department === memberDeptFilter;
    return matchesSearch && matchesDept;
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
          <Button onClick={openCreateModal}>
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
          {['all', 'active', 'planning', 'on-hold', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                statusFilter === status
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
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
                key={`${project.id}-${idx}`}
                className={cn('card card-hover p-5 cursor-pointer animate-slide-up', `stagger-${Math.min(idx + 1, 5)}`)}
                onClick={() => navigate(`${prefix}/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                    <h3 className="text-base font-semibold truncate">{project.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                    {isCEO && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                        }}
                        className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete Project (CEO Exclusive)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
                    names={project.memberIds.map((id) => getUserById(id)?.name || '').filter(Boolean)}
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
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>Create Project</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            placeholder="Enter project name"
            value={newProject.name}
            onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Textarea
            label="Description"
            placeholder="Project description and key deliverables..."
            rows={2}
            value={newProject.description}
            onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={newProject.startDate}
              onChange={(e) => setNewProject((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="Deadline"
              type="date"
              value={newProject.deadline}
              onChange={(e) => setNewProject((p) => ({ ...p, deadline: e.target.value }))}
            />
          </div>
          <Select
            label="Initial Status"
            value={newProject.status}
            onChange={(val) => setNewProject((p) => ({ ...p, status: val as ProjectStatus }))}
            options={[
              { value: 'planning', label: 'Planning' },
              { value: 'active', label: 'Active' },
            ]}
          />

          {/* PROJECT HEAD SELECTION (CEO / CTO / COO Authority) */}
          <div className="pt-2 border-t border-[var(--color-border)] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Project Head (Manager / Lead)
              </label>
              {isExecutive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Crown className="w-3 h-3" />
                  CEO / CTO / COO Authority
                </span>
              ) : (
                <span className="text-[10px] text-[var(--color-muted-foreground)]">Assigned Lead</span>
              )}
            </div>

            {isExecutive ? (
              <>
                <Select
                  value={projectHeadId}
                  onChange={(val) => {
                    setProjectHeadId(val);
                    if (val && !selectedMemberIds.includes(val)) {
                      setSelectedMemberIds((prev) => [...prev, val]);
                    }
                  }}
                  options={users.map((u) => ({
                    value: u.id,
                    label: `${u.name} — ${u.designation || u.role} (${u.department || 'General'})`,
                  }))}
                />
                <p className="text-[10px] text-[var(--color-muted-foreground)]">
                  As Executive Leadership (CEO, CTO, COO), you have full authority to designate any member or lead as the Project Head.
                </p>
              </>
            ) : (
              <div className="p-2.5 rounded-xl bg-[var(--color-muted)]/50 border border-[var(--color-border)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Avatar name={currentUser?.name || 'User'} size="xs" />
                  <div>
                    <span className="font-semibold text-[var(--color-foreground)]">{currentUser?.name}</span>
                    <span className="text-[10px] text-[var(--color-muted-foreground)] block">
                      {currentUser?.designation || 'Manager'} • {currentUser?.department || 'Engineering'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  Only CEO / CTO / COO can reassign Project Head
                </span>
              </div>
            )}
          </div>

          {/* PROJECT TEAM MEMBERS (Selectable list of ALL people) */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <label className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Project Team Members
                </label>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">
                  Select members from the organization to assign to this project.
                </p>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  {selectedMemberIds.length} Selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds(users.map((u) => u.id))}
                  className="text-[10px] font-medium text-indigo-500 hover:underline px-1"
                >
                  Select All
                </button>
                <span className="text-[var(--color-muted-foreground)]">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds(projectHeadId ? [projectHeadId] : [])}
                  className="text-[10px] font-medium text-[var(--color-muted-foreground)] hover:underline px-1"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Member Search & Department Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Filter by name, role, ID..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                {['All', 'Executive', 'Engineering', 'Design', 'Product', 'Operations'].map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setMemberDeptFilter(dept)}
                    className={cn(
                      'px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors',
                      memberDeptFilter === dept
                        ? 'bg-indigo-600 text-white'
                        : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                    )}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Members List */}
            <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] p-1">
              {filteredMembersList.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
                  No matching members found
                </div>
              ) : (
                filteredMembersList.map((user) => {
                  const isSelected = selectedMemberIds.includes(user.id);
                  const isHead = user.id === projectHeadId;

                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleMemberSelection(user.id)}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs select-none',
                        isSelected ? 'bg-indigo-500/10' : 'hover:bg-[var(--color-muted)]/50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded accent-indigo-600 w-3.5 h-3.5 cursor-pointer shrink-0"
                        />
                        <Avatar name={user.name} size="xs" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[var(--color-foreground)] truncate">
                              {user.name}
                            </span>
                            {isHead && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                                <Crown className="w-2.5 h-2.5" /> Head
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--color-muted-foreground)] truncate block">
                            {user.designation || user.role} • {user.department || 'General'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--color-muted-foreground)] shrink-0 ml-2">
                        {user.employeeId || ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* CEO Project Delete Confirmation Modal */}
      {projectToDelete && (
        <Modal
          isOpen={!!projectToDelete}
          onClose={() => !isDeleting && setProjectToDelete(null)}
          title="Delete Project (CEO Authorization)"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={isDeleting}
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={isDeleting}
                onClick={handleDeleteProject}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Permanently Delete Project
              </Button>
            </div>
          }
        >
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-red-500">Irreversible Executive Action</p>
                <p className="text-[var(--color-muted-foreground)] leading-relaxed">
                  Are you sure you want to permanently delete <strong>{projectToDelete.name}</strong>? All associated modules, sprint tasks, and member allocations will be permanently removed from the database.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--color-muted)] text-[11px] text-[var(--color-muted-foreground)] flex items-center justify-between">
              <span>Authority Verification:</span>
              <span className="font-semibold text-amber-500 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> CEO Clearance Required
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ProjectsPage;
