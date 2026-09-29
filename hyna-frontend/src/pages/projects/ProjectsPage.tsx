import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  User as UserIcon,
  Check,
  Layers,
  Trash2,
  Crown,
  ArrowDown,
  X,
  AlertTriangle,
} from 'lucide-react';
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
import {
  getProjects,
  createProject,
  deleteProject,
  createModule,
  getUsers,
  getUserById,
} from '@/services/api';
import { toast } from 'sonner';
import type { Project, ProjectStatus, User } from '@/types';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { currentRole, currentUser, effectiveRole } = useAuthStore();
  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';
  const isAdminOrManager = effectiveRole === 'admin' || effectiveRole === 'manager' || currentRole === 'admin' || currentRole === 'manager';

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

  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'team' | 'solo'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CEO Project Deletion state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New project form state
  const [projectMode, setProjectMode] = useState<'team' | 'solo'>('team');
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'planning' as ProjectStatus,
  });

  // Team & Member allocations
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedSoloMemberId, setSelectedSoloMemberId] = useState<string>('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberDeptFilter, setMemberDeptFilter] = useState('All');

  // Initial Modules to assign to members
  const [initialModules, setInitialModules] = useState<{ name: string; description: string; assigneeId: string }[]>([]);
  const [newModName, setNewModName] = useState('');
  const [newModDesc, setNewModDesc] = useState('');
  const [newModAssigneeId, setNewModAssigneeId] = useState('');

  const loadData = async () => {
    try {
      const [fetchedUsers, fetchedProjects] = await Promise.all([
        getUsers(),
        getProjects(),
      ]);
      setAllUsers(fetchedUsers);
      setProjects(fetchedProjects);

      // Default manager to currentUser or first manager/admin
      if (currentUser?.id) {
        setSelectedManagerId(currentUser.id);
        setSelectedMemberIds([currentUser.id]);
        setSelectedSoloMemberId(currentUser.id);
      } else if (fetchedUsers.length > 0) {
        const defaultAdmin = fetchedUsers.find(u => u.role === 'admin' || u.role === 'manager') || fetchedUsers[0];
        setSelectedManagerId(defaultAdmin.id);
        setSelectedMemberIds([defaultAdmin.id]);
        setSelectedSoloMemberId(defaultAdmin.id);
      }
    } catch (err) {
      console.error('Error loading projects page data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    const defaultHead = currentUser?.id || (allUsers[0]?.id ?? '');
    setSelectedManagerId(defaultHead);
    setSelectedSoloMemberId(defaultHead);
    if (defaultHead && selectedMemberIds.length === 0) {
      setSelectedMemberIds([defaultHead]);
    }
    setShowCreate(true);
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAddInitialModule = () => {
    if (!newModName.trim()) {
      toast.error('Please enter a module name');
      return;
    }
    setInitialModules(prev => [
      ...prev,
      {
        name: newModName.trim(),
        description: newModDesc.trim(),
        assigneeId: newModAssigneeId || (projectMode === 'solo' ? selectedSoloMemberId : (selectedMemberIds[0] || '')),
      },
    ]);
    setNewModName('');
    setNewModDesc('');
    setNewModAssigneeId('');
  };

  const handleRemoveInitialModule = (index: number) => {
    setInitialModules(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      setIsSubmitting(true);

      const finalManagerId = projectMode === 'solo'
        ? (selectedSoloMemberId || currentUser?.id || '')
        : (selectedManagerId || currentUser?.id || '');

      const finalMembers = projectMode === 'solo'
        ? (selectedSoloMemberId ? [selectedSoloMemberId] : (currentUser?.id ? [currentUser.id] : []))
        : (selectedMemberIds.length > 0 ? selectedMemberIds : (currentUser?.id ? [currentUser.id] : []));

      const finalMemberIds = Array.from(new Set([finalManagerId, ...finalMembers])).filter(Boolean);

      const created = await createProject({
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        startDate: newProject.startDate || new Date().toISOString().split('T')[0],
        deadline: newProject.deadline || undefined,
        status: newProject.status,
        managerId: finalManagerId,
        memberIds: finalMemberIds,
        projectType: projectMode,
        color: projectMode === 'solo' ? '#10b981' : '#6366f1',
      });

      // Automatically create the initial modules with assigned team members
      if (initialModules.length > 0) {
        for (const mod of initialModules) {
          try {
            await createModule({
              projectId: created.id,
              name: mod.name,
              description: mod.description,
              assigneeIds: mod.assigneeId ? [mod.assigneeId] : [],
            });
          } catch (e) {
            console.warn('Could not auto-create module:', e);
          }
        }
      }

      setProjects(prev => [created, ...prev.filter(p => p.id !== created.id)]);
      setShowCreate(false);
      setNewProject({
        name: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        deadline: '',
        status: 'planning',
      });
      setInitialModules([]);
      toast.success(
        projectMode === 'solo'
          ? 'Solo project created!'
          : 'Team project created with assigned Team Lead & Members!'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create project');
      console.error(err);
    } finally {
      setIsSubmitting(false);
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

  // Filter projects by search, status, and project type (team vs solo)
  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'team' && (p.projectType === 'team' || p.memberIds.length > 1)) ||
      (typeFilter === 'solo' && (p.projectType === 'solo' || p.memberIds.length <= 1));
    return matchesSearch && matchesStatus && matchesType;
  });

  // Eligible pool of members for assigning
  const availableProjectMembers = projectMode === 'solo'
    ? (selectedSoloMemberId ? [allUsers.find(u => u.id === selectedSoloMemberId)].filter(Boolean) as User[] : allUsers)
    : (selectedMemberIds.length > 0 ? allUsers.filter(u => selectedMemberIds.includes(u.id)) : allUsers);

  const filteredMembersList = allUsers.filter((u) => {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Projects & Teams</h1>
          <p className="page-description">
            Organize team collaborations and solo assignments with dedicated member modules.
          </p>
        </div>
        {(isAdminOrManager || currentRole !== 'member') && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" /> New Project
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search projects or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          />
        </div>

        {/* Project Type Filter (Team vs Solo) */}
        <div className="flex rounded-lg bg-[var(--color-muted)] p-1 shrink-0">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
              typeFilter === 'all'
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            )}
          >
            All Projects
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('team')}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer',
              typeFilter === 'team'
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Teams</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('solo')}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer',
              typeFilter === 'solo'
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            )}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Solo</span>
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'active', 'planning', 'on-hold', 'completed'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize cursor-pointer',
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

      {/* Project Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Try adjusting your filters or click New Project to allocate one."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project, idx) => {
            const manager = getUserById(project.managerId);
            const isSolo = project.projectType === 'solo' || project.memberIds.length <= 1;
            const soloMember = isSolo ? getUserById(project.memberIds[0] || project.managerId) : null;

            return (
              <div
                key={`${project.id}-${idx}`}
                className={cn(
                  'card card-hover p-5 cursor-pointer animate-slide-up flex flex-col justify-between',
                  `stagger-${Math.min(idx + 1, 5)}`
                )}
                onClick={() => navigate(`${prefix}/projects/${project.id}`)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                      <h3 className="text-base font-bold text-[var(--color-foreground)] truncate">{project.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSolo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <UserIcon className="w-3 h-3" /> Solo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          <Users className="w-3 h-3" /> Team ({project.memberIds.length})
                        </span>
                      )}
                      <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                      {isCEO && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project);
                          }}
                          className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete Project (CEO Exclusive)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-2 mb-4 leading-relaxed">
                    {project.description || 'No description provided.'}
                  </p>

                  <ProgressBar value={project.progress} showLabel size="md" className="mb-4" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)] pt-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-2 min-w-0">
                      {isSolo ? (
                        <>
                          <Avatar name={soloMember?.name || 'Solo'} size="xs" />
                          <span className="truncate font-medium">{soloMember?.name || 'Assigned Member'}</span>
                        </>
                      ) : (
                        <>
                          {manager && <Avatar name={manager.name} size="xs" />}
                          <span className="truncate">Lead: {manager?.name || 'Unassigned'}</span>
                        </>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px]">Due {formatDate(project.deadline)}</span>
                  </div>

                  {!isSolo && (
                    <div className="flex items-center justify-between mt-3 pt-2">
                      <AvatarGroup
                        names={project.memberIds.map(id => getUserById(id)?.name || '').filter(Boolean)}
                        max={4}
                      />
                      <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                        {project.memberIds.length} team members
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal with Team / Solo & Module Allocation */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create & Assign Project"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} isLoading={isSubmitting}>
              Create Project
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* 1. Project Mode: Team vs Solo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--color-foreground)]">Project Assignment Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProjectMode('team')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3',
                  projectMode === 'team'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-foreground)] shadow-xs'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  projectMode === 'team' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)]'
                )}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">Team Project</p>
                  <p className="text-[11px] opacity-75">Multi-member team with assigned modules</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProjectMode('solo')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3',
                  projectMode === 'solo'
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--color-foreground)] shadow-xs'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  projectMode === 'solo' ? 'bg-emerald-500 text-white' : 'bg-[var(--color-muted)]'
                )}>
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">Solo Project</p>
                  <p className="text-[11px] opacity-75">Single member working independently</p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Basic Project Info */}
          <Input
            label="Project Name"
            placeholder="e.g. Mobile Application V2, Core Auth System"
            value={newProject.name}
            onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
            required
          />

          <Textarea
            label="Project Scope & Description"
            placeholder="Outline goals, deliverables, and architecture..."
            rows={2}
            value={newProject.description}
            onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
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
              { value: 'on-hold', label: 'On Hold' },
            ]}
          />

          {/* 3. Team Selection: Team Lead at top, then Chosen Members down below */}
          {projectMode === 'team' ? (
            <div className="space-y-3.5 p-4 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-foreground)] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Project Leadership & Team Structure</span>
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''} in team
                </span>
              </div>

              {/* Step 1: Team Lead / Manager */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[var(--color-foreground)] uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>1. Team Lead / Project Manager *</span>
                  </label>
                  {isExecutive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Crown className="w-3 h-3" />
                      Executive Authority
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">Assigned Lead</span>
                  )}
                </div>

                <select
                  value={selectedManagerId}
                  onChange={(e) => {
                    const newMgrId = e.target.value;
                    setSelectedManagerId(newMgrId);
                    if (newMgrId && !selectedMemberIds.includes(newMgrId)) {
                      setSelectedMemberIds(prev => [newMgrId, ...prev.filter(id => id !== newMgrId)]);
                    }
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose Team Lead / Manager...</option>
                  {allUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role.toUpperCase()} — {user.designation || 'Engineer'})
                    </option>
                  ))}
                </select>

                {selectedManagerId && (() => {
                  const leadUser = allUsers.find(u => u.id === selectedManagerId);
                  if (!leadUser) return null;
                  return (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border)]/60 text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar name={leadUser.name} size="xs" />
                        <div>
                          <p className="font-bold text-xs leading-tight">{leadUser.name}</p>
                          <p className="text-[10px] text-[var(--color-muted-foreground)]">
                            {leadUser.designation || 'Lead'} • {leadUser.department || 'Engineering'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Team Lead
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Hierarchy indicator down to chosen members */}
              <div className="flex items-center justify-center -my-1 text-[var(--color-muted-foreground)]">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-muted)] text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <ArrowDown className="w-3 h-3" />
                  <span>Chosen Members Down Below</span>
                  <ArrowDown className="w-3 h-3" />
                </div>
              </div>

              {/* Step 2: Chosen Members Under Team Lead */}
              <div className="p-3.5 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 bg-[var(--color-card)] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--color-foreground)] uppercase tracking-wider block">
                      2. Chosen Team Members ({selectedMemberIds.filter(id => id !== selectedManagerId).length})
                    </label>
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      Members assigned to work under this Team Lead
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds(allUsers.map((u) => u.id))}
                      className="text-[10px] font-medium text-indigo-500 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-[var(--color-muted-foreground)]">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds(selectedManagerId ? [selectedManagerId] : [])}
                      className="text-[10px] font-medium text-[var(--color-muted-foreground)] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Dropdown to Choose and Add a Member */}
                <div>
                  <select
                    className="w-full h-9 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    defaultValue=""
                    onChange={(e) => {
                      const newId = e.target.value;
                      if (newId && !selectedMemberIds.includes(newId)) {
                        setSelectedMemberIds(prev => [...prev, newId]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="" disabled>+ Choose member to add under Team Lead...</option>
                    {allUsers
                      .filter(u => !selectedMemberIds.includes(u.id))
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          + Add {user.name} — {user.designation || user.role} ({user.department || 'Engineering'})
                        </option>
                      ))}
                  </select>
                </div>

                {/* List of Chosen Members */}
                {selectedMemberIds.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted-foreground)] text-center py-2 italic">
                    No members chosen yet. Pick a member from the dropdown or click from the quick pool below.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {selectedMemberIds.map(mid => {
                      const member = allUsers.find(u => u.id === mid);
                      if (!member) return null;
                      const isLead = mid === selectedManagerId;

                      return (
                        <div
                          key={mid}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg border text-xs transition-all',
                            isLead
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : 'border-[var(--color-border)] bg-[var(--color-muted)]/40 hover:bg-[var(--color-muted)]/70'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar name={member.name} size="xs" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold truncate leading-tight text-xs">{member.name}</p>
                                {isLead ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                    Lead
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    Chosen Member
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[var(--color-muted-foreground)] truncate">
                                {member.designation || member.role} • {member.department || 'Engineering'}
                              </p>
                            </div>
                          </div>

                          {!isLead && (
                            <button
                              type="button"
                              onClick={() => setSelectedMemberIds(prev => prev.filter(id => id !== mid))}
                              className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Remove chosen member"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Filter & Quick Toggle Members Pool */}
                <div className="pt-2 border-t border-[var(--color-border)]/60 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                      <input
                        type="text"
                        placeholder="Search members to toggle..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full h-7 pl-7 pr-2.5 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                      {['All', 'Executive', 'Engineering', 'Design', 'Product', 'Operations'].map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => setMemberDeptFilter(dept)}
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer',
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

                  <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] block">
                    Click to quick choose / remove members:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {filteredMembersList.map(user => {
                      const isChosen = selectedMemberIds.includes(user.id);
                      const isLead = user.id === selectedManagerId;
                      return (
                        <button
                          type="button"
                          key={user.id}
                          onClick={() => {
                            if (isChosen) {
                              if (!isLead) {
                                setSelectedMemberIds(prev => prev.filter(id => id !== user.id));
                              }
                            } else {
                              setSelectedMemberIds(prev => [...prev, user.id]);
                            }
                          }}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer border',
                            isChosen
                              ? isLead
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-[var(--color-muted)] hover:bg-[var(--color-muted)]/80 text-[var(--color-foreground)] border-transparent'
                          )}
                        >
                          <Avatar name={user.name} size="xs" className="w-4 h-4 text-[9px]" />
                          <span>{user.name}</span>
                          {isLead ? (
                            <Crown className="w-3 h-3 text-amber-500 ml-0.5" />
                          ) : isChosen ? (
                            <Check className="w-3 h-3 text-white ml-0.5" />
                          ) : (
                            <Plus className="w-3 h-3 text-[var(--color-muted-foreground)] ml-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Solo Member Selector */
            <div className="space-y-2 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <label className="text-xs font-bold text-[var(--color-foreground)] flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>Assign Solo Contributor</span>
              </label>
              <select
                value={selectedSoloMemberId}
                onChange={(e) => setSelectedSoloMemberId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Member (Owner)</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.designation || user.role} — {user.department || 'Engineering'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. Assign Modules in Team / Solo */}
          <div className="space-y-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-foreground)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span>Assign Modules to Members</span>
              </span>
              <span className="text-[11px] text-[var(--color-muted-foreground)]">
                {initialModules.length} module{initialModules.length !== 1 ? 's' : ''} added
              </span>
            </div>

            {/* Existing added modules */}
            {initialModules.length > 0 && (
              <div className="space-y-1.5">
                {initialModules.map((mod, idx) => {
                  const assignedUser = allUsers.find(u => u.id === mod.assigneeId);
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-[var(--color-foreground)] truncate">{mod.name}</span>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">➔</span>
                        <span className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                          {assignedUser ? assignedUser.name : 'Unassigned'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInitialModule(idx)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Remove module"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add New Module Input */}
            <div className="space-y-2 pt-1 border-t border-[var(--color-border)]/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Module Name (e.g. Frontend UI, API)"
                  value={newModName}
                  onChange={(e) => setNewModName(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                <select
                  value={newModAssigneeId}
                  onChange={(e) => setNewModAssigneeId(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Assign Module Owner</option>
                  {availableProjectMembers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.designation || user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Module Description / Key deliverable..."
                  value={newModDesc}
                  onChange={(e) => setNewModDesc(e.target.value)}
                  className="flex-1 h-8 px-2.5 rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddInitialModule}
                  className="h-8 text-xs shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Module
                </Button>
              </div>
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
