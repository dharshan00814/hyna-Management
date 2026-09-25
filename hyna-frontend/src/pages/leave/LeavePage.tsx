import { useState } from 'react';
import { Plus, Calendar, Check, X } from 'lucide-react';
import { Button, Avatar, Badge, Modal, Input, Textarea, Select, EmptyState } from '@/components/ui';
import { cn, getStatusColor, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { mockLeaveRequests, getUserById } from '@/mock/data';
import { toast } from 'sonner';

export function LeavePage() {
  const { currentRole, currentUser } = useAuthStore();
  const isAdmin = currentRole !== 'member';
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const requests = isAdmin ? mockLeaveRequests : mockLeaveRequests.filter(r => r.userId === currentUser?.id);
  const filtered = requests.filter(r => filter === 'all' || r.status === filter);

  const handleReview = (id: string, action: 'approve' | 'reject') => {
    toast.success(`Leave request ${action === 'approve' ? 'approved' : 'rejected'}`);
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Leave {isAdmin ? 'Management' : 'Requests'}</h1>
          <p className="page-description">{filtered.length} requests</p>
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors', filter === f ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]')}>
              {f}
            </button>
          ))}
          {!isAdmin && <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Request Leave</Button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No leave requests" description={isAdmin ? 'No leave requests to review.' : 'You haven\'t requested any leave.'} />
      ) : (
        <div className="space-y-3">
          {filtered.map((req, idx) => {
            const user = getUserById(req.userId);
            return (
              <div key={req.id} className={cn('card p-5 animate-slide-up', `stagger-${Math.min(idx + 1, 5)}`)}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={user?.name || ''} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{user?.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {formatDate(req.startDate)} - {formatDate(req.endDate)} • <span className="capitalize">{req.type} Leave</span>
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{req.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={getStatusColor(req.status)}>{req.status}</Badge>
                    {isAdmin && req.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleReview(req.id, 'reject')}><X className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" onClick={() => handleReview(req.id, 'approve')}><Check className="w-3.5 h-3.5" /></Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Request Leave"
        footer={<><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => { setShowCreate(false); toast.success('Leave request submitted!'); }}>Submit Request</Button></>}>
        <div className="space-y-4">
          <Select label="Leave Type" options={[{ value: 'casual', label: 'Casual Leave' }, { value: 'sick', label: 'Sick Leave' }, { value: 'earned', label: 'Earned Leave' }, { value: 'unpaid', label: 'Unpaid Leave' }]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" />
            <Input label="End Date" type="date" />
          </div>
          <Textarea label="Reason" placeholder="Reason for leave..." rows={3} />
        </div>
      </Modal>
    </div>
  );
}
