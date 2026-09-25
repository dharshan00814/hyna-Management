import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MoreHorizontal, Mail, Phone } from 'lucide-react';
import { Button, Avatar, Badge, Input, EmptyState } from '@/components/ui';
import { cn, getStatusColor } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { mockUsers, mockTasks } from '@/mock/data';

export function MembersPage() {
  const navigate = useNavigate();
  const { currentRole } = useAuthStore();
  const prefix = currentRole === 'member' ? '/member' : '/admin';
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const departments = [...new Set(mockUsers.map(u => u.department))];
  const filtered = mockUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.designation.toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter === 'all' || u.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-description">{mockUsers.length} team members</p>
        </div>
        {currentRole !== 'member' && <Button><Plus className="w-4 h-4 mr-1" /> Add Member</Button>}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input type="text" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" />
        </div>
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-sm">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No members found" description="Try adjusting your search." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((user, idx) => {
            const userTasks = mockTasks.filter(t => t.assigneeId === user.id);
            return (
              <div
                key={user.id}
                className={cn('card p-5 card-hover cursor-pointer animate-slide-up', `stagger-${Math.min(idx + 1, 5)}`)}
                onClick={() => navigate(`${prefix}/members/${user.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <Avatar name={user.name} size="lg" />
                  <div className={cn('w-2.5 h-2.5 rounded-full mt-1', user.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300')} />
                </div>
                <h3 className="text-sm font-semibold truncate">{user.name}</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] truncate">{user.designation}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-[var(--color-muted)] text-[var(--color-foreground)]">{user.department}</Badge>
                  <Badge className={cn('capitalize', user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : user.role === 'manager' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400')}>{user.role}</Badge>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
                  <span>{user.activeProjects} projects</span>
                  <span>{userTasks.length} tasks</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
