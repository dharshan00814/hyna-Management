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
import type { Project } from '@/types';
import { ProjectModal } from './ProjectModal';

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
  const [editProject, setEditProject] = useState<Project | undefined>();

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

  const handleProjectSuccess = (savedProject: Project, isEdit: boolean) => {
    if (isEdit) {
      setProjects(prev => prev.map(p => p.id === savedProject.id ? savedProject : p));
    } else {
      setProjects(prev => [savedProject, ...prev]);
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
        {currentRole !== 'member' && (
          <Button onClick={() => {
            setEditProject(undefined);
            setShowCreate(true);
          }}>
            <Plus className="w-4 h-4 mr-1" /> New Project
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
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                    {currentRole !== 'member' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditProject(project);
                          setShowCreate(true);
                        }}
                        className="p-1 hover:bg-[var(--color-muted)] rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                        title="Edit Project"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      </button>
                    )}
                  </div>
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

      {/* Create/Edit project modal */}
      {showCreate && (
        <ProjectModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={handleProjectSuccess}
          editProject={editProject}
        />
      )}
    </div>
  );
}

export default ProjectsPage;
