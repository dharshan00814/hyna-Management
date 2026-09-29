import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Video, Users } from 'lucide-react';
import { Button, Avatar, Badge, Modal, Input, Textarea, Select, EmptyState, LoadingState } from '@/components/ui';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getMeetings, createMeeting, getUsers, getUserById, createNotification } from '@/services/api';
import { toast } from 'sonner';
import type { Meeting, MeetingType, User } from '@/types';

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const value = `${hh}:${mm}`;
      const isPM = h >= 12;
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayH}:${mm} ${isPM ? 'PM' : 'AM'}`;
      options.push({ value, label });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

export function MeetingsPage() {
  const navigate = useNavigate();
  const { currentRole, currentUser, effectiveRole } = useAuthStore();
  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'team' as MeetingType,
    startTime: '10:00',
    endTime: '11:00',
    meetingLink: '',
    participantIds: [] as string[],
  });

  const loadData = async () => {
    try {
      const usrs = await getUsers();
      setUsers(usrs);
      const ms = await getMeetings();
      setMeetings(ms);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMeeting = async () => {
    if (!newMeeting.title.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }
    try {
      const allParticipants = Array.from(new Set([...newMeeting.participantIds, currentUser?.id || 'u1']));
      const created = await createMeeting({
        ...newMeeting,
        hostId: currentUser?.id || 'u1',
        participantIds: allParticipants,
      });

      // Create notifications for invited members
      for (const pId of newMeeting.participantIds) {
        if (pId !== currentUser?.id) {
          await createNotification({
            userId: pId,
            title: 'New Meeting Invitation',
            message: `You have been invited to ${newMeeting.title} at ${newMeeting.startTime}`,
            actionUrl: `${prefix}/meetings`,
            type: 'calendar'
          });
        }
      }

      setMeetings(prev => [...prev, created]);
      setShowCreate(false);
      setNewMeeting({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        type: 'team',
        startTime: '10:00',
        endTime: '11:00',
        meetingLink: '',
        participantIds: [],
      });
      toast.success('Meeting created!');
    } catch (err) {
      toast.error('Failed to create meeting');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const userMeetings = currentRole === 'member'
    ? meetings.filter(m => m.participantIds.includes(currentUser?.id || ''))
    : meetings;

  const filtered = userMeetings.filter(m => {
    if (filter === 'upcoming') return m.date >= todayStr;
    if (filter === 'past') return m.date < todayStr;
    return true;
  }).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-description">{filtered.length} meetings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-muted)]">
            {(['upcoming', 'past', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors', filter === f ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}
              >
                {f}
              </button>
            ))}
          </div>
          {currentRole !== 'member' && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Meeting
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No meetings" description="No meetings to display." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((meeting, idx) => {
            const host = getUserById(meeting.hostId);
            const isToday = meeting.date === todayStr;
            return (
              <div
                key={meeting.id}
                className={cn('card p-5 card-hover cursor-pointer animate-slide-up', `stagger-${Math.min(idx + 1, 5)}`)}
                onClick={() => navigate(`${prefix}/meetings/${meeting.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold">{meeting.title}</h3>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 capitalize">{meeting.type} meeting</p>
                  </div>
                  <Badge className={isToday ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-[var(--color-muted)] text-[var(--color-foreground)]'}>
                    {isToday ? 'Today' : formatDate(meeting.date)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] mb-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] mb-3">
                  <Users className="w-3.5 h-3.5" />
                  <span>{meeting.participantIds.length} participants</span>
                  {meeting.isRecurring && <Badge className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">Recurring</Badge>}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    {host && <Avatar name={host.name} size="xs" />}
                    <span className="text-xs text-[var(--color-muted-foreground)]">{host?.name || 'Host'}</span>
                  </div>
                  {meeting.meetingLink && (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); window.open(meeting.meetingLink, '_blank'); }}>
                      <Video className="w-3.5 h-3.5 mr-1" /> Join
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Meeting"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateMeeting}>Create Meeting</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Meeting Title"
            placeholder="e.g., Weekly Team Meeting"
            value={newMeeting.title}
            onChange={(e) => setNewMeeting(m => ({ ...m, title: e.target.value }))}
          />
          <Textarea
            label="Description"
            placeholder="Meeting agenda..."
            rows={3}
            value={newMeeting.description}
            onChange={(e) => setNewMeeting(m => ({ ...m, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={newMeeting.date}
              onChange={(e) => setNewMeeting(m => ({ ...m, date: e.target.value }))}
            />
            <Select
              label="Type"
              value={newMeeting.type}
              onChange={(val) => setNewMeeting(m => ({ ...m, type: val as MeetingType }))}
              options={[
                { value: 'team', label: 'Team' },
                { value: 'standup', label: 'Standup' },
                { value: 'review', label: 'Review' },
                { value: 'planning', label: 'Planning' },
                { value: 'one-on-one', label: '1:1' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Start Time"
              value={newMeeting.startTime}
              options={TIME_OPTIONS}
              onChange={(val) => {
                const [hours, minutes] = val.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes + 30);
                const endH = date.getHours().toString().padStart(2, '0');
                const endM = date.getMinutes().toString().padStart(2, '0');
                const endVal = `${endH}:${endM}`;
                setNewMeeting(m => ({ ...m, startTime: val, endTime: endVal }));
              }}
            />
            <Select
              label="End Time"
              value={newMeeting.endTime}
              options={TIME_OPTIONS}
              onChange={(val) => setNewMeeting(m => ({ ...m, endTime: val }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Participants</label>
            <div className="flex flex-wrap gap-2 p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] max-h-40 overflow-y-auto">
              {users.filter(u => u.id !== currentUser?.id).map((user) => {
                const isSelected = newMeeting.participantIds.includes(user.id);
                return (
                  <label key={user.id} className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors",
                    isSelected ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]" : "border-[var(--color-border)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)]"
                  )}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isSelected}
                      onChange={() => {
                        setNewMeeting(m => ({
                          ...m,
                          participantIds: isSelected 
                            ? m.participantIds.filter(id => id !== user.id)
                            : [...m.participantIds, user.id]
                        }));
                      }}
                    />
                    <Avatar name={user.name} src={user.avatar} size="xs" />
                    <span>{user.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <Input
            label="Meeting Link"
            placeholder="https://meet.hynastudio.com/..."
            value={newMeeting.meetingLink}
            onChange={(e) => setNewMeeting(m => ({ ...m, meetingLink: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
