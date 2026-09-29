import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Mail, Phone, Eye, EyeOff, ShieldCheck, UserCheck, Edit3, Trash2, AlertTriangle, X } from 'lucide-react';
import { Button, Avatar, Modal, Input, Select, Badge, EmptyState, LoadingState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getUsers, getTasks, addMember, updateMember, deleteMember } from '@/services/api';
import { toast } from 'sonner';
import type { User, Task, UserRole } from '@/types';

export function MembersPage() {
  const navigate = useNavigate();
  const { currentRole, effectiveRole } = useAuthStore();
  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';
  const canManageMembers = effectiveRole === 'admin' || effectiveRole === 'manager' || currentRole !== 'member';

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    role: 'member' as UserRole,
    department: 'Engineering',
    designation: 'Software Engineer',
    phone: '',
    password: 'Password@123',
  });

  // Edit Member Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'member' as UserRole,
    department: 'Engineering',
    designation: 'Software Engineer',
    employeeId: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Delete Member Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      const [u, t] = await Promise.all([getUsers(), getTasks()]);
      setUsers(u);
      setTasks(t);
    } catch (err) {
      console.error('Error loading members data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to suggest next Employee ID (e.g. EMP-014)
  const getNextEmployeeId = () => {
    let maxNum = 0;
    users.forEach(u => {
      const empId = u.employeeId || '';
      const match = empId.match(/EMP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum && num < 99) maxNum = num;
      }
    });
    const nextNum = maxNum > 0 ? maxNum + 1 : 14;
    return `EMP-${String(nextNum).padStart(3, '0')}`;
  };

  const handleOpenAddModal = () => {
    const suggestedId = getNextEmployeeId();
    setFormData({
      name: '',
      email: '',
      employeeId: suggestedId,
      role: 'member',
      department: 'Engineering',
      designation: 'Software Engineer',
      phone: '',
      password: 'Password@123',
    });
    setShowPassword(false);
    setShowAddModal(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter the member\'s full name');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Please enter a work email address');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const newMember = await addMember({
        name: formData.name.trim(),
        email: formData.email.trim(),
        employeeId: formData.employeeId.trim() || undefined,
        role: formData.role,
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      toast.success(`Member "${newMember.name}" added successfully!`);
      setShowAddModal(false);
      // Refresh member list immediately
      await loadData();
    } catch (err: any) {
      console.error('Failed to add member:', err);
      toast.error(err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.designation.toLowerCase().includes(search.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(search.toLowerCase()));
    const matchesDept = departmentFilter === 'all' || u.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-description">{users.length} team members registered</p>
        </div>
        {canManageMembers && (
          <Button onClick={handleOpenAddModal}>
            <Plus className="w-4 h-4 mr-1" /> Add Member
          </Button>
        )}
      </div>


      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search members by name, email, role, or EMP-ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-sm"
        >
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No members found"
          description="Try adjusting your search or add a new team member."
          action={
            canManageMembers ? (
              <Button onClick={handleOpenAddModal} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-1" /> Add First Member
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((user, idx) => {
            const userTasks = tasks.filter(t => t.assigneeId === user.id);
            return (
              <div
                key={user.id}
                className={cn('card p-5 card-hover cursor-pointer animate-slide-up relative group', `stagger-${Math.min(idx + 1, 5)}`)}
                onClick={() => navigate(`${prefix}/members/${user.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="relative">
                    <Avatar name={user.name} size="lg" />
                    {user.role === 'admin' && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold" title="Admin">
                        ★
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {user.employeeId && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-muted)] text-[var(--color-muted-foreground)] font-medium">
                        {user.employeeId}
                      </span>
                    )}
                    <div
                      className={cn('w-2.5 h-2.5 rounded-full', user.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300')}
                      title={user.status === 'active' ? 'Active' : 'Inactive'}
                    />
                  </div>
                </div>
                <h3 className="text-sm font-semibold truncate group-hover:text-[var(--color-primary)] transition-colors">
                  {user.name}
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] truncate">{user.designation}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-[var(--color-primary)] font-medium">{user.department}</p>
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 bg-[var(--color-muted)] text-[var(--color-muted-foreground)] rounded">
                    {user.role}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                  <span>{userTasks.length} tasks</span>
                  <div className="flex items-center gap-2">
                    {user.email && (
                      <span title={user.email} className="inline-flex">
                        <Mail className="w-3.5 h-3.5 hover:text-[var(--color-foreground)]" />
                      </span>
                    )}
                    {user.phone && (
                      <span title={user.phone} className="inline-flex">
                        <Phone className="w-3.5 h-3.5 hover:text-[var(--color-foreground)]" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => !isSubmitting && setShowAddModal(false)}
        title="Add New Team Member"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={isSubmitting}
              onClick={handleAddMember}
            >
              <UserCheck className="w-4 h-4 mr-1.5" />
              Add Member
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              placeholder="e.g. Priya Sharma"
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Employee ID"
              placeholder="e.g. EMP-014"
              value={formData.employeeId}
              onChange={(e) => setFormData(f => ({ ...f, employeeId: e.target.value }))}
            />
          </div>

          <Input
            label="Work Email Address *"
            type="email"
            placeholder="e.g. priya@hynastudio.com"
            value={formData.email}
            onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Role"
              value={formData.role}
              onChange={(val) => setFormData(f => ({ ...f, role: val as UserRole }))}
              options={[
                { value: 'member', label: 'Member' },
                { value: 'manager', label: 'Manager' },
                { value: 'admin', label: 'Executive Admin' },
              ]}
            />
            <Select
              label="Department"
              value={formData.department}
              onChange={(val) => setFormData(f => ({ ...f, department: val }))}
              options={[
                { value: 'Engineering', label: 'Engineering' },
                { value: 'Design', label: 'Design' },
                { value: 'Quality Assurance', label: 'Quality Assurance' },
                { value: 'Product', label: 'Product' },
                { value: 'Operations', label: 'Operations' },
                { value: 'Marketing', label: 'Marketing' },
                { value: 'Executive', label: 'Executive' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Designation"
              placeholder="e.g. Software Engineer"
              value={formData.designation}
              onChange={(e) => setFormData(f => ({ ...f, designation: e.target.value }))}
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Initial Login Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full h-9 px-3 pr-10 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-1"
                placeholder="Initial account password (min 6 chars)"
                value={formData.password}
                onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              The member can use their Email or Employee ID with this password to sign in immediately.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
