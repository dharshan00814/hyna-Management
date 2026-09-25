import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Mail, Phone } from 'lucide-react';
import { Button, Avatar, EmptyState, LoadingState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getUsers, getTasks } from '@/services/api';
import type { User, Task } from '@/types';

export function MembersPage() {
  const navigate = useNavigate();
  const { currentRole } = useAuthStore();
  const prefix = currentRole === 'member' ? '/member' : '/admin';
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [u, t] = await Promise.all([getUsers(), getTasks()]);
        if (isMounted) {
          setUsers(u);
          setTasks(t);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.designation.toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter === 'all' || u.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-description">{users.length} team members</p>
        </div>
        {currentRole !== 'member' && <Button><Plus className="w-4 h-4 mr-1" /> Add Member</Button>}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search members..."
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
        <EmptyState title="No members found" description="Try adjusting your search." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((user, idx) => {
            const userTasks = tasks.filter(t => t.assigneeId === user.id);
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
                <p className="text-xs text-[var(--color-primary)] font-medium mt-1">{user.department}</p>

                <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                  <span>{userTasks.length} tasks</span>
                  <div className="flex items-center gap-2">
                    {user.email && <Mail className="w-3.5 h-3.5 hover:text-[var(--color-foreground)]" />}
                    {user.phone && <Phone className="w-3.5 h-3.5 hover:text-[var(--color-foreground)]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
