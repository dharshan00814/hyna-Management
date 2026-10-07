import { useState, useEffect } from 'react';
import { 
  GraduationCap, Search, FileText, CheckCircle, 
  XCircle, Clock, ExternalLink, Plus, Users, LayoutGrid
} from 'lucide-react';
import { Button, Badge, Avatar, Modal, Input, Textarea, Select, EmptyState, LoadingState } from '@/components/ui';
import { toast } from 'sonner';
import { getInternshipApplications, updateApplicationStatus, acceptInternAndCreateAccount, getActiveInterns, InternshipApplication } from '@/services/internshipService';
import { getProjects, getModules, createTask } from '@/services/api';
import type { User, Project, Module } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { notifyTaskAssigned } from '@/services/notificationWorkflow';

export function InternshipDashboard() {
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'applications' | 'interns'>('applications');
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [interns, setInterns] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [search, setSearch] = useState('');

  // Task allocation modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedInternId, setSelectedInternId] = useState<string>('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as any,
    status: 'todo' as any,
    deadline: '',
    projectId: '',
    moduleId: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appsData, internsData, projectsData, modulesData] = await Promise.all([
        getInternshipApplications(),
        getActiveInterns(),
        getProjects(),
        getModules(),
      ]);
      setApplications(appsData);
      setInterns(internsData);
      setProjects(projectsData);
      setModules(modulesData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load internship data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: InternshipApplication['status']) => {
    try {
      await updateApplicationStatus(id, status);
      toast.success(`Application marked as ${status}`);
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status } : app));
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAcceptIntern = async (app: InternshipApplication) => {
    try {
      toast.info('Creating account for intern...');
      await acceptInternAndCreateAccount(app);
      toast.success(`${app.name} has been added as an Intern!`);
      // Reload data to reflect changes
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept intern');
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !newTask.projectId || !selectedInternId) {
      toast.error('Please fill in all required fields (Title, Project, Intern)');
      return;
    }
    try {
      const created = await createTask({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTask.status,
        deadline: newTask.deadline,
        projectId: newTask.projectId,
        moduleId: newTask.moduleId || undefined,
        assigneeId: selectedInternId,
      });

      if (selectedInternId && selectedInternId !== currentUser?.id) {
        notifyTaskAssigned({
          id: created.id,
          title: newTask.title,
          assigneeId: selectedInternId,
          assignerName: currentUser?.name,
        }).catch(console.error);
      }

      toast.success('Task allocated to intern successfully!');
      setShowTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        deadline: '',
        projectId: '',
        moduleId: '',
      });
    } catch (err) {
      toast.error('Failed to create task');
    }
  };

  const filteredApps = applications.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.roleOfInterest.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInterns = interns.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.designation || '').toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-500"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>;
      case 'reviewed': return <Badge className="bg-blue-500"><Search className="w-3 h-3 mr-1"/> Reviewed</Badge>;
      case 'accepted': return <Badge className="bg-emerald-500"><CheckCircle className="w-3 h-3 mr-1"/> Accepted</Badge>;
      case 'rejected': return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-500" />
            Internship Dashboard
          </h1>
          <p className="page-description">
            Manage incoming applications from the website and track active interns.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex bg-[var(--color-muted)] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('applications')}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', activeTab === 'applications' ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]')}
          >
            Applications ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('interns')}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', activeTab === 'interns' ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]')}
          >
            Active Interns ({interns.length})
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          />
        </div>
      </div>

      {activeTab === 'applications' && (
        <div className="space-y-4 animate-fade-in">
          {filteredApps.length === 0 ? (
            <EmptyState title="No applications found" description="When candidates apply on the website, they will appear here." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map(app => (
                <div key={app.id} className="card p-4 card-hover flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{app.name}</h3>
                      <p className="text-sm text-[var(--color-primary)] font-medium">{app.roleOfInterest}</p>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                  
                  <div className="space-y-2 text-sm text-[var(--color-muted-foreground)] flex-1">
                    <p><strong>Email:</strong> {app.email}</p>
                    <p><strong>Phone:</strong> {app.phone}</p>
                    <p><strong>University:</strong> {app.university}</p>
                    <p><strong>Applied:</strong> {formatDate(app.appliedAt)}</p>
                    
                    <div className="flex gap-3 pt-2">
                      {app.resumeUrl && app.resumeUrl !== '#' && (
                        <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                          <FileText className="w-3 h-3" /> Resume
                        </a>
                      )}
                      {app.portfolioUrl && (
                        <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                          <ExternalLink className="w-3 h-3" /> Portfolio
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                    {app.status === 'pending' && (
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleUpdateStatus(app.id, 'reviewed')}>Mark Reviewed</Button>
                    )}
                    {app.status !== 'accepted' && (
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAcceptIntern(app)}>Accept Intern</Button>
                    )}
                    {app.status !== 'rejected' && app.status !== 'accepted' && (
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleUpdateStatus(app.id, 'rejected')}>Reject</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'interns' && (
        <div className="space-y-4 animate-fade-in">
          {filteredInterns.length === 0 ? (
            <EmptyState title="No active interns" description="Accept applications to onboard interns to your workspace." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInterns.map(intern => (
                <div key={intern.id} className="card p-4 card-hover">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={intern.name} src={intern.avatar} size="md" />
                    <div>
                      <h3 className="font-semibold">{intern.name}</h3>
                      <p className="text-sm text-[var(--color-muted-foreground)]">{intern.designation || 'Intern'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-[var(--color-muted-foreground)] mb-4">
                    <p><strong>Email:</strong> {intern.email}</p>
                    <p><strong>Phone:</strong> {intern.phone || 'N/A'}</p>
                    <p><strong>Joined:</strong> {formatDate(intern.joinDate)}</p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setSelectedInternId(intern.id);
                      setShowTaskModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Allocate Task
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task allocation modal for interns */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Allocate Task to Intern"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>Cancel</Button>
            <Button onClick={handleCreateTask}>Allocate Task</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Task Title *"
            placeholder="Enter task title"
            value={newTask.title}
            onChange={(e) => setNewTask(t => ({ ...t, title: e.target.value }))}
          />
          <Textarea
            label="Description"
            placeholder="Task description and requirements..."
            rows={3}
            value={newTask.description}
            onChange={(e) => setNewTask(t => ({ ...t, description: e.target.value }))}
          />
          <Select
            label="Project *"
            value={newTask.projectId}
            onChange={(val) => setNewTask(t => ({ ...t, projectId: val }))}
            options={projects.map(p => ({ value: p.id, label: p.name }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={newTask.priority}
              onChange={(val) => setNewTask(t => ({ ...t, priority: val }))}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
            <Input
              label="Deadline"
              type="date"
              value={newTask.deadline}
              className="dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:dark:invert"
              onChange={(e) => setNewTask(t => ({ ...t, deadline: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
